import { Shop, isOpenNow, hoursLabel } from "./data";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

const esc = (v: string | number | boolean | null | undefined): string => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCSV(shops: Shop[], city: string) {
  const head = ["name", "phone", "website", "address", "area", "city", "rating", "reviews", "price_level", "open_now", "hours", "tags", "claimed", "women_owned", "photos", "plus_code"];
  const rows = shops.map((s) =>
    [
      s.name, s.phone, s.website, s.address, s.area, s.city, s.rating, s.reviews,
      s.currency.repeat(s.priceLevel), isOpenNow(s), hoursLabel(s), s.tags.join(" | "),
      s.claimed ? "yes" : "no", s.womenOwned ? "yes" : "no", s.photos, s.plusCode,
    ].map(esc).join(",")
  );
  download(`glowscout_cosmetics_${city.toLowerCase().replace(/\s+/g, "-")}.csv`, [head.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
}

export function exportJSON(shops: Shop[], city: string) {
  const payload = {
    source: "glowscout-synth-demo",
    query: "cosmetics shop",
    city,
    exported_at: new Date().toISOString(),
    count: shops.length,
    shops: shops.map((s) => ({
      name: s.name, phone: s.phone, website: s.website, address: s.address,
      rating: s.rating, reviews: s.reviews, price_level: s.priceLevel,
      open_now: isOpenNow(s), hours: hoursLabel(s), tags: s.tags,
      claimed: s.claimed, women_owned: s.womenOwned, photos: s.photos,
    })),
  };
  download(`glowscout_cosmetics_${city.toLowerCase().replace(/\s+/g, "-")}.json`, JSON.stringify(payload, null, 2), "application/json");
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function shopAsText(s: Shop): string {
  return [
    s.name,
    s.phone ? `Phone: ${s.phone}` : "Phone: not listed",
    `Address: ${s.address}`,
    s.website ? `Web: ${s.website}` : null,
    `Rating: ${s.rating}★ (${s.reviews} reviews) · ${s.currency.repeat(s.priceLevel)}`,
    `Hours: ${hoursLabel(s)}${isOpenNow(s) ? " · Open now" : " · Closed now"}`,
    `Tags: ${s.tags.join(", ")}`,
  ].filter(Boolean).join("\n");
}

export function phonesList(shops: Shop[]): string {
  return shops.filter((s) => s.phone).map((s) => `${s.name}\t${s.phone}`).join("\n");
}
