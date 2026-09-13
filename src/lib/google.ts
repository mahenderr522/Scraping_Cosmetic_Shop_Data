import { City, Shop, HoursEntry, deriveTags, projectShops } from "./data";

/** Bundled Google Maps API key (ships with GlowScout, can be overridden in the console). */
export const DEFAULT_GOOGLE_KEY = "AIzaSyDCWqMGCo6Eh3LnnFsB9IIcTDBunvtXYZ4";

export class GApiError extends Error {
  status?: string;
  constructor(message: string, status?: string) {
    super(message);
    this.status = status;
  }
}

type Stage = (msg: string) => void;
const noop: Stage = () => {};

export interface GoogleResult {
  shops: Shop[];
  via: "new" | "legacy";
}

interface PlacePeriodTime { day: number; hour: number; minute: number }
interface PlacePeriod { open: PlacePeriodTime; close?: PlacePeriodTime }

/* ────────────────────────────────────────────────────────────────────
   Places API (New) — places:searchText
   ──────────────────────────────────────────────────────────────────── */

interface PlaceNew {
  id: string;
  displayName?: { text?: string };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { periods?: PlacePeriod[] };
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: string;
  types?: string[];
}

async function searchNew(
  key: string,
  query: string,
  city: City,
  signal: AbortSignal | undefined,
  onStage: Stage
): Promise<Shop[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.regularOpeningHours,places.location,places.primaryTypeDisplayName,places.types",
    },
    body: JSON.stringify({ textQuery: `${query} in ${city.name}`, maxResultCount: 20, languageCode: "en" }),
    signal,
  });

  if (!res.ok) {
    let msg = `Google Places error ${res.status}`;
    let status: string | undefined;
    try {
      const j = (await res.json()) as { error?: { message?: string; status?: string } };
      status = j.error?.status;
      if (j.error?.message) msg = j.error.message;
      if (status === "PERMISSION_DENIED")
        msg = "key rejected for Places API (New) — not enabled, or blocked by restrictions";
      if (status === "INVALID_ARGUMENT") msg = "request rejected — check that billing is enabled on this key";
    } catch { /* keep default */ }
    throw new GApiError(msg, status);
  }

  onStage("searchText OK · mapping official listing fields");
  const json = (await res.json()) as { places?: PlaceNew[] };
  const shops: Shop[] = [];
  for (const p of json.places ?? []) {
    const name = p.displayName?.text?.trim();
    if (!name) continue;
    const phone = p.internationalPhoneNumber || p.nationalPhoneNumber || null;
    const { hours } = mapHours(p.regularOpeningHours?.periods);
    const tags = deriveTags(p.primaryTypeDisplayName, p.types?.join(" "));
    const parts = (p.formattedAddress ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    shops.push({
      id: `g-${p.id}`,
      name,
      area: parts[1] || city.name,
      address: p.formattedAddress || city.name,
      plus: p.location ? `${p.location.latitude.toFixed(5)}°, ${p.location.longitude.toFixed(5)}°` : city.name,
      phone: phone ? phone.trim() : null,
      website: p.websiteUri ? p.websiteUri.replace(/^https?:\/\//, "").replace(/\/$/, "") : null,
      hours,
      hoursRaw: null,
      rating: p.rating ?? null,
      reviews: p.userRatingCount ?? 0,
      breakdown: null,
      tags,
      womenOwned: false,
      claimed: true,
      x: 0,
      y: 0,
      lat: p.location?.latitude,
      lon: p.location?.longitude,
      gmapsUrl: p.googleMapsUri ?? null,
      source: "google",
    });
  }
  placeOnMap(shops);
  return shops;
}

/* ────────────────────────────────────────────────────────────────────
   Legacy Places API — textsearch + details (same key, GET requests)
   ──────────────────────────────────────────────────────────────────── */

interface PlaceBasic {
  place_id: string;
  name?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  geometry?: { location?: { lat: number; lng: number } };
}

interface PlaceDetails {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  opening_hours?: { periods?: PlacePeriod[] };
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new GApiError(`Google responded ${res.status}`);
  return res.json();
}

async function pMap<T, R>(items: T[], fn: (t: T, i: number) => Promise<R>, limit: number): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function searchLegacy(
  key: string,
  query: string,
  city: City,
  signal: AbortSignal | undefined,
  onStage: Stage
): Promise<Shop[]> {
  const base = "https://maps.googleapis.com/maps/api/place";
  const tsUrl = `${base}/textsearch/json?query=${encodeURIComponent(`${query} in ${city.name}`)}&language=en&key=${encodeURIComponent(key)}`;
  const ts = (await getJson(tsUrl, signal)) as { status?: string; error_message?: string; results?: PlaceBasic[] };

  if (ts.status !== "OK") {
    let msg = `legacy text-search replied ${ts.status ?? "?"}`;
    if (ts.status === "REQUEST_DENIED")
      msg = "key rejected by legacy Places API — enable it (or Places API New) in Google Cloud Console";
    if (ts.error_message) msg += ` · ${ts.error_message}`;
    throw new GApiError(msg, ts.status === "REQUEST_DENIED" ? "PERMISSION_DENIED" : ts.status);
  }

  const results = (ts.results ?? []).filter((r) => r.place_id && r.name).slice(0, 18);
  if (results.length === 0) return [];
  onStage(`text-search OK · ${results.length} places · pulling contact details (phone, website, hours) …`);

  const detailed = await pMap(
    results,
    async (r) => {
      const dUrl = `${base}/details/json?place_id=${encodeURIComponent(r.place_id)}&fields=international_phone_number,formatted_phone_number,opening_hours,website,url&language=en&key=${encodeURIComponent(key)}`;
      try {
        const d = (await getJson(dUrl, signal)) as { status?: string; result?: PlaceDetails };
        return { r, d: d.status === "OK" ? d.result : undefined };
      } catch {
        return { r, d: undefined };
      }
    },
    4
  );

  const shops: Shop[] = [];
  let phones = 0;
  for (const { r, d } of detailed) {
    const name = r.name?.trim();
    if (!name) continue;
    const phone = d?.international_phone_number || d?.formatted_phone_number || null;
    if (phone) phones += 1;
    const { hours } = mapHours(d?.opening_hours?.periods);
    const tags = deriveTags(r.types?.join(" "), name);
    const parts = (r.formatted_address ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const loc = r.geometry?.location;

    shops.push({
      id: `gl-${r.place_id}`,
      name,
      area: parts[1] || city.name,
      address: r.formatted_address || city.name,
      plus: loc ? `${loc.lat.toFixed(5)}°, ${loc.lng.toFixed(5)}°` : city.name,
      phone: phone ? phone.trim() : null,
      website: d?.website ? d.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : null,
      hours,
      hoursRaw: null,
      rating: r.rating ?? null,
      reviews: r.user_ratings_total ?? 0,
      breakdown: null,
      tags,
      womenOwned: false,
      claimed: true,
      x: 0,
      y: 0,
      lat: loc?.lat,
      lon: loc?.lng,
      gmapsUrl: d?.url ?? null,
      source: "google",
    });
  }
  onStage(`contact details hydrated · ${phones}/${shops.length} listings carry a published number`);
  placeOnMap(shops);
  return shops;
}

/* ── shared helpers ────────────────────────────────────────────────── */

function mapHours(periods?: PlacePeriod[]): { hours: HoursEntry[] | null } {
  if (!periods || periods.length === 0) return { hours: null };
  const entries: HoursEntry[] = Array.from({ length: 7 }, (_, d) => ({ day: d, open: null, close: null }));
  for (const p of periods) {
    const day = p.open.day === 0 ? 6 : p.open.day - 1; // Google Sun=0 → our Mon=0
    const openH = p.open.hour + p.open.minute / 60;
    let closeH = 24;
    if (p.close) {
      closeH = p.close.hour + p.close.minute / 60;
      if (closeH <= openH) closeH = 24; // spans midnight
    }
    entries[day] = { day, open: openH, close: closeH };
  }
  return { hours: entries };
}

function placeOnMap(shops: Shop[]): void {
  const withCoords = shops.filter((s) => s.lat != null && s.lon != null);
  projectShops(withCoords.length ? withCoords : shops);
  if (withCoords.length < shops.length) {
    let i = 0;
    for (const s of shops) {
      if (s.lat == null || s.lon == null) {
        s.x = 38 + ((i * 17) % 24);
        s.y = 34 + ((i * 13) % 22);
        i += 1;
      }
    }
  }
}

/* ── public entry: cascade New → Legacy ────────────────────────────── */

export async function searchGooglePlaces(
  apiKey: string,
  query: string,
  city: City,
  signal?: AbortSignal,
  onStage?: Stage
): Promise<GoogleResult> {
  const key = apiKey.trim();
  const stage = onStage ?? noop;
  try {
    const shops = await searchNew(key, query, city, signal, stage);
    return { shops, via: "new" };
  } catch (e) {
    const ge = e as GApiError;
    const tryLegacy =
      ge.status === "PERMISSION_DENIED" || ge.status === "NOT_FOUND" || ge.status === "FAILED_PRECONDITION";
    if (!tryLegacy) throw e;
    stage("Places API (New) not enabled on this key → switching to legacy text-search + details …");
    const shops = await searchLegacy(key, query, city, signal, stage);
    return { shops, via: "legacy" };
  }
}

/* ── key diagnostics (used by the "Test key" button) ───────────────── */

export interface KeyVerdict {
  ok: boolean;
  label: string;
  detail: string;
}

export async function testGoogleKey(key: string): Promise<KeyVerdict> {
  const k = key.trim();
  if (!k) return { ok: false, label: "No key", detail: "Paste a key first, then test." };

  // probe 1 — Places API (New), cheapest possible call (1 result, id only)
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": k,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({ textQuery: "cosmetics shop", maxResultCount: 1 }),
    });
    if (res.ok)
      return {
        ok: true,
        label: "Places API (New) · enabled",
        detail: "Verified against Google — names, numbers, hours and ratings will stream live.",
      };
    const j = (await res.json().catch(() => null)) as { error?: { status?: string; message?: string } } | null;
    const status = j?.error?.status;
    if (status && !["PERMISSION_DENIED", "NOT_FOUND", "FAILED_PRECONDITION"].includes(status))
      return { ok: false, label: status, detail: j?.error?.message ?? "Google rejected the request." };
    // else: New not enabled — probe legacy
  } catch {
    return {
      ok: false,
      label: "Network unreachable",
      detail: "This browser can't reach places.googleapis.com — live calls will fail on this network.",
    };
  }

  // probe 2 — legacy Places API autocomplete (GET)
  try {
    const r2 = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=cosmetic&key=${encodeURIComponent(k)}`
    );
    const j2 = (await r2.json()) as { status?: string; error_message?: string };
    if (j2.status === "OK")
      return {
        ok: true,
        label: "Places API (Legacy) · enabled",
        detail: "Key works — GlowScout will route through legacy text-search + place details.",
      };
    return {
      ok: false,
      label: "Key valid · Places not enabled",
      detail: `Google replied “${j2.status ?? "?"}”. In Google Cloud Console enable “Places API (New)”, check billing, and make sure HTTP-referrer restrictions allow this site.`,
    };
  } catch {
    return {
      ok: false,
      label: "Network unreachable",
      detail: "This browser can't reach Google — live calls will fail on this network.",
    };
  }
}
