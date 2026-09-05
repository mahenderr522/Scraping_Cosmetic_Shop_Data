import { City, Shop, deriveTags, projectShops } from "./data";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

interface OsmTags {
  name?: string;
  "name:en"?: string;
  brand?: string;
  phone?: string;
  "contact:phone"?: string;
  "contact:mobile"?: string;
  "phone:mobile"?: string;
  website?: string;
  "contact:website"?: string;
  url?: string;
  "addr:housenumber"?: string;
  "addr:street"?: string;
  "addr:postcode"?: string;
  "addr:city"?: string;
  "addr:suburb"?: string;
  "addr:full"?: string;
  opening_hours?: string;
  shop?: string;
  organic?: string;
  description?: string;
}

interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
}

const SHOP_VALUES = "cosmetics|beauty|perfumery|chemist|hairdresser_supply";

function buildQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:25];
(
  nwr["shop"~"^(${SHOP_VALUES})$"](around:${radius},${lat},${lon});
);
out center tags 400;`;
}

function cleanSite(u?: string): string | null {
  if (!u) return null;
  return u.replace(/^https?:\/\//, "").replace(/\/$/, "") || null;
}

export async function fetchOsmShops(city: City, signal?: AbortSignal): Promise<Shop[]> {
  const q = buildQuery(city.lat, city.lon, 9000);
  let lastErr: unknown = null;

  for (const ep of ENDPOINTS) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 16000);
    const onAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(q)}`,
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
      const json = (await res.json()) as { elements?: OsmElement[] };
      signal?.removeEventListener("abort", onAbort);
      clearTimeout(timer);
      return mapElements(json.elements ?? [], city);
    } catch (e) {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if ((e as Error)?.name === "AbortError" && signal?.aborted) throw e;
      lastErr = e;
    }
  }
  throw new Error(`All Overpass mirrors unreachable${lastErr ? ` (${(lastErr as Error).message})` : ""}`);
}

function mapElements(elements: OsmElement[], city: City): Shop[] {
  const seen = new Set<string>();
  const shops: Shop[] = [];

  for (const el of elements) {
    const t = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const rawName = t.name || t["name:en"] || t.brand;
    const phone = t.phone || t["contact:phone"] || t["contact:mobile"] || t["phone:mobile"] || null;
    if (!rawName && !phone) continue; // useless lead
    const name = rawName || "Unnamed shop";
    const dedupeKey = `${name}|${phone ?? ""}`.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const addrBits = [
      [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "),
      [t["addr:postcode"], t["addr:suburb"] || t["addr:city"]].filter(Boolean).join(" "),
    ].filter(Boolean);
    const address = addrBits.join(", ") || t["addr:full"] || `${city.name} (exact address on Maps)`;

    const tags = deriveTags(t.shop, t.brand, t.description, t.organic === "yes" ? "organic" : undefined);

    shops.push({
      id: `osm-${el.type}-${el.id}`,
      name,
      brand: t.brand,
      area: t["addr:suburb"] || city.name,
      address,
      plus: `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`,
      phone: phone ? phone.trim() : null,
      website: cleanSite(t.website || t["contact:website"] || t.url),
      hours: null,
      hoursRaw: t.opening_hours || null,
      rating: null,
      reviews: 0,
      breakdown: null,
      tags,
      womenOwned: false,
      claimed: false,
      x: 0,
      y: 0,
      lat,
      lon,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      source: "osm",
    });
  }
  projectShops(shops);
  return shops.slice(0, 150);
}
