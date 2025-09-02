'use client';
import { faComment, faHashtag, faMagic, faMinus, faMoneyBill1Wave, faPlus, faRepeat, faSpinner, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import router from "next/router";
import { useEffect, useRef, useState } from 'react';

type CountryOption = { code: string; name: string };
type VenueSuggestion = { placeId: string; name: string; address: string; lat: number | null; lng: number | null; };
type SelectedVenue = { placeId: string; name: string; address: string; lat?: number | null; lng?: number | null; };

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY as string | undefined;

/* ---------- Maps helpers (no API needed) ---------- */
function buildMapsQuery(venue?: string, city?: string, country?: string) {
  const parts = [venue?.trim(), city?.trim(), country?.trim()].filter(Boolean);
  return parts.join(", ");
}
function buildMapsEmbedUrl(venue?: string, city?: string, country?: string) {
  if (!venue || !venue.trim()) return "";
  return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(
    buildMapsQuery(venue, city, country)
  )}`;
}

// at top of file
function toPriceCents(v: string) {
  // expects integer RON or decimal; normalize to cents
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

export default function CreateEventShell() {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');

  type Album = { name: string; release_date: string };
  type Artist = {
    id: string;
    name: string;
    genres: string[];
    image?: string | null;
    time?: string;
    albums?: Album[];
    albumsLoading?: boolean;
  };

  const [editingArtist, setEditingArtist] = useState(false);
  const [artistQuery, setArtistQuery] = useState('');
  const [artistSuggestions, setArtistSuggestions] = useState<Artist[]>([]);
  const [artistSearchLoading, setArtistSearchLoading] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const artistDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [eventDescription, setEventDescription] = useState('');
  const [generatingDescription, setGeneratingDescription] = useState(false);

  // Poster
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterSource, setPosterSource] = useState<'uploaded' | 'generated' | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function openFilePicker() {
    fileInputRef.current?.click();
  }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image is too large (max 10MB).');
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPosterUrl(url);
    setPosterSource('uploaded');
    setPosterFile(file);
  }

  const [eventType, setEventType] = useState('');
  const [eventName, setEventName] = useState('');

  async function generateEventDescription() {
    if (!eventType || !eventName || selectedArtists.length === 0 || eventStartDate === '' || !selectedVenue) {
      alert('Please fill in the event name, type, start date, venue and select at least one artist.');
      return;
    }

    setGeneratingDescription(true);
    try {
      const artistLines = selectedArtists.map((a) => {
        const genres = a.genres?.slice(0, 3).join(', ') || '';
        const albumsStr = (a.albums?.length ? a.albums : [])
          .slice(0, 3)
          .map(al => `"${al.name}" (${(al.release_date || '').slice(0, 4)})`)
          .join(', ') || '—';
        return `- ${a.name}${genres ? ` — ${genres}` : ''}\n  Notable releases: ${albumsStr}`;
      }).join('\n');
      console.log(artistLines)

      const venueForPrompt = `${selectedVenue.name}, ${cityValue || cityQuery || ''}${countryName ? ', ' + countryName : ''}`;

      const artistprompt = `
        Search information about the following bands using the provided information ${artistLines}".
        (Include in the search results from Facebook Page, Instagram Page, Spotify Page, Bandcamp, Metal Archives, Youtube or Wikipedia).
        Required information about the bands:
        - Name
        - Genre
        - Bands Location (City, Country)
        - Notable releases (albums/eps), don't include singles
        an album contains 7-12 songs, an EP contains 3-6 songs.
        - Short description (1-2 sentences)
        - Band members
      `;

      const res = await fetch('/api/gemini/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistprompt }),
      });

      if (!res.ok) throw new Error('Failed to generate description');
      const data = await res.json();

      const desciprtionPrompt = `
        Use the provided information ${data.response}.
        You are an expert event promoter and copywriter.
        Write a ${eventType} music event structured description for an event with the name "${eventName}" happening at ${venueForPrompt} on ${
          eventType === "concert"
            ? eventStartDate.slice(0, -6)
            : eventType === "festival"
              ? `${eventStartDate.slice(0, -6)} to ${eventEndDate.slice(0, -6)}`
              : ""
        }. The description should be engaging and informative. The description about the bands should also contain band members.
        Add a "Generated by Gemini Ai. Information might not be accurate" at the end of the description.
      `;

      const descRes = await fetch('/api/gemini/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desciprtionPrompt }),
      });
      if (!descRes.ok) throw new Error('Failed to generate description');
      const dataDesc = await descRes.json();
      setEventDescription(dataDesc.response || '');
    } catch (e) {
      console.error(e);
      alert('Failed to generate description');
    } finally {
      setGeneratingDescription(false);
    }
  }

  async function fetchArtistAlbums(artistId: string): Promise<Album[]> {
    try {
      const res = await fetch(`/api/spotify/search-albums?q=${artistId}`);
      if (!res.ok) return [];
      const data = await res.json();
      const items: Album[] = (data.items ?? []).map((a: any) => ({
        name: a.name,
        release_date: a.release_date,
      }));
      return items.sort((a, b) =>
        (b.release_date ?? '').localeCompare(a.release_date ?? '')
      );
    } catch {
      return [];
    }
  }

  function handleSelectArtist(artist: Artist) {
    setSelectedArtists(prev => {
      if (prev.some(x => x.id === artist.id)) return prev;
      return [...prev, { ...artist, albums: [], albumsLoading: true }];
    });

    setArtistQuery('');
    setArtistSuggestions([]);

    (async () => {
      const albums = await fetchArtistAlbums(artist.id);
      setSelectedArtists(prev =>
        prev.map(x =>
          x.id === artist.id ? { ...x, albums, albumsLoading: false } : x
        )
      );
    })();
  }

  useEffect(() => {
    if (artistDebounceRef.current) clearTimeout(artistDebounceRef.current);
    if (artistQuery.length < 2) {
      setArtistSuggestions([]);
      setArtistSearchLoading(true);
      setArtistSearchLoading(false);
      return;
    }
    artistDebounceRef.current = setTimeout(async () => {
      setArtistSearchLoading(true);
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(artistQuery)}`);
        const data = await res.json();
        setArtistSuggestions(data.items || []);
      } catch {
        setArtistSuggestions([]);
      } finally {
        setArtistSearchLoading(false);
      }
    }, 400);

    return () => {
      if (artistDebounceRef.current) clearTimeout(artistDebounceRef.current);
    };
  }, [artistQuery]);

  const [mapReady, setMapReady] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);

  const [ticketType, setTicketType] = useState<{ id: number; category: string; description: string; price: string; nrOfTickets: string }[]>([]);
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketCategory, setTicketCategory] = useState('');
  const [nrOfTickets, setNrOfTickets] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');

  // City autocomplete state
  const [editingCity, setEditingCity] = useState(false);
  const [cityValue, setCityValue] = useState('');   // chosen city
  const [cityQuery, setCityQuery] = useState('');   // typing query
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);

  const cityAbortRef = useRef<AbortController | null>(null);
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Venue search state
  const [editingVenue, setEditingVenue] = useState(false);
  const [venueQuery, setVenueQuery] = useState('');
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [venueLoading, setVenueLoading] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);
  const venueAbortRef = useRef<AbortController | null>(null);
  const venueDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The selected venue to SAVE with the event
  const [selectedVenue, setSelectedVenue] = useState<SelectedVenue | null>(null);

  // Legacy name (kept for other parts still reading it)
  const [venueName, setVenueName] = useState('');

  const chosenCity = (cityValue || cityQuery).trim();
  const mapsEmbedUrl = selectedVenue
    ? `https://www.google.com/maps?output=embed&q=${encodeURIComponent(
        `${selectedVenue.name}, ${selectedVenue.address}`
      )}`
    : buildMapsEmbedUrl(venueName, chosenCity, countryName);

  // Venue search hooked to your /api/places/search (Places API New)
  useEffect(() => {
    // Clear on short input
    if ((venueQuery || '').trim().length < 2) {
      setVenueSuggestions([]);
      setVenueError(null);
      return;
    }

    if (venueDebounceRef.current) clearTimeout(venueDebounceRef.current);
    venueDebounceRef.current = setTimeout(async () => {
      venueAbortRef.current?.abort();
      const controller = new AbortController();
      venueAbortRef.current = controller;

      setVenueLoading(true);
      setVenueError(null);

      try {
        const params = new URLSearchParams({
          q: venueQuery.trim(),
          city: chosenCity,
          country: countryName || '',
          limit: '8',
        });
        if (countryCode) params.set('countryCode', countryCode);

        const resp = await fetch(`/api/places/search?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${text.slice(0, 160)}`);
        }
        const data = await resp.json();
        setVenueSuggestions(data.places ?? []);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setVenueSuggestions([]);
          setVenueError(e?.message || 'Failed to search venues');
        }
      } finally {
        setVenueLoading(false);
      }
    }, 400);

    return () => {
      if (venueDebounceRef.current) clearTimeout(venueDebounceRef.current);
      venueAbortRef.current?.abort();
    };
  }, [venueQuery, chosenCity, countryName, countryCode]);

  useEffect(() => {
    setMapReady(false);
  }, [mapsEmbedUrl]);

  // Stable ID for tickets
  const nextTicketId = useRef(0);

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

  useEffect(() => {
    if (!countryCode || (cityQuery || '').trim().length < 2) {
      setCitySuggestions([]);
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
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setCitySuggestions([]);
        setCityError(e?.message || 'Failed to search cities');
      } finally {
        setCitySearchLoading(false);
      }
    }, 500);

    return () => {
      if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
      cityAbortRef.current?.abort();
    };
  }, [countryCode, cityQuery]);

  async function generateEventImage() {
    if (!eventType || !eventName || selectedArtists.length === 0 || eventStartDate === '' || !selectedVenue) {
      alert('Please fill in the event name, type, start date, venue and select at least one artist.');
      return;
    }

    setGeneratingImage(true);
    setGeneratedImageUrl(null);

    try {
      const prompt = `
        A professional poster for "${eventName}", a music ${eventType}.
        The event name is a prominent logo with a random effect.
        The artist names are listed clearly.
        The venue and date are included in a smaller font.
        Artist Information ${selectedArtists.map(a => { return `- ${a.name} (${a.genres?.slice(0, 3).join(', ') || ''})`; }).join('\n')}
        Venue Information ${selectedVenue.name}, ${countryName || ''} ${cityValue || cityQuery || ''}
        Date Information ${
          eventType === "concert"
            ? eventStartDate.slice(0, -6)
            : eventType === "festival"
              ? `${eventStartDate.slice(0, -6)} to ${eventEndDate.slice(0, -6)}`
              : ""
        }
        Poster fills the entire image.
        Watermak the image with "Generated by Gemini Ai".
      `;
      console.log('Generating image with prompt:', prompt);
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, numberOfImages: 1 }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || errorData.error || 'Failed to generate image');
      }

      const data = await res.json();
      if (data.images && data.images.length > 0) {
        const firstImage = data.images[0];
        const imageUrl = `data:${firstImage.mimeType};base64,${firstImage.data}`;
        setGeneratedImageUrl(imageUrl);
        setPosterUrl(imageUrl);
        setPosterSource('generated');
      } else {
        throw new Error("The model did not return any images.");
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      alert(`Failed to generate image: ${error.message}`);
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  // --- Client-side validation (fast UX) ---
  const missing: string[] = [];
  if (!eventName.trim()) missing.push("Event Name");
  if (!eventStartDate) missing.push("Start Date");
  if (!eventEndDate) missing.push("End Date");
  if (!countryCode) missing.push("Country");
  if (!(cityValue || cityQuery)) missing.push("City");
  if (!eventType) missing.push("Event Type");
  if (!selectedVenue) missing.push("Venue");
  if (!eventDescription.trim()) missing.push("Description");
  if (selectedArtists.length === 0) missing.push("At least one artist");
  if (selectedArtists.some((a) => !a.time)) missing.push("Artist play time for all artists");
  if (ticketType.length === 0) missing.push("At least one ticket category");

  if (missing.length) {
    alert(`Please complete the following: \n- ${missing.join("\n- ")}`);
    return;
  }

  // Poster confirmation
  let posterDataUrl: string | undefined;
  if (!posterUrl) {
    const proceed = confirm("No poster selected or generated. Do you want to continue without a poster?");
    if (!proceed) return;
  } else {
    // If poster is from file, convert it to data URL; if it's generated, you already have data URL
    if (posterSource === "uploaded" && posterFile) {
      posterDataUrl = await readFileAsDataUrl(posterFile);
    } else if (posterSource === "generated" && generatedImageUrl) {
      posterDataUrl = generatedImageUrl;
    }
  }

  // Build payload
  const payload = {
    title: eventName.trim(),
    description: eventDescription.trim(),
    eventType,
    startAt: new Date(eventStartDate).toISOString(),
    endAt: new Date(eventEndDate).toISOString(),
    city: (cityValue || cityQuery).trim(),
    country: countryName,
    countryCode,

    venue: {
      placeId: selectedVenue!.placeId,
      name: selectedVenue!.name,
      address: selectedVenue!.address,
      city: (cityValue || cityQuery).trim(),
      country: countryName,
      countryCode,
      lat: selectedVenue!.lat ?? null,
      lng: selectedVenue!.lng ?? null,
    },

    artists: selectedArtists.map((a) => ({
      spotifyId: a.id,
      name: a.name,
      genres: a.genres ?? [],
      image: a.image ?? null,
      slot: new Date(a.time as string).toISOString(),
    })),

    ticketTiers: ticketType.map((t) => {
      const cents = toPriceCents(t.price);
      if (cents == null) throw new Error("Invalid price on a ticket tier");
      return {
        category: t.category,
        description: t.description,
        priceCents: cents,
        currency: "RON",
        quantity: Number(t.nrOfTickets),
      };
    }),

    posterDataUrl,
  };

  try {
    const res = await fetch("/api/events/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Create event failed:", data);
      alert(typeof data.error === "string" ? data.error : "Failed to create event");
      return;
    }
    // Success: reset or navigate
    alert("Event created!");
    router.push(`/events/${data.id}`)
  } catch (err: any) {
    console.error(err);
    alert("Unexpected error creating event.");
  }
}

  return (
    <>
      {/* Left Side */}
      <section
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarGutter: 'stable both-edges' }}
      >
        <div className="flex justify-center p-4 sm:p-8">
          <div className="card bg-base-300 border-base-300 rounded-box my-4 card-lg shadow-sm w-full max-w-112 sm:max-w-3xl">
            <div className="card-body p-6 md:p-8 lg:p-12">
              <h2 className="card-title self-center mb-4 whitespace-nowrap text-[var(--heading-sz)]">Event Details</h2>
              <form className="space-y-4 h-full" onSubmit={handleSubmit}>
                <div className="flex flex-col sm:flex-row gap-4">

                  {/* Poster */}
                  <div className="flex-1">
                    <div className="relative group w-full h-full rounded-box bg-base-200 overflow-hidden">
                      <img
                        src={posterUrl ?? "/placeholder.jpg"}
                        alt="Event poster preview"
                        className="w-full h-full object-cover"
                      />

                      {/* Hover mask + controls */}
                      <div className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={openFilePicker}
                            className="btn btn-sm"
                            disabled={generatingImage}
                          >
                            <FontAwesomeIcon icon={faUpload} className="mr-2" />
                            Upload
                          </button>

                          <button
                            type="button"
                            onClick={generateEventImage}
                            disabled={generatingImage}
                            className="btn btn-sm btn-primary"
                          >
                            {generatingImage ? (
                              <FontAwesomeIcon icon={faSpinner} spin />
                            ) : (
                              <>
                                <FontAwesomeIcon icon={faMagic} className="mr-2" />
                                Generate with AI
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Loading overlay */}
                      {generatingImage && (
                        <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center">
                          <span className="loading loading-spinner loading-lg text-white"></span>
                        </div>
                      )}

                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onFileChange}
                      />
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex flex-col gap-4 flex-1 justify-center">
                    {/* Event Name + Type */}
                    <div className="flex flex-col gap-2">
                      <div className="relative flex-2">
                        <input
                          id="eventName"
                          type="text"
                          placeholder=" "
                          className="peer w-full input bg-base-200 border border-base-300 rounded-box rounded-r-none!
                              shadow-none focus:outline-none focus:shadow-none focus:z-10"
                          onChange={e => setEventName(e.target.value)}
                        />
                        <label
                          htmlFor="eventName"
                          className="absolute left-3 top-2 pointer-events-none transition-all duration-200
                              opacity-70
                              peer-focus:-top-2 peer-focus:text-xs peer-focus:opacity-100
                              peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:opacity-100
                              z-10">
                          Event Name
                        </label>
                      </div>
                    </div>

                    {/* Start + End Date + Type */}
                    <div className="flex flex-col gap-2">
                      <fieldset className="fieldset flex-1">
                        <legend className="fieldset-legend">Start Date</legend>
                        <input type="datetime-local" onFocus={(e) => e.target.showPicker()}
                          onChange={e => setEventStartDate(e.target.value)}
                          className="input w-full focus:outline-none focus:shadow-none bg-base-200 border border-base-300 shadow-none" />
                      </fieldset>
                      <fieldset className="fieldset flex-1">
                        <legend className="fieldset-legend">End Date</legend>
                        <input type="datetime-local" onFocus={(e) => e.target.showPicker()}
                          onChange={e => setEventEndDate(e.target.value)}
                          min={eventStartDate}
                          className="input w-full focus:outline-none focus:shadow-none bg-base-200 border border-base-300 shadow-none" />
                      </fieldset>

                      <select
                        className="select focus:outline-none focus:shadow-none w-1/2 bg-base-200 border border-base-300 shadow-none
                              rounded-box rounded-l-none! focus:z-10"
                        defaultValue=""
                        onChange={e => setEventType(e.target.value)}
                      >
                        <option value="" disabled>Event Type</option>
                        <option value="concert">Concert</option>
                        <option value="festival">Festival</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Event Country + City + Venue */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Country */}
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Country</legend>
                      <select
                        className="select focus:outline-none w-full bg-base-200 border border-base-300 shadow-none"
                        value={countryCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          setCountryCode(code);
                          const hit = countries.find((c) => c.code === code);
                          setCountryName(hit?.name || '');
                        }}
                      >
                        <option value="">— Select country —</option>
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </fieldset>

                    {/* City */}
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">City</legend>
                      <details className="dropdown" open={editingCity}>
                        <summary className="input p-0 focus-within:outline-none w-full border-none focus-within:shadow-none">
                          <input
                            type="text"
                            tabIndex={0}
                            className="pl-4 pr-4 w-full focus:outline-none bg-base-200 border border-base-300 shadow-none"
                            placeholder={countryCode ? 'Start typing a city (min 2 chars)' : 'Select a country first'}
                            value={countryCode ? cityQuery : cityValue}
                            onChange={(e) => setCityQuery(e.target.value)}
                            onFocus={() => setEditingCity(true)}
                            onBlur={() => setEditingCity(false)}
                            disabled={!countryCode}
                            aria-invalid={!!cityError}
                          />
                        </summary>
                        {editingCity && (cityQuery).trim().length > 1 && (
                          <ul className="menu dropdown-content bg-base-100 rounded-box z-10 w-64 p-2 shadow-sm max-h-64 overflow-auto">
                            {citySearchLoading && (
                              <li className="disabled">
                                <a>
                                  <span className="loading loading-spinner mr-2" />
                                  Searching…
                                </a>
                              </li>
                            )}
                            {!citySearchLoading && citySuggestions.length === 0 && cityQuery !== "" && (
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
                                      setEditingCity(false);
                                    }}
                                  >
                                    {name}
                                  </a>
                                </li>
                              ))}
                          </ul>
                        )}
                      </details>
                      {cityError && <div className="px-4 -mt-2 text-error text-sm w-3/4">{cityError}</div>}
                    </fieldset>

                    {/* Venue (Spotify-like search + select) */}
                    <fieldset className="fieldset">
  <legend className="fieldset-legend">Venue</legend>

  {/* Use details + the 'open' attribute (not dropdown-open) */}
  <details className="dropdown w-full" open={editingVenue}>
    <summary className="input p-0 focus-within:outline-none w-full border-none focus-within:shadow-none">
      <input
        type="text"
        tabIndex={0}
        className="pl-4 pr-4 w-full focus:outline-none bg-base-200 border border-base-300 shadow-none"
        placeholder="Type a venue (min 2 chars)"
        value={selectedVenue ? selectedVenue.name : venueQuery}
        onChange={(e) => {
          // If user types after a selection, clear it and search again
          setSelectedVenue(null);
          setVenueName('');
          setVenueQuery(e.target.value);
        }}
        onFocus={() => setEditingVenue(true)}
        // tiny delay helps when clicking a menu item (in addition to onMouseDown preventDefault)
        onBlur={() => setTimeout(() => setEditingVenue(false), 100)}
      />
    </summary>

    {editingVenue && (venueQuery || '').trim().length > 1 && (
      <ul
        tabIndex={0}
        className="menu dropdown-content bg-base-100 rounded-box max-w-60 p-2 shadow-sm max-h-72 overflow-auto z-50"
      >
        {venueLoading && (
          <li className="disabled">
            <a><span className="loading loading-spinner mr-2" />Searching…</a>
          </li>
        )}

        {!venueLoading && venueSuggestions.length === 0 && venueQuery !== '' && (
          <li className="disabled"><a>No results</a></li>
        )}

        {!venueLoading && venueSuggestions.map((v) => (
          <li key={v.placeId}>
            <a
              onMouseDown={(e) => e.preventDefault()} // keep input from blurring before click
              onClick={() => {
                setSelectedVenue(v);
                setVenueName(v.name);
                setVenueQuery(v.name);
                setEditingVenue(false);
              }}
            >
              <div className="flex flex-col">
                <span className="font-medium">{v.name}</span>
                <span className="text-xs opacity-70">{v.address}</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    )}
  </details>

  {venueError && <div className="px-1 mt-1 text-error text-sm">{venueError}</div>}
</fieldset>

                  </div>

                  {/* Maps Preview */}
                  <div className={`${mapExpanded ? 'h-64 w-full' : 'h-32 w-1/2'} transition-all transition-discrete duration-300 rounded-lg ${mapsEmbedUrl ? ("relative") : ("hidden")} text-base-content border border-base-200 overflow-hidden`}>
                    {mapsEmbedUrl && (
                      <>
                        <iframe
                          key={mapsEmbedUrl}
                          src={mapsEmbedUrl}
                          loading="lazy"
                          className="w-full h-full"
                          onLoad={() => setMapReady(true)}
                        />
                      </>
                    )}
                    {mapReady ? (
                      <button
                        type="button"
                        className="btn btn-circle btn-sm btn-success absolute right-2 top-2"
                        onClick={() => setMapExpanded((v) => !v)}
                        aria-label={mapExpanded ? 'Collapse map' : 'Expand map'}
                      >
                        <FontAwesomeIcon icon={mapExpanded ? faMinus : faPlus} />
                      </button>
                    ) : (<FontAwesomeIcon icon={faSpinner} spin size="lg"
                      className="absolute left-0 top-0 bottom-0 right-0 m-auto" />)
                    }
                  </div>
                </div>

                {/* Artists */}
                <fieldset className="fieldset bg-base-200 border-base-200 rounded-box w-full border p-4 gap-6">
                  <legend className="fieldset-legend">Artists</legend>

                  <div className={`dropdown ${editingArtist ? 'dropdown-open' : ''}`}>
                    <summary className="input p-0 focus-within:outline-none border-none focus-within:shadow-none">
                      <input
                        type="text"
                        tabIndex={0}
                        className="pl-4 pr-4 focus:outline-none bg-base-100 border border-base-300 shadow-none"
                        placeholder="Search artist"
                        value={artistQuery}
                        onChange={(e) => setArtistQuery(e.target.value)}
                        onFocus={() => setEditingArtist(true)}
                        onBlur={() => setEditingArtist(false)}
                      />
                    </summary>

                    {editingArtist && artistQuery.length > 1 && (
                      <ul className="menu dropdown-content bg-base-100 rounded-box z-10 w-80 p-2 shadow-sm max-h-72 overflow-auto">
                        {artistSearchLoading && (
                          <li className="disabled">
                            <a><span className="loading loading-spinner mr-2" />Searching…</a>
                          </li>
                        )}

                        {!artistSearchLoading && artistSuggestions.length === 0 && artistQuery.length > 1 && (
                          <li className="disabled"><a>No results</a></li>
                        )}

                        {!artistSearchLoading && artistSuggestions.map((a) => (
                          <li key={a.id}>
                            <div
                              className="flex items-center gap-2"
                              onClick={() => handleSelectArtist(a)}
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              {a.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={a.image} alt="" className="w-8 h-8 rounded" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-base-200" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium">{a.name}</div>
                                <div className="text-xs opacity-70 truncate">
                                  {a.genres?.slice(0, 3).join(', ') || '—'}
                                </div>
                              </div>
                              <button
                                className="btn btn-xs btn-success"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelectArtist(a)}
                              >
                                Add
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Selected artists */}
                  <ul className="list bg-base-100 rounded-box shadow-md mt-3">
                    {selectedArtists.map((a) => (
                      <li key={a.id} className="list-row grid-cols-[1fr_1fr_auto] p-2 h-16 items-center">
                        <div className="flex items-center gap-3">
                          {a.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.image} alt="" className="w-10 h-10 rounded" />
                          ) : <div className="w-10 h-10 rounded bg-base-200" />}
                          <div className="min-w-0">
                            <div className="font-medium">{a.name}</div>
                            <div className="text-xs opacity-70 truncate">{a.genres?.slice(0, 3).join(', ') || '—'}</div>
                          </div>
                        </div>
                        <div className="tooltip tooltip-left" data-tip="Start Time">
                          <div className="h-full">
                            <input
                              type="datetime-local"
                              min={eventStartDate}
                              max={eventEndDate}
                              value={a.time ?? ''}
                              onFocus={(e) => e.target.showPicker()}
                              onChange={(e) => {
                                setSelectedArtists(prev => {
                                  const next = prev.map(x =>
                                    x.id === a.id ? { ...x, time: e.target.value } : x
                                  );
                                  next.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
                                  return next;
                                });
                              }}
                              className="input h-full focus-visible:outline-none focus-visible:shadow-none focus:outline-none focus:shadow-none border-none shadow-none"
                            />
                          </div>
                        </div>
                        <button
                          className="btn btn-circle btn-error ml-auto"
                          onClick={() => setSelectedArtists((prev) => prev.filter((x) => x.id !== a.id))}
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </fieldset>

                {/* Tickets */}
                <fieldset className="fieldset bg-base-200 border-base-200 rounded-box w-full border p-4 gap-6">
                  <legend className="fieldset-legend">Tickets</legend>

                  <div className="flex flex-row gap-2">
                    <div className="relative">
                      <input
                        id="category"
                        type="text"
                        placeholder=" "
                        className="peer w-full input bg-base-100 border border-base-300 rounded-box shadow-none focus:outline-none focus:shadow-none"
                        onChange={e => setTicketCategory(e.target.value)}
                        value={ticketCategory}
                      />
                      <label
                        htmlFor="category"
                        className="absolute left-3 top-3 pointer-events-none transition-all duration-200
                                  opacity-70
                                  peer-focus:-top-2 peer-focus:text-xs peer-focus:opacity-100
                                  peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:opacity-100
                                  z-10">
                        Category
                      </label>
                    </div>

                    <div className="relative">
                      <input
                        id="ticketNumber"
                        type="number"
                        placeholder=""
                        min={0}
                        pattern="[0-9]*" inputMode="numeric"
                        className="peer w-full input bg-base-100 border border-base-300 rounded-box shadow-none focus:outline-none focus:shadow-none"
                        onChange={e => setNrOfTickets(e.target.value)}
                        value={nrOfTickets}
                      />
                      <label
                        htmlFor="ticketNumber"
                        className="absolute left-3 top-3 pointer-events-none transition-all duration-200
                                  opacity-70
                                  peer-focus:-top-2 peer-focus:text-xs peer-focus:opacity-100
                                  peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:opacity-100
                                  z-10">
                        No. Tickets
                      </label>
                    </div>

                    <div className="relative">
                      <input
                        id="ticketPrice"
                        type="number"
                        placeholder=" "
                        min={0}
                        pattern="[0-9]*" inputMode="numeric"
                        className="peer w-full input bg-base-100 border border-base-300 rounded-box shadow-none focus:outline-none focus:shadow-none"
                        onChange={e => setTicketPrice(e.target.value)}
                        value={ticketPrice}
                      />
                      <label
                        htmlFor="ticketPrice"
                        className="absolute left-3 top-3 pointer-events-none transition-all duration-200
                                  opacity-70
                                  peer-focus:-top-2 peer-focus:text-xs peer-focus:opacity-100
                                  peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:opacity-100
                                  z-10">
                        Price
                      </label>
                    </div>

                    <button
                      className="btn btn-circle btn-success"
                      onClick={(e) => {
                        e.preventDefault();
                        if (ticketCategory !== '' && nrOfTickets !== '' && ticketPrice !== '' && ticketDescription !== '') {
                          setTicketType(prev => ([
                            ...prev,
                            {
                              id: nextTicketId.current++,
                              category: ticketCategory,
                              description: ticketDescription,
                              nrOfTickets: nrOfTickets,
                              price: ticketPrice
                            }
                          ]));
                          setTicketCategory(''); setNrOfTickets(''); setTicketPrice(''); setTicketDescription('');
                        }
                      }}
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      className="break-all peer w-full bg-base-100 border border-base-300 rounded-box shadow-none 
                                            focus:outline-none focus:shadow-none textarea textarea-bordered w-full resize-none field-sizing-content h-30 overflow-y-auto"
                      id="ticketDescription" placeholder=" "
                      onChange={e => setTicketDescription(e.target.value)}
                      value={ticketDescription}
                    />
                    <label
                      htmlFor="ticketDescription"
                      className="absolute left-3 top-3 pointer-events-none transition-all duration-200 opacity-70 peer-focus:-top-2 peer-focus:text-xs peer-focus:opacity-100
                                            peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:opacity-100 z-10">
                      Ticket Description
                    </label>
                  </div>

                  <ul className="list bg-base-100 rounded-box shadow-md">
                    {ticketType.map(ticket => (
                      <li className="list-row grid-cols-none items-center" key={ticket.id}>
                        <p> {ticket.category} </p>
                        <p><FontAwesomeIcon icon={faHashtag} /> {ticket.nrOfTickets}</p>
                        <p><FontAwesomeIcon icon={faMoneyBill1Wave} /> {ticket.price} </p>
                        <p className="max-h-20 overflow-y-auto"><FontAwesomeIcon icon={faComment} /> {ticket.description} </p>
                        <button
                          className="btn btn-circle btn-error ml-auto"
                          onClick={() => {
                            setTicketType(tt => tt.filter(t => t.id !== ticket.id));
                          }}>
                          <FontAwesomeIcon icon={faMinus} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </fieldset>

                {/* Description */}
                <div className="relative">
                  <textarea
                    className=" peer w-full bg-base-100 border border-base-300 rounded-box shadow-none min-h-50 max-h-75
                                            pr-10 text-pretty
                                            focus:outline-none focus:shadow-none textarea textarea-bordered w-full resize-none field-sizing-content overflow-y-auto"
                    id="ticketDescription" placeholder=" "
                    value={eventDescription}
                    onChange={e => setEventDescription(e.target.value)}
                  />
                  <label
                    htmlFor="ticketDescription"
                    className="absolute left-3 top-3 pointer-events-none transition-all duration-200 opacity-70 peer-focus:-top-2 peer-focus:text-xs peer-focus:opacity-100
                                            peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:opacity-100 z-10">
                    Event Description
                  </label>
                  <div
                    className="absolute right-3 bottom-2 tooltip tooltip-left z-20"
                    data-tip={`${generatingDescription ? "Generating description..." : "Generate description with AI"}`}
                  >
                    <button type="button" className="btn btn-circle btn-success" onClick={() => generateEventDescription()}>
                      {generatingDescription ? <span className="loading loading-spinner" /> : <FontAwesomeIcon icon={faRepeat} />
                      }
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full mb-4">Create Event</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
