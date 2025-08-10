// components/my-profile/ProfileCard.tsx
import Image from "next/image";

type Props = {
  session: any;
  spotify: {
    display_name?: string | null;
    external_urls?: { spotify?: string };
    country?: string;
    product?: string;
    images?: { url: string }[];
  } | null;
};

function pickAvatar(session: any, spotify: Props["spotify"]) {
  return (
    spotify?.images?.[0]?.url ||
    session?.user?.image ||
    "/avatar-placeholder.png"
  );
}

export default function ProfileCard({ session, spotify }: Props) {
  const avatar = pickAvatar(session, spotify);

  return (
    <section className="rounded-2xl border shadow-sm p-5">
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden ring-1 ring-black/5">
          {/* If FB/Spotify hosts, ensure next.config images.remotePatterns allow them */}
          <Image src={avatar} alt="Avatar" fill className="object-cover" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            {spotify?.display_name || session.user?.name || "Unnamed User"}
          </h2>
          {session.user?.email && (
            <p className="text-sm opacity-80">{session.user.email}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border p-3">
          <div className="opacity-60">User ID</div>
          <div className="font-mono break-all">{session.user?.id}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="opacity-60">Spotify</div>
          {spotify?.external_urls?.spotify ? (
            <a
              className="underline"
              href={spotify.external_urls.spotify}
              target="_blank"
              rel="noreferrer"
            >
              View Profile
            </a>
          ) : (
            <div className="opacity-70">Linked</div>
          )}
        </div>
        <div className="rounded-xl border p-3">
          <div className="opacity-60">Plan</div>
          <div>{spotify?.product ?? "—"}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="opacity-60">Country</div>
          <div>{spotify?.country ?? "—"}</div>
        </div>
      </div>
    </section>
  );
}
