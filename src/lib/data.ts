import { Rng, rng, hashSeed, int, pick } from "./rand";

const rf = (r: Rng, a: number, b: number) => a + r() * (b - a);
const rint = int;
type RNG = Rng;

export type DataSource = "demo" | "osm" | "google";

export interface City {
  id: string;
  name: string;
  country: string;
  phoneCode: string;
  phoneFmt: "xxx" | "dash";
  currency: string;
  lat: number;
  lon: number;
  areas: string[];
}

export const CITIES: City[] = [
  { id: "mumbai", name: "Mumbai", country: "India", phoneCode: "+91", phoneFmt: "xxx", currency: "₹", lat: 19.076, lon: 72.8777, areas: ["Bandra W", "Andheri", "Powai", "Lower Parel", "Juhu", "Dadar", "Colaba", "Malad"] },
  { id: "delhi", name: "Delhi", country: "India", phoneCode: "+91", phoneFmt: "xxx", currency: "₹", lat: 28.6139, lon: 77.209, areas: ["Lajpat Nagar", "Saket", "Karol Bagh", "Rajouri Garden", "Vasant Kunj", "Dwarka", "GK-II"] },
  { id: "bangalore", name: "Bengaluru", country: "India", phoneCode: "+91", phoneFmt: "xxx", currency: "₹", lat: 12.9716, lon: 77.5946, areas: ["Indiranagar", "Koramangala", "Jayanagar", "Whitefield", "HSR Layout", "Malleshwaram"] },
  { id: "dubai", name: "Dubai", country: "UAE", phoneCode: "+971", phoneFmt: "dash", currency: "AED", lat: 25.2048, lon: 55.2708, areas: ["Deira", "Al Barsha", "JLT", "Satwa", "Al Karama", "Jumeirah", "Mirdif"] },
  { id: "london", name: "London", country: "UK", phoneCode: "+44", phoneFmt: "dash", currency: "£", lat: 51.5074, lon: -0.1278, areas: ["Soho", "Camden", "Brixton", "Shoreditch", "Ealing", "Croydon", "Islington"] },
  { id: "karachi", name: "Karachi", country: "Pakistan", phoneCode: "+92", phoneFmt: "xxx", currency: "Rs", lat: 24.8607, lon: 67.0011, areas: ["Clifton", "Gulshan", "DHA", "Saddar", "North Nazimabad", "Tariq Road"] },
  { id: "singapore", name: "Singapore", country: "Singapore", phoneCode: "+65", phoneFmt: "xxx", currency: "S$", lat: 1.3521, lon: 103.8198, areas: ["Orchard", "Bugis", "Tampines", "Jurong", "Novena", "Katong"] },
];

export const TAGS = ["Makeup", "Skincare", "Fragrance", "Haircare", "Organic", "Ayurvedic", "Bridal", "K-Beauty", "Salon Supplies", "Drugstore", "Wholesale", "Luxury"] as const;
export type Tag = (typeof TAGS)[number];
export const ALL_TAGS: string[] = [...TAGS];

export interface HoursEntry { day: number; open: number | null; close: number | null }
export interface Breakdown { stars: number; pct: number }

export interface Shop {
  id: string;
  name: string;
  brand?: string;
  area: string;
  address: string;
  plus: string;
  phone: string | null;
  website: string | null;
  hours: HoursEntry[] | null;
  hoursRaw?: string | null;
  rating: number | null;
  reviews: number;
  breakdown: Breakdown[] | null;
  tags: Tag[];
  womenOwned: boolean;
  claimed: boolean;
  x: number;
  y: number;
  lat?: number;
  lon?: number;
  osmUrl?: string | null;
  gmapsUrl?: string | null;
  source: DataSource;
}

export const SOURCE_LABEL: Record<DataSource, string> = {
  demo: "synthetic demo",
  osm: "live · openstreetmap",
  google: "live · google places",
};

export function mapsUrl(s: Shop): string {
  if (s.gmapsUrl) return s.gmapsUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address}`)}`;
}

export function isOpenNow(s: Shop): boolean | null {
  if (!s.hours) return null;
  const e = s.hours[(new Date().getDay() + 6) % 7];
  if (e.open === null || e.close === null) return false;
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h >= e.open && h < e.close;
}

const fmtH = (h: number) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm ? `${h12}:${String(mm).padStart(2, "0")} ${ampm}` : `${h12} ${ampm}`;
};

export function hoursLabel(s: Shop): string {
  if (s.hoursRaw) return s.hoursRaw.length > 36 ? s.hoursRaw.slice(0, 35) + "…" : s.hoursRaw;
  if (!s.hours) return "hours not listed";
  const e = s.hours[(new Date().getDay() + 6) % 7];
  if (e.open === null || e.close === null) return "closed today";
  return `${fmtH(e.open)} – ${fmtH(e.close)}`;
}

/* project lat/lon of live results onto the schematic map (0..100 space) */
export function projectShops(shops: Shop[]): void {
  if (!shops.length) return;
  const lats = shops.map((s) => s.lat ?? 0);
  const lons = shops.map((s) => s.lon ?? 0);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const spanLat = Math.max(maxLat - minLat, 1e-4);
  const spanLon = Math.max(maxLon - minLon, 1e-4);
  shops.forEach((s) => {
    s.x = 10 + (((s.lon ?? minLon) - minLon) / spanLon) * 80;
    s.y = 88 - (((s.lat ?? minLat) - minLat) / spanLat) * 76;
  });
}

export function deriveTags(...hints: (string | undefined | null)[]): Tag[] {
  const h = hints.filter(Boolean).join(" ").toLowerCase();
  const out = new Set<Tag>();
  if (h.includes("cosmetic") || h.includes("makeup") || h.includes("make-up")) out.add("Makeup");
  if (h.includes("perfum") || h.includes("fragrance")) out.add("Fragrance");
  if (h.includes("chemist") || h.includes("pharma") || h.includes("drug")) out.add("Drugstore");
  if (h.includes("beauty") || h.includes("skin")) out.add("Skincare");
  if (h.includes("hair")) out.add("Haircare");
  if (h.includes("organic") || h.includes("natural")) out.add("Organic");
  if (h.includes("ayurved")) out.add("Ayurvedic");
  if (h.includes("korean") || h.includes("k-beauty")) out.add("K-Beauty");
  if (out.size === 0) out.add("Makeup");
  return [...out].slice(0, 3);
}

/* ── deterministic synthetic generator (demo mode) ───────────────── */

const PREFIX = ["Glow", "Velvet", "Blush", "Lotus", "Aura", "Radiant", "Petal", "Opal", "Kaya", "Ivory", "Saffron", "Mira"];
const KIND = ["Beauty", "Cosmetics", "Skin Studio", "Beauty Bar", "Cosmetix", "Glow Lab", "Beauty Co.", "Skin & Co.", "Parlour Supply"];
const SUFFIX = ["", "", " & Spa", " Store", " Boutique", " Outlet", " Studio", " Point"];
const BRAND = ["Lakmé", "Nykaa", "The Body Shop", "Forest Essentials", "Kama Ayurveda", "Sugar", "Colorbar", "Plum", "Mamaearth", "Minimalist", "Faces", "Lotus Herbal"];
const STREETS = ["MG Road", "Station Road", "Hill Road", "Market Lane", "Temple Street", "Park Avenue", "Cross Street", "Bypass Road", "Plaza Marg", "Garden Road"];

const TAG_POOL: Tag[][] = [
  ["Makeup", "Skincare"], ["Skincare", "Organic"], ["Fragrance", "Luxury"],
  ["Haircare", "Salon Supplies"], ["Ayurvedic", "Organic"], ["Bridal", "Makeup"],
  ["K-Beauty", "Skincare"], ["Drugstore", "Makeup"], ["Wholesale", "Haircare"],
  ["Makeup", "Fragrance", "Bridal"],
];

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function makePhone(r: RNG, city: City): string | null {
  if (r() < 0.1) return null;
  if (city.phoneFmt === "xxx") {
    const mobile = r() < 0.62;
    const lead = mobile ? pick(r, ["98", "97", "96", "99", "93", "90", "88"]) : "22";
    return `${city.phoneCode} ${lead}${rint(r, 10000000, 99999999)}`;
  }
  return `${city.phoneCode} ${rint(r, 50, 58)} ${rint(r, 100, 999)} ${rint(r, 1000, 9999)}`;
}

function makeBreakdown(r: RNG, rating: number): Breakdown[] {
  const w5 = Math.max(4, Math.round((rating - 2.7) * 24 + r() * 8));
  const w4 = rint(r, 12, 24);
  const w3 = rint(r, 5, 12);
  const w2 = rint(r, 2, 6);
  const w1 = Math.max(1, rint(r, 1, 4));
  const total = w5 + w4 + w3 + w2 + w1;
  return [
    { stars: 5, pct: Math.round((w5 / total) * 100) },
    { stars: 4, pct: Math.round((w4 / total) * 100) },
    { stars: 3, pct: Math.round((w3 / total) * 100) },
    { stars: 2, pct: Math.round((w2 / total) * 100) },
    { stars: 1, pct: Math.max(1, 100 - Math.round((w5 / total) * 100) - Math.round((w4 / total) * 100) - Math.round((w3 / total) * 100) - Math.round((w2 / total) * 100)) },
  ];
}

function makeHours(r: RNG): HoursEntry[] {
  const pattern = rint(r, 0, 2);
  return Array.from({ length: 7 }, (_, d) => {
    if (pattern === 0 && d === 6) return { day: d, open: null, close: null };
    if (pattern === 1 && d === 0) return { day: d, open: null, close: null };
    const open = pick(r, [9, 9.5, 10, 10.5, 11]);
    const close = pattern === 2 && (d === 5 || d === 6) ? 22 : pick(r, [20, 20.5, 21, 21.5]);
    return { day: d, open, close };
  });
}

export function generateShops(query: string, city: City): { shops: Shop[]; preset: { areas: string[] } } {
  const seed = hashSeed(query + "|" + city.id);
  const r = rng(seed);
  const count = rint(r, 24, 42);
  const presetAreas = Array.from(new Set(Array.from({ length: 6 }, () => pick(r, city.areas)))).slice(0, 6);
  const shops: Shop[] = [];

  for (let i = 0; i < count; i++) {
    const branded = r() < 0.34;
    const brand = branded ? pick(r, BRAND) : null;
    const name = branded
      ? `${brand} — ${pick(r, city.areas)}`
      : `${pick(r, PREFIX)} ${pick(r, KIND)}${pick(r, SUFFIX)}`;
    const area = pick(r, presetAreas);
    const streetNo = rint(r, 1, 220);
    const street = pick(r, STREETS);
    const rating = Math.round(rf(r, 3.3, 5) * 10) / 10;
    const reviews = Math.round(Math.pow(r(), 2.2) * 1400) + 4;
    const tagSet = new Set<Tag>(pick(r, TAG_POOL));
    if (branded && brand && ["Forest Essentials", "Kama Ayurveda"].includes(brand)) tagSet.add("Ayurvedic");

    shops.push({
      id: `${city.id}-${seed}-${i}`,
      name,
      brand: brand ?? undefined,
      area,
      address: `Shop ${rint(r, 1, 30)}, ${streetNo} ${street}, ${area}`,
      plus: `${rint(r, 10, 99)}${String.fromCharCode(65 + rint(r, 0, 25))}${String.fromCharCode(65 + rint(r, 0, 25))}+${rint(r, 10, 99)} ${city.name}`,
      phone: makePhone(r, city),
      website: r() < 0.68 ? `${brand ? slug(brand) : slug(name)}.in` : null,
      hours: makeHours(r),
      rating,
      reviews,
      breakdown: makeBreakdown(r, rating),
      tags: [...tagSet].slice(0, 3),
      womenOwned: r() < 0.22,
      claimed: r() < 0.78,
      x: rf(r, 7, 93),
      y: rf(r, 10, 90),
      source: "demo",
    });
  }
  return { shops, preset: { areas: presetAreas } };
}
