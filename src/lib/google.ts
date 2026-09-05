import { City, Shop, HoursEntry, deriveTags, projectShops } from "./data";

interface PlacePeriodTime { day: number; hour: number; minute: number }
interface PlacePeriod { open: PlacePeriodTime; close?: PlacePeriodTime }
interface Place {
  id: string;
  displayName?: { text?: string };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  regularOpeningHours?: { periods?: PlacePeriod[] };
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: string;
  types?: string[];
}

export async function searchGooglePlaces(
  apiKey: string,
  query: string,
  city: City,
  signal?: AbortSignal
): Promise<Shop[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey.trim(),
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.regularOpeningHours,places.location,places.primaryTypeDisplayName,places.types",
    },
    body: JSON.stringify({ textQuery: `${query} in ${city.name}`, maxResultCount: 20 }),
    signal,
  });

  if (!res.ok) {
    let msg = `Google Places error ${res.status}`;
    try {
      const j = (await res.json()) as { error?: { message?: string; status?: string } };
      if (j.error?.message) msg = j.error.message;
      if (j.error?.status === "PERMISSION_DENIED") msg = "API key rejected — enable the Places API (New) and check key restrictions.";
      if (j.error?.status === "INVALID_ARGUMENT") msg = "Request rejected — check that billing is enabled on this key.";
    } catch { /* keep default */ }
    throw new Error(msg);
  }

  const json = (await res.json()) as { places?: Place[] };
  return mapPlaces(json.places ?? [], city);
}

function mapHours(place: Place): { hours: HoursEntry[] | null; raw: string | null } {
  const periods = place.regularOpeningHours?.periods;
  if (!periods || periods.length === 0) return { hours: null, raw: null };

  const entries: HoursEntry[] = Array.from({ length: 7 }, (_, d) => ({ day: d, open: null, close: null }));
  for (const p of periods) {
    const day = p.open.day === 0 ? 6 : p.open.day - 1; // Google Sun=0 → our Mon=0
    const openH = p.open.hour + p.open.minute / 60;
    let closeH = 24;
    if (p.close) {
      closeH = p.close.hour + p.close.minute / 60;
      if (closeH <= openH) closeH = 24; // spans midnight — close at midnight for display
    }
    entries[day] = { day, open: openH, close: closeH };
  }
  return { hours: entries, raw: null };
}

function mapPlaces(places: Place[], city: City): Shop[] {
  const shops: Shop[] = [];
  for (const p of places) {
    const name = p.displayName?.text?.trim();
    if (!name) continue;
    const phone = p.internationalPhoneNumber || p.nationalPhoneNumber || null;
    const { hours, raw } = mapHours(p);
    const tags = deriveTags(p.primaryTypeDisplayName, p.types?.join(" "));

    shops.push({
      id: `g-${p.id}`,
      name,
      area: city.name,
      address: p.formattedAddress || city.name,
      plus: p.location ? `${p.location.latitude.toFixed(5)}°, ${p.location.longitude.toFixed(5)}°` : city.name,
      phone: phone ? phone.trim() : null,
      website: p.websiteUri ? p.websiteUri.replace(/^https?:\/\//, "").replace(/\/$/, "") : null,
      hours,
      hoursRaw: raw,
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
      source: "google",
    });
  }
  projectShops(shops.filter((s) => s.lat != null && s.lon != null));
  return shops;
}
