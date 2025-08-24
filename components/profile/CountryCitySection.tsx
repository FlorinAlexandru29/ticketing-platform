'use client';

import { useEffect, useRef, useState } from 'react';
import { updateProfileField } from './api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faPencil } from '@fortawesome/free-solid-svg-icons';

type CountryOption = { code: string; name: string };

type Props = {
  initialCountryCode: string;
  initialCountryName: string;
  initialCity: string;
  onUpdated?: () => void;
};

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY as string | undefined;

export default function CountryCitySection({
  initialCountryCode,
  initialCountryName,
  initialCity,
  onUpdated,
}: Props) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [editingCountry, setEditingCountry] = useState(false);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [countryName, setCountryName] = useState(initialCountryName);
  const [savingCountry, setSavingCountry] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);

  const [editingCity, setEditingCity] = useState(false);
  const [cityValue, setCityValue] = useState(initialCity);
  const [cityQuery, setCityQuery] = useState(initialCity);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityAbortRef = useRef<AbortController | null>(null);
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityContainerRef = useRef<HTMLDivElement>(null);

  // Countries
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

      // reset city after country change
      setCityValue('');
      setCityQuery('');
      setCitySuggestions([]);
      setEditingCity(true);

      onUpdated?.();
    } catch (e: any) {
      setCountryError(e?.message ?? 'Failed to update country.');
    } finally {
      setSavingCountry(false);
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
        const resp = await fetch(`https://wft-geo-db.p.rapidapi.com/v1/geo/cities?${params}`, {
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

  // outside-click to close dropdown
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

  async function onSaveCity() {
    setCityError(null);
    if (!countryCode) {
      setCityError('Please select a country first.');
      return;
    }
    const trimmed = (cityQuery || '').trim();
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
      onUpdated?.();
    } catch (e: any) {
      setCityError(e?.message ?? 'Failed to update city.');
    } finally {
      setCitySearchLoading(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row w-3/4 items-center">
      {/* Country */}
      <div className="w-full justify-center items-center flex flex-col">
        <span className="opacity-80 min-w-[4.5rem] self-start pl-1">Country</span>
        <label className="flex bg-base-100 justify-between items-center w-full p-2 pl-0 h-[var(--ctrl-h)] text-[var(--font-sz)]">
          <select
            className="disabled:bg-base-100 select pl-2! w-full focus:outline-none"
            value={countryCode}
            onChange={(e) => {
              const code = e.target.value;
              setCountryCode(code);
              const hit = countries.find((c) => c.code === code);
              setCountryName(hit?.name || '');
            }}
            disabled={!editingCountry}
            aria-invalid={!!countryError}
          >
            <option value="">— Select country —</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
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
              <FontAwesomeIcon icon={editingCountry ? faCheck : faPencil} />
            </button>
          </div>
        </label>
      </div>
      {countryError && <div className="px-4 -mt-2 text-error text-sm w-3/4">{countryError}</div>}

      {/* City */}
      <div className="w-full justify-center items-center flex flex-col">
        <span className="opacity-80 min-w-[4.5rem] self-start pl-1">City</span>
        <div
          ref={cityContainerRef}
          className={`dropdown dropdown-top w-full ${editingCity && showCityDropdown ? 'dropdown-open' : ''}`}
        >
          <label className="flex justify-between items-center w-full p-2 pl-0 h-[var(--ctrl-h)] text-[var(--font-sz)]">
            <input
              type="text"
              tabIndex={0}
              className="pl-2 pr-4 w-full focus:outline-none"
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
                <FontAwesomeIcon icon={editingCity ? faCheck : faPencil} />
              </button>
            </div>
          </label>

          {editingCity && showCityDropdown && (
            <ul className="dropdown-content menu menu-sm p-2 shadow bg-base-100 rounded-box w-full max-h-64 overflow-auto z-20 mb-1">
              {citySearchLoading && (
                <li className="disabled">
                  <a>
                    <span className="loading loading-spinner mr-2" />
                    Searching…
                  </a>
                </li>
              )}
              {!citySearchLoading && citySuggestions.length === 0 && (
                <li className="disabled">
                  <a>No results</a>
                </li>
              )}
              {!citySearchLoading &&
                citySuggestions.map((name) => (
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
  );
}
