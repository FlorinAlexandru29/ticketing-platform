'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AvatarPicker from './AvatarPicker';
import EditableName from './NameField';
import BirthDateField from './BirthDateField';
import CountryCitySection from './CountryCitySection';
import SpotifySection from './SpotifySection';
import PasswordModal from './PasswordModal';
import DeleteAccountModal from './DeleteAccountModal';

type SpotifyInfo = {
  display_name?: string | null;
  external_urls?: { spotify?: string };
  country?: string;
  product?: string;
  images?: { url: string }[];
} | null;

type Props = {
  session: {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      birthdate?: string | null;
      hasCredentials?: boolean;
      countryCode?: string | null;
      country?: string | null;
      city?: string | null;
      oauthProviders?: string[];
    };
  };
  spotify: SpotifyInfo;
};

function pickAvatar(session: Props['session'], spotify: SpotifyInfo) {
  return session?.user?.image || spotify?.images?.[0]?.url || null;
}

export default function ProfilePage({ session, spotify }: Props) {
  const router = useRouter();

  // Client-side guard in case the user was deleted after SSR
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/auth/session', { cache: 'no-store' });
        const j = await r.json();
        if (alive && !j?.user) {
          router.replace('/');
        }
      } catch {
        // network hiccup: do nothing
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  const displayName = session?.user?.name || spotify?.display_name || 'Unnamed User';
  const birthdate   = session?.user?.birthdate ?? null;
  const email       = session?.user?.email ?? null;

  const canEdit      = session?.user?.hasCredentials === true;
  const canEditBirth = canEdit || !birthdate;

  const hasSpotify = Array.isArray(session?.user?.oauthProviders)
    && session.user.oauthProviders.includes('spotify');

  const unlinkAllowed = (session?.user?.hasCredentials === true)
    || ((session?.user?.oauthProviders?.length ?? 0) > 1);

  const initialAvatar = useMemo(() => pickAvatar(session, spotify), [session, spotify]);

  return (
    <section className="h-full card shadow-sm text-[calc(var(--font-sz)*0.9)] overflow-y-auto overflow-x-hidden">
      <div className="card-body p-0">
        <h2 className="card-title self-center whitespace-nowrap text-[var(--heading-sz)]">Your profile</h2>

        <div className="flex flex-col items-center gap-2 md:gap-6">
          {/* Header row: avatar + name + email */}
          <div className="flex w-full items-center justify-center">
            <AvatarPicker initialAvatar={initialAvatar} onUpdated={() => router.refresh()} />

            <div className="flex flex-col justify-center w-full md:w-1/2">
              <EditableName initialName={displayName} canEdit={canEdit} onUpdated={() => router.refresh()} />

              {email && (
                <div className="w-full flex flex-col items-start pl-3 sm:pl-4 gap-2">
                  <div className="opacity-60">Email</div>
                  <div className="pl-2 truncate">{email}</div>
                </div>
              )}
            </div>
          </div>

          {/* Birth date */}
          <BirthDateField initialBirth={birthdate} canEditBirth={canEditBirth} onUpdated={() => router.refresh()} />

          {/* Country + City */}
          <CountryCitySection
            initialCountryCode={session?.user?.countryCode ?? ''}
            initialCountryName={session?.user?.country ?? ''}
            initialCity={session?.user?.city ?? ''}
            onUpdated={() => router.refresh()}
          />

          {/* Spotify */}
          <SpotifySection hasSpotify={hasSpotify} unlinkAllowed={unlinkAllowed} onUpdated={() => router.refresh()} />

          {/* Modals & destructive actions */}
          <div className="flex w-3/4 mt-4 flex-row sm:flex-col items-center justify-center gap-4">
            <PasswordModal canChangePassword={!!session?.user?.hasCredentials} onUpdated={() => router.refresh()} />
            <DeleteAccountModal />
          </div>
        </div>
      </div>
    </section>
  );
}
