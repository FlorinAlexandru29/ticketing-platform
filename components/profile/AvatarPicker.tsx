'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faUser } from '@fortawesome/free-solid-svg-icons';
import { supabaseClient } from '@/lib/supabase/client';

type Props = {
  initialAvatar: string | null; // session.user.image || spotify image || null
  onUpdated?: () => void;       // e.g., router.refresh
};

export default function AvatarPicker({ initialAvatar, onUpdated }: Props) {
  const [uploading, setUploading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effective = avatarUrl ?? initialAvatar;

  async function requestSignedUrl(ext: string) {
    const res = await fetch('/api/avatar/sign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ext }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to get signed URL');
    return json as { path: string; token: string };
  }

  async function commitAvatar(path: string) {
    const res = await fetch('/api/avatar/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to commit avatar');
    return json as { url: string };
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const { path, token } = await requestSignedUrl(ext);
      const { error } = await supabaseClient.storage
        .from('avatars')
        .uploadToSignedUrl(path, token, file);
      if (error) throw error;

      const { url } = await commitAvatar(path);
      setImgLoading(true);
      setAvatarUrl(url);
      onUpdated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="avatar">
      <div className="relative group w-20 h-20 sm:w-30 sm:h-30 rounded-full border border-primary-content overflow-hidden">
        {effective ? (
          <Image
            src={effective}
            alt="Avatar"
            width={80}
            height={80}
            className="object-cover"
            onLoad={() => setImgLoading(false)}
          />
        ) : (
          <FontAwesomeIcon icon={faUser} style={{ width: '100%', height: '100%' }} />
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`absolute inset-0 grid place-items-center transition text-white bg-black/35 ${
            uploading || imgLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          title="Edit profile picture"
          aria-label="Edit profile picture"
        >
          <span className="btn btn-ghost btn-circle btn-sm">
            {uploading || imgLoading ? <span className="loading loading-spinner" /> : <FontAwesomeIcon icon={faCamera} />}
          </span>
        </button>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
      </div>
    </div>
  );
}
