'use client';

import { useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { supabaseClient } from '@/lib/supabase/client';
import {
  faCamera,
  faLink,
  faCheck,
  faUser,
  faPencil,
  faLinkSlash,
} from '@fortawesome/free-solid-svg-icons';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';


type Props = {
  session: any; // session.user: { id, name, email, image, birthdate?, hasCredentials?, countryCode?, country?, city?, oauthProviders?: string[] }
  spotify: {
    display_name?: string | null;
    external_urls?: { spotify?: string };
    country?: string;
    product?: string;
    images?: { url: string }[];
  } | null;
};



function pickAvatar(session: any, spotify: Props['spotify']) {
  return session?.user?.image || spotify?.images?.[0]?.url || 'placeholder';
}

type CountryOption = { code: string; name: string };
const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY as string | undefined;

export default function ProfileCard({ session, spotify }: Props) {
  
  const router = useRouter();

  const avatar = pickAvatar(session, spotify);
  const displayName = session?.user?.name || spotify?.display_name || 'Unnamed User';
  const birthdateFromSession: string | null = session?.user?.birthdate ?? null;
  const email = session?.user?.email ?? null;
  const userId = session?.user?.id ?? null;

  const canEdit = session?.user?.hasCredentials === true;
  const canEditBirth = canEdit || !birthdateFromSession;

  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState<string>(displayName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Birthdate
  const [editingBirth, setEditingBirth] = useState(false);
  const [birthValue, setBirthValue] = useState<string>(birthdateFromSession ?? '');
  const [savingBirth, setSavingBirth] = useState(false);
  const [birthError, setBirthError] = useState<string | null>(null);

  // Country
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [editingCountry, setEditingCountry] = useState(false);
  const [countryCode, setCountryCode] = useState<string>(session?.user?.countryCode ?? '');
  const [countryName, setCountryName] = useState<string>(session?.user?.country ?? '');
  const [savingCountry, setSavingCountry] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);

  // City (typeahead)
  const [editingCity, setEditingCity] = useState(false);
  const [cityValue, setCityValue] = useState<string>(session?.user?.city ?? '');
  const [cityQuery, setCityQuery] = useState<string>(session?.user?.city ?? '');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityAbortRef = useRef<AbortController | null>(null);
  const cityDebounceRef = useRef<any>(null);

  // 🔒 Change password modal state (credentials-only)
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const canChangePassword = session?.user?.hasCredentials === true;

  // 🔗 Unlink Spotify modal
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  // 🗑️ Delete account modal
  const [delOpen, setDelOpen] = useState(false);
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const [delConfirm, setDelConfirm] = useState('');

  async function onConfirmChangePassword() {
    setPwdError(null);

    const oldP = (pwdOld || '').trim();
    const newP = (pwdNew || '').trim();

    if (!oldP || !newP) {
      setPwdError('Please fill both fields.');
      return;
    }
    if (newP.length < 8) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    if (oldP === newP) {
      setPwdError('New password must be different from the old one.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldP, newPassword: newP }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      // success -> close, clear fields
      setPwdOpen(false);
      setPwdOld('');
      setPwdNew('');
      router.refresh();
    } catch (e: any) {
      setPwdError(e?.message ?? 'Failed to change password.');
    } finally {
      setPwdLoading(false);
    }
  }

  // Spotify link state
  const hasSpotify =
    Array.isArray(session?.user?.oauthProviders) &&
    session.user.oauthProviders.includes('spotify');

  const [spLoading, setSpLoading] = useState(false);
  const [spErr, setSpErr] = useState<string | null>(null);
  const [spProfileUrl, setSpProfileUrl] = useState<string | null>(
    spotify?.external_urls?.spotify ?? null
  );

  const effectiveAvatar = avatarUrl ?? (avatar !== 'placeholder' ? avatar : null);
  

  // Countries list
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
        if (!res.ok) throw new Error('Failed to load countries');
        const raw = (await res.json()) as Array<{ name: { common: string }; cca2: string }>;
        const opts = raw
          .map((r) => ({ code: r.cca2, name: r.name?.common ?? r.cca2 }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(opts);
      } catch {
        setCountries([]);
      }
    })();
  }, []);

  // If linked to Spotify but no profile URL provided by parent, fetch it
  useEffect(() => {
    if (!hasSpotify || spProfileUrl) return;
    (async () => {
      try {
        setSpLoading(true);
        setSpErr(null);
        const r = await fetch('/api/spotify/me', { cache: 'no-store' });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || `HTTP ${r.status}`);
        }
        const j = await r.json();
        setSpProfileUrl(j?.external_url ?? null);
      } catch (e: any) {
        setSpErr(e?.message ?? 'Failed to load Spotify profile');
      } finally {
        setSpLoading(false);
      }
    })();
  }, [hasSpotify, spProfileUrl]);

  async function copyId() {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(String(userId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  // Avatar upload
  async function requestSignedUrl(ext: string) {
    const res = await fetch('/api/avatar/sign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ext }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to get signed URL');
    return json as { path: string; token: string };
  }

  async function commitAvatar(path: string) {
    const res = await fetch('/api/avatar/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to commit avatar');
    return json as { url: string };
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const { path, token } = await requestSignedUrl(ext);
      const { error: upErr } = await supabaseClient.storage.from('avatars').uploadToSignedUrl(path, token, file);
      if (upErr) throw upErr;

      const { url } = await commitAvatar(path);
      setImgLoading(true);
      setAvatarUrl(url);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  // Profile update helper
  async function updateProfileField(payload: {
    name?: string;
    birthdate?: string | null;
    countryCode?: string | null;
    country?: string | null;
    city?: string | null;
  }) {
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Update failed');
    return json as {
      ok: true;
      user: {
        name: string | null;
        birthdate: string | null;
        countryCode: string | null;
        country: string | null;
        city: string | null;
      };
    };
  }

  // Save handlers
  async function onSaveName() {
    setNameError(null);
    const next = (nameValue ?? '').trim();
    if (next.length === 0) {
      setNameError('Name cannot be empty.');
      return;
    }
    setSavingName(true);
    try {
      const result = await updateProfileField({ name: next });
      setNameValue(result.user.name ?? '');
      setEditingName(false);
      router.refresh();
    } catch (e: any) {
      setNameError(e?.message ?? 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  }

  async function onSaveBirth() {
    setBirthError(null);
    const v = birthValue;
    if (v !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      setBirthError('Use YYYY-MM-DD.');
      return;
    }
    setSavingBirth(true);
    try {
      const result = await updateProfileField({ birthdate: v === '' ? null : v });
      setBirthValue(result.user.birthdate ?? '');
      setEditingBirth(false);
      router.refresh();
    } catch (e: any) {
      setBirthError(e?.message ?? 'Failed to update birth date.');
    } finally {
      setSavingBirth(false);
    }
  }

  async function onSaveCountry() {
    setCountryError(null);
    const selected = countries.find((c) => c.code === countryCode);
    const code = (countryCode || '').toUpperCase();
    const name = selected?.name || countryName || '';
    setSavingCountry(true);
    try {
      const result = await updateProfileField({
        countryCode: code || null,
        country: name || null,
      });
      setCountryCode(result.user.countryCode ?? '');
      setCountryName(result.user.country ?? '');
      setEditingCountry(false);

      // Reset city when country changes
      setCityValue('');
      setCityQuery('');
      setCitySuggestions([]);
      setEditingCity(true);

      router.refresh();
    } catch (e: any) {
      setCountryError(e?.message ?? 'Failed to update country.');
    } finally {
      setSavingCountry(false);
    }
  }

  async function onSaveCity() {
    setCityError(null);
    if (!countryCode) {
      setCityError('Please select a country first.');
      return;
    }
    const trimmed = (cityQuery ?? '').trim();
    if (!trimmed) {
      setCityError('City cannot be empty.');
      return;
    }
    setCitySearchLoading(true);
    try {
      const result = await updateProfileField({ city: trimmed });
      setCityValue(result.user.city ?? trimmed);
      setEditingCity(false);
      setShowCityDropdown(false);
      router.refresh();
    } catch (e: any) {
      setCityError(e?.message ?? 'Failed to update city.');
    } finally {
      setCitySearchLoading(false);
    }
  }

  // City typeahead
  useEffect(() => {
    if (!editingCity || !countryCode || (cityQuery || '').trim().length < 2) {
      setCitySuggestions([]);
      setShowCityDropdown(false);
      if ((cityQuery || '').trim().length < 2) setCityError(null);
      return;
    }

    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    cityDebounceRef.current = setTimeout(async () => {
      cityAbortRef.current?.abort();
      const controller = new AbortController();
      cityAbortRef.current = controller;

      setCitySearchLoading(true);
      setCityError(null);
      try {
        const params = new URLSearchParams({
          countryIds: countryCode,
          namePrefix: cityQuery.trim(),
          types: 'CITY',
          sort: '-population',
          minPopulation: '1000',
          limit: '10',
        });
        const resp = await fetch(`https://wft-geo-db.p.rapidapi.com/v1/geo/cities?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY || '',
            'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
          },
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${text.slice(0, 160)}`);
        }
        const json = await resp.json();
        const names = ((json?.data as any[]) || []).map((c) => c?.name).filter(Boolean);
        const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
        setCitySuggestions(unique);
        setShowCityDropdown(true);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setCitySuggestions([]);
        setShowCityDropdown(false);
        setCityError(e?.message || 'Failed to search cities');
      } finally {
        setCitySearchLoading(false);
      }
    }, 1000);

    return () => {
      if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
      cityAbortRef.current?.abort();
    };
  }, [editingCity, countryCode, cityQuery]);

  // Close dropdown on outside click
  const cityContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showCityDropdown) return;
      if (cityContainerRef.current && !cityContainerRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showCityDropdown]);

  // Unlink Spotify
  const unlinkAllowed =
    (session?.user?.hasCredentials === true) ||
    ((session?.user?.oauthProviders?.length ?? 0) > 1);

  async function onUnlinkSpotify() {
    if (!hasSpotify) return;
    if (!unlinkAllowed) {
      alert("You can't unlink: Spotify is your only login method.");
      return;
    }
    const ok = confirm("Unlink Spotify from your account?");
    if (!ok) return;

    try {
      const r = await fetch('/api/link/spotify/unlink', { method: 'POST' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      // Clear local profile URL and refresh session-backed UI
      setSpProfileUrl(null);
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to unlink Spotify');
    }
  }



  return (
    <section className="h-full card shadow-sm text-[calc(var(--font-sz)*0.9)] overflow-y-auto overflow-x-hidden">
      <div className="card-body p-0">
        <h2 className="card-title self-center whitespace-nowrap text-[var(--heading-sz)]">
          Your profile
        </h2>

        {/* Header row */}
        <div className="flex flex-col items-center gap-2 md:gap-6">
          <div className='flex flex-row w-full items-center justify-center'>
            <div className="avatar">
              <div className="relative group w-20 h-20 sm:w-30 sm:h-30 rounded-full border-primary-content border-[1px] overflow-hidden">
                {effectiveAvatar ? (
                  <Image
                    src={effectiveAvatar}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="object-cover"
                    onLoadingComplete={() => setImgLoading(false)}
                  />
                ) : (
                  <FontAwesomeIcon icon={faUser} style={{ width: '100%', height: '100%' }} className="bg-primary-content" />
                )}

                <button
                  type="button"
                  onClick={openPicker}
                  disabled={uploading}
                  className={[
                    'absolute inset-0 grid place-items-center transition text-white',
                    'bg-black/35',
                    (uploading || imgLoading) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  ].join(' ')}
                  title="Edit profile picture"
                  aria-label="Edit profile picture"
                >
                  <span className="btn btn-ghost btn-circle btn-sm">
                    {(uploading || imgLoading) ? <span className="loading loading-spinner" /> : <FontAwesomeIcon icon={faCamera} />}
                  </span>
                </button>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              </div>
            </div>
            <div className="flex flex-col justify-center w-full md:w-1/2">
              {/* Name */}
              <div className="justify-center items-center pl-3 sm:pl-4 flex flex-col">
                <span className="opacity-80 min-w-[4.5rem] self-start pl-1">Name</span>
                <label className="flex justify-between items-center w-full border-none shadow-none p-2 validator h-[var(--ctrl-h)] text-[var(--font-sz)]">
                  <input
                    type="text"
                    className="border-none shadow-none w-full focus-within:shadow-none focus-within:outline-none"
                    placeholder="Your name"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    disabled={!canEdit || !editingName}
                    autoComplete="name"
                    aria-invalid={!!nameError}
                  />
                  <div className="tooltip join-item" data-tip={canEdit ? (editingName ? 'Save' : 'Edit') : 'Editable only for email/password accounts'}>
                    <button
                      type="button"
                      onClick={() => (editingName ? onSaveName() : setEditingName(true))}
                      disabled={!canEdit || savingName}
                      className="btn btn-success btn-circle btn-sm"
                      aria-label={editingName ? 'Save name' : 'Edit name'}
                    >
                      {editingName ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faPencil} />}
                    </button>
                  </div>
                </label>
              </div>
              {nameError && <div className="px-4 -mt-2 text-error text-sm w-3/4">{nameError}</div>}

              {email && (
                <div className="w-full flex flex-col items-start pl-3 sm:pl-4 gap-2">
                  <div className="opacity-60">Email</div>
                  <div className="pl-2 truncate">{email}</div>
                </div>
              )}
            </div>
          </div>

          
              {/* Birth */}
    <div className="w-3/4 justify-center items-start flex flex-col">
      <div className="w-1/2">
        <span className="opacity-80 min-w-[4.5rem] self-start pl-1">Birth Date</span>
        <label className="flex justify-between items-center w-full border-none shadow-none p-2 validator h-[var(--ctrl-h)] text-[var(--font-sz)]">
          <input
            type="date"
            className="border-none shadow-none w-full focus-within:shadow-none focus-within:outline-none"
            placeholder="YYYY-MM-DD"
            value={birthValue}
            onChange={(e) => setBirthValue(e.target.value)}
            disabled={!canEditBirth || !editingBirth}
            max={new Date().toISOString().slice(0, 10)}
            autoComplete="bday"
            aria-invalid={!!birthError}
          />
          <div className="tooltip join-item" data-tip={canEditBirth ? (editingBirth ? 'Save' : 'Edit') : 'Read-only'}>
            <button
              type="button"
              onClick={() => (editingBirth ? onSaveBirth() : setEditingBirth(true))}
              disabled={!canEditBirth || savingBirth}
              className="btn btn-success btn-circle btn-sm"
              aria-label={editingBirth ? 'Save birth date' : 'Edit birth date'}
            >
              {editingBirth ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faPencil} />}
            </button>
          </div>
        </label>
      </div>
    </div>
    {birthError && <div className="px-4 -mt-2 text-error text-sm w-3/4">{birthError}</div>}

    {/* Country + City */}
    <div className="flex flex-col sm:flex-row w-3/4 items-center">
      {/* Country */}
      <div className="w-full justify-center items-center flex flex-col">
        <span className="opacity-80 min-w-[4.5rem] self-start pl-1">Country</span>
        <label className="flex bg-base-100 justify-between items-center w-full border-none shadow-none p-2 pl-0 validator h-[var(--ctrl-h)] text-[var(--font-sz)]">
          <select
            className="disabled:bg-base-100 focus-visible:outline-none focus-visible:shadow-none select pl-2! w-full border-none shadow-none focus:outline-none"
            value={countryCode}
            onChange={(e) => {
              const code = e.target.value;
              setCountryCode(code);
              const hit = countries.find(c => c.code === code);
              setCountryName(hit?.name || '');
            }}
            disabled={!editingCountry}
            aria-invalid={!!countryError}
          >
            <option value="">— Select country —</option>
            {countries.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <div className="tooltip join-item" data-tip={editingCountry ? 'Save' : 'Edit'}>
            <button
              type="button"
              onClick={() => (editingCountry ? onSaveCountry() : setEditingCountry(true))}
              disabled={savingCountry}
              className="btn btn-success btn-circle btn-sm"
              aria-label={editingCountry ? 'Save country' : 'Edit country'}
            >
              {editingCountry ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faPencil} />}
            </button>
          </div>
        </label>
      </div>
      {countryError && <div className="px-4 -mt-2 text-error text-sm w-3/4">{countryError}</div>}

      {/* City */}
      <div className="w-full justify-center items-center flex flex-col">
        <span className="opacity-80 min-w-[4.5rem] self-start pl-1">City</span>
        <div ref={cityContainerRef} className={`dropdown dropdown-top w-full ${editingCity && showCityDropdown ? 'dropdown-open' : ''}`}>
          <label className="flex justify-between items-center w-full border-none shadow-none p-2 pl-0 h-[var(--ctrl-h)] text-[var(--font-sz)]">
            <input
              type="text"
              tabIndex={0}
              className="pl-2 pr-4 border-none shadow-none w-full focus-within:shadow-none focus-within:outline-none"
              placeholder={countryCode ? 'Start typing a city (min 2 chars)' : 'Select a country first'}
              value={editingCity ? cityQuery : cityValue}
              onChange={(e) => setCityQuery(e.target.value)}
              onFocus={() => {
                if (editingCity && citySuggestions.length > 0) setShowCityDropdown(true);
              }}
              disabled={!editingCity || !countryCode}
              autoComplete="address-level2"
              aria-invalid={!!cityError}
            />
            <div className="tooltip join-item" data-tip={editingCity ? 'Save' : 'Edit'}>
              <button
                type="button"
                onClick={async () => {
                  if (!editingCity) {
                    setEditingCity(true);
                    setCityQuery(cityValue || '');
                  } else {
                    await onSaveCity();
                  }
                }}
                disabled={!countryCode || citySearchLoading}
                className="btn btn-success btn-circle btn-sm"
                aria-label={editingCity ? 'Save city' : 'Edit city'}
              >
                {editingCity ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faPencil} />}
              </button>
            </div>
          </label>

          {editingCity && showCityDropdown && (
            <ul className="dropdown-content menu menu-sm p-2 shadow bg-base-100 rounded-box w-full max-h-64 overflow-auto z-20 mb-1">
              {citySearchLoading && (
                <li className="disabled">
                  <a><span className="loading loading-spinner mr-2" />Searching…</a>
                </li>
              )}
              {!citySearchLoading && citySuggestions.length === 0 && (
                <li className="disabled"><a>No results</a></li>
              )}
              {!citySearchLoading && citySuggestions.map((name) => (
                <li key={name}>
                  <a
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setCityQuery(name);
                      setCityValue(name);
                      setShowCityDropdown(false);
                    }}
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {cityError && <div className="px-4 -mt-2 text-error text-sm w-3/4">{cityError}</div>}
    </div>
            

          {/* Spotify section */}
          <div className="w-3/4 flex flex-col">
            <div className={`flex items-center ${!hasSpotify ? 'justify-center' : 'gap-6 justify-between sm:justify-center'}`}>
              {!hasSpotify ? (
                <button
                  type="button"
                  className="btn btn-success btn-wide"
                  onClick={() => { window.location.href = "/api/link/spotify/start"; }}
                >
                  <FontAwesomeIcon className="mr-2" icon={faLink} />
                  Link Spotify
                  <FontAwesomeIcon icon={faSpotify} />
                </button>
              ) : (
                <>
                  <a
                    href={spProfileUrl ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-success"
                    aria-disabled={!spProfileUrl}
                    onClick={(e) => { if (!spProfileUrl) e.preventDefault(); }}
                  >
                    {spLoading ? (
                      <span className="loading loading-spinner" />
                    ) : (
                      <>
                        
                        Open Spotify Profile
                        <FontAwesomeIcon icon={faSpotify} />
                      </>
                    )}
                  </a>
                  {/* Unlink button (opens modal) */}
                  {unlinkAllowed && (
                    <>
                    <div className="tooltip join-item" data-tip="Unlink Spotify">
                    <button
                      type="button"
                      className="btn btn-error btn-outline btn-circle"
                      onClick={() => setUnlinkOpen(true)}
                    >
                      <FontAwesomeIcon icon={faLinkSlash} />
                    </button>
                  </div>
                    </>)}
                    
                  
                  {/* 🔗 Unlink Spotify modal */}
<div className={`modal ${unlinkOpen ? 'modal-open' : ''}`}>
  <div className="modal-box">
    <h3 className="font-bold text-lg">Unlink Spotify</h3>
    <p className="mt-2">
      This will disconnect Spotify from your account. You’ll still be able to sign in with your other methods.
    </p>

    {unlinkError && <p className="text-error text-sm mt-3">{unlinkError}</p>}

    <div className="modal-action">
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => !unlinkLoading && setUnlinkOpen(false)}
      >
        Cancel
      </button>
      <button
        type="button"
        className={`btn btn-error ${(!unlinkAllowed || unlinkLoading) ? 'btn-disabled' : ''}`}
        disabled={!unlinkAllowed || unlinkLoading}
        onClick={async () => {
          setUnlinkError(null);
          setUnlinkLoading(true);
          try {
            const r = await fetch('/api/link/spotify/unlink', { method: 'POST' });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            setSpProfileUrl(null);
            setUnlinkOpen(false);
            router.refresh();
          } catch (e: any) {
            setUnlinkError(e?.message ?? 'Failed to unlink Spotify');
          } finally {
            setUnlinkLoading(false);
          }
        }}
      >
        {unlinkLoading ? <span className="loading loading-spinner" /> : 'Unlink'}
      </button>
    </div>
  </div>

  <div
    className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm"
    onClick={() => !unlinkLoading && setUnlinkOpen(false)}
  />
</div>
                </>
              )}
            </div>
          </div>
<div className='flex w-3/4 mt-4 flex-row sm:flex-col items-center justify-center gap-4'>
          {/* ▶️ Show the button only for credentials users */}
        {canChangePassword && (
          <div className="w-full flex justify-center">
            <button
              type="button"
              className="btn btn-error btn-wide"
              onClick={() => setPwdOpen(true)}
            >
              Change Your Password
            </button>
          </div>
        )}

        {/* 🔐 Password modal */}
        
        <div className={`modal ${pwdOpen ? 'modal-open' : ''}`}>
          <div className="modal-box">
            <h3 className="font-bold text-lg">Change your password</h3>

            <div className="form-control flex flex-col gap-2 mt-4">
              <span className="opacity-70 whitespace-nowrap">Old Password</span>
              <label className="input input-bordered flex items-center">
                
                <input
                  type="password"
                  className="grow"
                  value={pwdOld}
                  onChange={(e) => setPwdOld(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <span className="opacity-70 whitespace-nowrap">New Password</span>
              <label className="input input-bordered flex items-center">
                
                <input
                  type="password"
                  className="grow"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  autoComplete="new-password"
                />
              </label>

              {pwdError && <p className="text-error text-sm">{pwdError}</p>}
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-outline btn-error"
                onClick={() => {
                  if (!pwdLoading) {
                    setPwdOpen(false);
                    setPwdError(null);
                    setPwdOld('');
                    setPwdNew('');
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-success ${pwdLoading ? 'btn-disabled' : ''}`}
                onClick={onConfirmChangePassword}
                disabled={pwdLoading}
              >
                {pwdLoading ? <span className="loading loading-spinner" /> : 'Confirm'}
              </button>
            </div>
          </div>

          {/* backdrop click closes modal */}
          <div className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200
                    opacity-100 pointer-events-auto" onClick={() => !pwdLoading && setPwdOpen(false)} />
        </div>

        {/* Delete account (visible for any user) */}
        <div className="w-full flex justify-center">
          <button
            type="button"
            className="btn btn-outline btn-error btn-wide "
            onClick={() => setDelOpen(true)}
          >
            Delete Account
          </button>
        </div>
        {/* 🗑️ Delete account modal */}
<div className={`modal ${delOpen ? 'modal-open' : ''}`}>
  <div className="modal-box">
    <h3 className="font-bold text-lg text-error">Delete your account</h3>
    <div className="mt-3 space-y-2">
      <p>This will permanently delete your account, sessions, credentials, and any linked OAuth accounts (Spotify included).</p>
      <p>Tickets you’ve purchased will remain valid and visible to organizers, but they will no longer be associated with your account.</p>
      <p>If you are hosting events, you must transfer or delete them first.</p>
      <p className="mt-2">Type <code className="font-mono">DELETE</code> to confirm.</p>

      <label className="input input-bordered flex items-center mt-1">
        <input
          type="text"
          className="grow"
          value={delConfirm}
          onChange={(e) => setDelConfirm(e.target.value)}
          placeholder="DELETE"
        />
      </label>

      {delError && <p className="text-error text-sm">{delError}</p>}
    </div>

    <div className="modal-action">
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => !delLoading && setDelOpen(false)}
      >
        Cancel
      </button>
      <button
        type="button"
        className={`btn btn-error ${delLoading || delConfirm !== 'DELETE' ? 'btn-disabled' : ''}`}
        disabled={delLoading || delConfirm !== 'DELETE'}
        onClick={async () => {
        setDelError(null);
        setDelLoading(true);
        try {
          const res = await fetch('/api/account/delete', { method: 'DELETE' });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);

          // Clear client-side session + redirect
          await signOut({ redirect: true, callbackUrl: '/' });
        } catch (e: any) {
          setDelError(e?.message ?? 'Failed to delete account');
        } finally {
          setDelLoading(false);
        }
      }}
      >
        {delLoading ? <span className="loading loading-spinner" /> : 'Delete account'}
      </button>
    </div>
  </div>

  <div
    className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm"
    onClick={() => !delLoading && setDelOpen(false)}
  />
</div>
</div>


        </div>

        
        

      </div>
    </section>
  );
}
