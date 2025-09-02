// app/api/tickets/[id]/pdf/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
// Standalone build so it doesn't try to read AFM files from disk
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { event: true, tier: true },
  });
  if (!ticket || ticket.ownerId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Create PDF
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Header
  doc.fontSize(22).text(ticket.event.title);
  doc.moveDown(0.5);
  const when = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })
    .format(ticket.event.startAt);
  doc.fontSize(12).text(
    `${ticket.event.venueName}, ${ticket.event.city}${
      ticket.event.country ? ", " + ticket.event.country : ""
    }`
  );
  doc.text(`Date: ${when}`);
  doc.moveDown();

  // Details
  doc.fontSize(14).text(`Ticket Type: ${ticket.tier?.category || "-"}`);
  doc.text(
    `Price Paid: ${(ticket.price / 100).toLocaleString(undefined, {
      style: "currency",
      currency: ticket.currency,
    })}`
  );
  doc.text(`Ticket ID: ${ticket.id}`);
  doc.text(`Code: ${ticket.code}`);
  doc.moveDown();

  // ---- QR code: draw squares from the QR matrix (no images/filesystem) ----
  // @ts-ignore - "create" is available at runtime on the 'qrcode' package
  const qr: any = (QRCode as any).create(ticket.code, { errorCorrectionLevel: "M" });
  const modules: any = qr.modules;        // has .size and .get(x,y)
  const count: number = modules.size;     // number of cells per side

  // Size & position
  const cell = 4;                         // points per cell (increase to make the QR bigger)
  const size = count * cell;
  const x0 = 48;                          // left margin
  const y0 = doc.y;                       // current flow position

  doc.save();
  // Build the path with all black cells, then fill once (more efficient)
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (modules.get(r, c)) {
        doc.rect(x0 + c * cell, y0 + r * cell, cell, cell);
      }
    }
  }
  doc.fill("#000");
  doc.restore();

  // Move cursor below the QR block
  doc.y = y0 + size + 16;

  doc.fontSize(10).fillColor("gray").text(
    "Present this QR or Code at entry. If scanning fails, staff can type the code manually.",
    { width: 400 }
  );

  doc.end();
  const buf = await done;

  // Stream back as a proper BodyInit
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(buf));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ticket-${ticket.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
