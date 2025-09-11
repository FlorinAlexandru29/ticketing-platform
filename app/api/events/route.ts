// app/api/events/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createClient } from "@supabase/supabase-js";
import { sendNewEventEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

const ArtistSchema = z.object({
  spotifyId: z.string().min(1),
  name: z.string().min(1),
  genres: z.array(z.string()).optional().default([]),
  image: z.string().url().optional().nullable(),
  slot: z.string().datetime(), // ISO
});

const VenueSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  country: z.string().optional().default(""),
  countryCode: z.string().length(2).optional().or(z.literal("")).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

const TicketTierSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().positive(),
  currency: z.string().min(1).default("RON"),
  quantity: z.number().int().positive(),
});

const PayloadSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(20),
  eventType: z.enum(["concert", "festival"]),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional().nullable(),
  city: z.string().min(1),
  country: z.string().optional().default(""),
  countryCode: z.string().length(2).optional().or(z.literal("")).optional(),
  venue: VenueSchema,
  artists: z.array(ArtistSchema).min(1),
  ticketTiers: z.array(TicketTierSchema).min(1),
  posterDataUrl: z.string().startsWith("data:").optional(),
});

function normalizeTitle(t: string) {
  return t.trim().toLowerCase().replace(/\s+/g, " ");
}

async function uploadPosterFromDataUrl(dataUrl: string, eventId: string) {
  if (!supabase) return null;
  const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!m) return null;
  const contentType = m[1] ?? "image/png";
  const base64 = m[2];
  const buffer = Buffer.from(base64, "base64");
  const ext = contentType.split("/")[1] || "png";
  const path = `events/${eventId}/poster-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("posters").upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("posters").getPublicUrl(path);
  return data.publicUrl;
}

async function notifyAndEmail(eventId: string) {
  const ev = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      startAt: true,
      venueName: true,
      city: true,
      lineup: { select: { artist: { select: { spotifyId: true, name: true } } } },
    },
  });
  if (!ev) {
    console.warn("[create-event] event not found for notifications", { eventId });
    return;
  }

  const lineupIds = ev.lineup.map(l => l.artist.spotifyId).filter((s): s is string => !!s);
  const topNames = ev.lineup.map(l => l.artist.name).filter(Boolean).slice(0, 3);

  const namesText =
    topNames.length === 1
      ? topNames[0]!
      : topNames.length === 2
      ? `${topNames[0]} & ${topNames[1]}`
      : `${topNames[0]}, ${topNames[1]} & ${topNames[2]}${ev.lineup.length > 3 ? "…" : ""}`;

  const targets = lineupIds.length
    ? await prisma.user.findMany({
        where: { city: ev.city, followedSpotifyIds: { hasSome: lineupIds } },
        select: { id: true, email: true },
      })
    : [];

  console.log("[create-event] notify targets", {
    eventId,
    city: ev.city,
    lineupCount: ev.lineup.length,
    lineupIdsCount: lineupIds.length,
    targetsCount: targets.length,
  });

  if (!targets.length) return;

  const dateText = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(ev.startAt);
  const notifMsg = `${namesText} ${ev.lineup.length > 1 ? "are" : "is"} playing in your city on ${dateText}. Tap to view.`;

  // In-app notifications
  await prisma.notification.createMany({
    data: targets.map(u => ({
      userId: u.id,
      eventId: ev.id,
      message: notifMsg,
    })),
    skipDuplicates: true,
  });

  // Emails
  const base =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const link = `${base}/events/${ev.id}`;

  const emailTargets = targets.filter(t => !!t.email) as { id: string; email: string }[];

  if (emailTargets.length) {
    const results = await Promise.allSettled(
      emailTargets.map(u =>
        sendNewEventEmail({
          to: u.email!,
          title: ev.title,
          dateText,
          venueName: ev.venueName,
          city: ev.city,
          link,
        })
      )
    );

    const failures = results
      .map((r, i) => ({ r, i, email: emailTargets[i].email }))
      .filter((x) => x.r.status === "rejected") as Array<{
      r: PromiseRejectedResult;
      i: number;
      email: string;
    }>;

    if (failures.length) {
      console.error(
        "[create-event] email failures",
        failures.map(f => ({ email: f.email, reason: String(f.r.reason) }))
      );
    } else {
      console.log("[create-event] emails sent", { count: emailTargets.length });
    }
  } else {
    console.log("[create-event] no email-capable targets");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const raw = await req.json();
    const input = PayloadSchema.parse(raw);

    const startAt = new Date(input.startAt);
    const endAt = input.endAt ? new Date(input.endAt) : null;
    if (endAt && endAt < startAt) {
      return NextResponse.json({ error: "End date cannot be before start date." }, { status: 400 });
    }

    const normalized = normalizeTitle(input.title);

    const eventId = await prisma.$transaction(async (tx) => {
      const venue = await tx.venue.upsert({
        where: { placeId: input.venue.placeId },
        update: {
          name: input.venue.name,
          address: input.venue.address,
          city: input.venue.city,
          country: input.venue.country || undefined,
          countryCode: input.venue.countryCode || undefined,
          lat: input.venue.lat ?? undefined,
          lng: input.venue.lng ?? undefined,
        },
        create: {
          placeId: input.venue.placeId,
          name: input.venue.name,
          address: input.venue.address,
          city: input.venue.city,
          country: input.venue.country || undefined,
          countryCode: input.venue.countryCode || undefined,
          lat: input.venue.lat ?? undefined,
          lng: input.venue.lng ?? undefined,
        },
      });

      const event = await tx.event.create({
        data: {
          title: input.title,
          normalized,
          description: input.description,
          startAt,
          endAt: endAt ?? undefined,
          eventType: input.eventType === "concert" ? "CONCERT" : "FESTIVAL",
          venueName: venue.name,
          city: venue.city,
          country: venue.country || undefined,
          countryCode: venue.countryCode || undefined,
          venueId: venue.id,
          hostId: session.user.id,
        },
      });

      const artists = await Promise.all(
        input.artists.map((a) =>
          tx.artist.upsert({
            where: { spotifyId: a.spotifyId },
            update: { name: a.name, genres: a.genres || [], image: a.image ?? undefined },
            create: { spotifyId: a.spotifyId, name: a.name, genres: a.genres || [], image: a.image ?? undefined },
            select: { id: true, spotifyId: true, name: true },
          })
        )
      );

      await tx.eventArtist.createMany({
        data: artists.map((art, idx) => ({
          eventId: event.id,
          artistId: art.id,
          slot: new Date(input.artists[idx].slot),
          order: idx + 1,
        })),
      });

      await tx.ticketTier.createMany({
        data: input.ticketTiers.map((t) => ({
          eventId: event.id,
          category: t.category,
          description: t.description,
          priceCents: t.priceCents,
          currency: t.currency || "RON",
          quantity: t.quantity,
        })),
      });

      if (input.posterDataUrl) {
        const posterUrl = await uploadPosterFromDataUrl(input.posterDataUrl, event.id);
        if (posterUrl) {
          await tx.event.update({ where: { id: event.id }, data: { posterUrl } });
        }
      }

      return event.id;
    });

    // notifications + email inline
    try {
      await notifyAndEmail(eventId);
    } catch (e) {
      console.error("[create-event] notify/email failed", e);
    }

    return NextResponse.json({ id: eventId });
  } catch (err: any) {
    console.error(err);
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    if (String(err?.message || "").includes("Unique constraint failed")) {
      return NextResponse.json({ error: "An event with the same title/date/venue already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get("type");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(24, Math.max(1, Number(searchParams.get("pageSize") || 10)));
  const upcoming = (searchParams.get("upcoming") ?? "true") !== "false";

  const where: any = {};
  if (typeParam) {
    where.eventType = ["CONCERT", "FESTIVAL"].includes(typeParam.toUpperCase())
      ? typeParam.toUpperCase()
      : typeParam.toLowerCase() === "concert"
      ? "CONCERT"
      : "FESTIVAL";
  }
  if (upcoming) where.startAt = { gte: new Date() };

  const [total, items] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { startAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        posterUrl: true,
        startAt: true,
        endAt: true,
        city: true,
        country: true,
        eventType: true,
        venueName: true,
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize,
    total,
    hasNext: page * pageSize < total,
    items,
  });
}
