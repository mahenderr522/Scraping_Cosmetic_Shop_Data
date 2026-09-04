import { Rng, rng, hashSeed, int, pick, chance, round1, pickWeighted } from "./rand";

export interface DayHours {
  day: string;
  open: string | null;
  close: string | null;
  closed: boolean;
}

export interface Shop {
  id: string;
  name: string;
  tags: string[];
  address: string;
  area: string;
  city: string;
  phone: string | null;
  website: string | null;
  rating: number;
  reviews: number;
  priceLevel: number; // 1..4
  currency: string;
  hours: DayHours[];
  openH: number;
  closeH: number;
  alwaysOpen: boolean;
  sundayClosed: boolean;
  lat: number;
  lng: number;
  x: number; // normalized 0..1 map position
  y: number;
  photos: number;
  claimed: boolean;
  womenOwned: boolean;
  plusCode: string;
  breakdown: number[]; // % of 5★..1★
  capturedAt: number; // ms offset — used for stagger
}

export interface CityPreset {
  name: string;
  country: string;
  phoneCode: string;
  currency: string;
  areas: string[];
  streets: string[];
}

export const CITY_PRESETS: Record<string, CityPreset> = {
  mumbai: {
    name: "Mumbai", country: "India", phoneCode: "+91", currency: "₹",
    areas: ["Bandra West", "Andheri East", "Powai", "Colaba", "Juhu", "Dadar", "Lower Parel", "Malad"],
    streets: ["Hill Road", "Linking Road", "SV Road", "Turner Road", "FC Road", "MG Road"],
  },
  delhi: {
    name: "Delhi", country: "India", phoneCode: "+91", currency: "₹",
    areas: ["Khan Market", "Hauz Khas", "Lajpat Nagar", "Saket", "Rajouri Garden", "Vasant Kunj"],
    streets: ["Defence Colony Rd", "Aurobindo Marg", "Outer Colony", "Najafgarh Rd"],
  },
  bengaluru: {
    name: "Bengaluru", country: "India", phoneCode: "+91", currency: "₹",
    areas: ["Indiranagar", "Koramangala", "Jayanagar", "Whitefield", "HSR Layout", "Malleshwaram"],
    streets: ["100 Ft Road", "12th Main", "CMH Road", "Sarjapur Rd"],
  },
  dubai: {
    name: "Dubai", country: "UAE", phoneCode: "+971", currency: "AED",
    areas: ["Deira", "Jumeirah", "Dubai Marina", "Al Barsha", "Karama", "JLT"],
    streets: ["Al Wasl Rd", "Sheikh Zayed Rd", "Al Dhiyafa Rd", "Jumeirah Rd"],
  },
  london: {
    name: "London", country: "UK", phoneCode: "+44", currency: "£",
    areas: ["Soho", "Camden", "Shoreditch", "Notting Hill", "Brixton", "Islington"],
    streets: ["Old Compton St", "Camden High St", "Rivington St", "Westbourne Grove"],
  },
  "new york": {
    name: "New York", country: "USA", phoneCode: "+1", currency: "$",
    areas: ["SoHo", "Midtown", "Williamsburg", "Upper West Side", "East Village", "Astoria"],
    streets: ["Broadway", "Bedford Ave", "Columbus Ave", "St Marks Pl"],
  },
  toronto: {
    name: "Toronto", country: "Canada", phoneCode: "+1", currency: "$",
    areas: ["Queen West", "Yorkville", "Kensington", "The Beaches", "Roncesvalles"],
    streets: ["Queen St W", "Bloor St", "Ossington Ave", "Spadina Ave"],
  },
  singapore: {
    name: "Singapore", country: "Singapore", phoneCode: "+65", currency: "S$",
    areas: ["Orchard", "Bugis", "Tanjong Pagar", "Katong", "Holland Village"],
    streets: ["Orchard Rd", "Haji Lane", "Amoy St", "East Coast Rd"],
  },
};

const GENERIC_PRESET: CityPreset = {
  name: "", country: "", phoneCode: "+1", currency: "$",
  areas: ["Old Town", "Riverside", "Market District", "Garden Quarter", "Station Side", "Midtown"],
  streets: ["Main Street", "Park Avenue", "Church Lane", "High Street"],
};

export const SUGGESTED_CITIES = ["Mumbai", "Delhi", "Bengaluru", "Dubai", "London", "New York"];

const NAME_A = [
  "Glow", "Velvet", "Blush", "Petal", "Lumen", "Opal", "Ruby", "Ivory", "Saffron", "Mira",
  "Lotus", "Aura", "Kohl", "Nectar", "Silk", "Dewy", "Prism", "Henna", "Coco", "Fleur",
];
const NAME_B = [
  "Beauty Bar", "Cosmetics", "Makeup Studio", "Skin & Beauty", "Beauty Supply",
  "Cosmetic Boutique", "Glam Lounge", "Beauty Co.", "Skin Studio", "The Vanity",
  "Beauty Loft", "Cosmetic House", "Glow Lab", "Beauty Atelier",
];
const NAME_PATTERNS = [
  (r: Rng, a: string, b: string) => `${a} ${b}`,
  (r: Rng, a: string, b: string) => `${a} & Co. ${b}`,
  (r: Rng, a: string, b: string) => `The ${a} ${b}`,
  (r: Rng, a: string, b: string) => `${a}${pick(r, ["'", "’"])}s ${b}`,
  (r: Rng, a: string, b: string) => `${a} ${b} · ${pick(r, NAME_A)} Lane`,
];

export const ALL_TAGS = ["Makeup", "Skincare", "Fragrance", "K-Beauty", "Organic", "Hair", "Nails", "Bridal"];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "").slice(0, 18);
}

function makePhone(r: Rng, code: string): string {
  if (code === "+91") return `+91 9${int(r, 6, 9)}${int(r, 100, 999)} ${int(r, 100, 999)}${int(r, 0, 9)}`;
  if (code === "+971") return `+971 5${int(r, 0, 9)} ${int(r, 100, 999)} ${int(r, 1000, 9999)}`;
  if (code === "+44") return `+44 20 ${int(r, 3000, 7999)} ${int(r, 1000, 9999)}`;
  if (code === "+65") return `+65 ${int(r, 8, 9)}${int(r, 100, 999)} ${int(r, 1000, 9999)}`;
  return `+1 (${int(r, 201, 989)}) ${int(r, 200, 999)}-${int(r, 1000, 9999)}`;
}

function fmtH(h: number, m = 0): string {
  const hh = ((h + Math.floor(m / 60)) % 24);
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${period}` : `${h12}:00 ${period}`;
}

export function isOpenNow(shop: Shop, now = new Date()): boolean {
  if (shop.alwaysOpen) return true;
  const day = (now.getDay() + 6) % 7; // Mon=0
  if (day === 6 && shop.sundayClosed) return false;
  const h = now.getHours() + now.getMinutes() / 60;
  return h >= shop.openH && h < shop.closeH;
}

export function hoursLabel(shop: Shop): string {
  if (shop.alwaysOpen) return "Open 24 hours";
  return `${fmtH(shop.openH)} – ${fmtH(shop.closeH)}`;
}

export function generateShops(query: string, cityRaw: string): { shops: Shop[]; preset: CityPreset } {
  const key = cityRaw.trim().toLowerCase();
  const presetBase = CITY_PRESETS[key] ?? null;
  const preset: CityPreset = presetBase
    ? presetBase
    : {
        ...GENERIC_PRESET,
        name: cityRaw.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
        country: "—",
      };

  const seed = hashSeed(`${query.trim().toLowerCase()}|${key}`);
  const r = rng(seed);
  const count = int(r, 24, 42);
  const usedNames = new Set<string>();
  const shops: Shop[] = [];
  const nAreas = preset.areas.length;

  for (let i = 0; i < count; i++) {
    let name = "";
    for (let tries = 0; tries < 12; tries++) {
      const a = pick(r, NAME_A);
      const b = pick(r, NAME_B);
      const cand = pick(r, NAME_PATTERNS)(r, a, b).trim();
      if (!usedNames.has(cand)) {
        name = cand;
        usedNames.add(cand);
        break;
      }
    }
    if (!name) name = `${pick(r, NAME_A)} ${pick(r, NAME_B)} ${i + 2}`;

    const area = pick(r, preset.areas);
    const tagCount = int(r, 1, 3);
    const tags: string[] = [];
    while (tags.length < tagCount) {
      const t = pickWeighted(r, ALL_TAGS);
      if (!tags.includes(t)) tags.push(t);
    }

    const rating = round1(Math.min(4.9, Math.max(3.2, 3.4 + r() * 1.7)));
    const reviews = Math.round(Math.pow(10, 1 + r() * 2.2));
    const openH = pick(r, [9, 10, 10, 10, 11]);
    const closeH = openH + pick(r, [9, 10, 10, 11, 11, 12]);
    const alwaysOpen = chance(r, 0.05);
    const sundayClosed = chance(r, 0.22);

    const hours: DayHours[] = DAY_NAMES.map((day, idx) => {
      if (alwaysOpen) return { day, open: "12:00 AM", close: "11:59 PM", closed: false };
      if (idx === 6 && sundayClosed) return { day, open: null, close: null, closed: true };
      const jitter = idx >= 4 ? int(r, 0, 60) : 0; // later close Fri/Sat
      return { day, open: fmtH(openH), close: fmtH(closeH + (idx >= 4 && closeH + 1 <= 23 ? 1 : 0), jitter ? 30 : 0), closed: false };
    });

    const x = 0.06 + r() * 0.88;
    const y = 0.06 + r() * 0.88;
    const hasPhone = !chance(r, 0.12);
    const hasSite = chance(r, 0.68);

    // 5★..1★ distribution skewed by rating
    const hi = Math.max(0.2, (rating - 3) / 2);
    const raw = [hi * (0.75 + r() * 0.4), 0.28 + r() * 0.3, 0.14 + r() * 0.2, 0.06 + r() * 0.1, 0.04 + r() * 0.08];
    const sum = raw.reduce((a, b) => a + b, 0);
    const breakdown = raw.map((v) => Math.round((v / sum) * 100));

    shops.push({
      id: `plc_${seed.toString(36)}_${i}`,
      name,
      tags,
      area,
      city: preset.name,
      address: `${int(r, 2, 148)}, ${pick(r, preset.streets)}, ${area}${nAreas ? `, ${preset.name}` : ""}`,
      phone: hasPhone ? makePhone(r, preset.phoneCode) : null,
      website: hasSite ? `www.${slugify(name)}${pick(r, [".com", ".in", ".co", ".store"])}` : null,
      rating,
      reviews,
      priceLevel: int(r, 1, 4),
      currency: preset.currency,
      hours,
      openH,
      closeH,
      alwaysOpen,
      sundayClosed,
      lat: round1(19 + (y - 0.5) * 0.4),
      lng: round1(72.8 + (x - 0.5) * 0.4),
      x,
      y,
      photos: int(r, 0, 220),
      claimed: chance(r, 0.82),
      womenOwned: chance(r, 0.3),
      plusCode: `${pick(r, ["7M", "8Q", "6P", "9R"])}${pick(r, ["4", "5", "6", "7"])}${pick(r, ["P", "Q", "R"])}+${pick(r, ["XQ", "HV", "JM", "KW"])} ${area}`,
      breakdown,
      capturedAt: 0,
    });
  }

  shops.sort((a, b) => b.reviews - a.reviews);
  return { shops, preset };
}

export function mapsUrl(shop: Shop): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name}, ${shop.area}, ${shop.city}`)}`;
}
