import { Shop, SOURCE_LABEL, hoursLabel } from "./data";

const esc = (v: string | number | boolean | null | undefined): string => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCSV(shops: Shop[]): string {
  const head = [
    "Source", "Name", "Brand", "Phone", "Website", "Rating", "Reviews",
    "Address", "Coordinates / Plus", "Area", "Hours", "Tags", "Women-owned",
  ];
  const lines = shops.map((s) =>
    [
      SOURCE_LABEL[s.source],
      s.name, s.brand ?? "", s.phone ?? "", s.website ?? "",
      s.rating ?? "", s.reviews || "",
      s.address, s.plus, s.area,
      s.hoursRaw ?? hoursLabel(s),
      s.tags.join(" | "), s.womenOwned ? "yes" : "",
    ]
      .map(esc)
      .join(",")
  );
  return [head.join(","), ...lines].join("\n");
}

export function toJSON(shops: Shop[]): string {
  return JSON.stringify(
    shops.map((s) => ({
      source: s.source,
      name: s.name,
      brand: s.brand ?? null,
      phone: s.phone,
      website: s.website,
      rating: s.rating,
      reviews: s.reviews,
      address: s.address,
      coordinates: s.plus,
      area: s.area,
      hours: s.hoursRaw ?? null,
      tags: s.tags,
      women_owned: s.womenOwned,
    })),
    null,
    2
  );
}

export function detailsText(s: Shop): string {
  const lines = [
    s.name,
    s.phone ? `Phone: ${s.phone}` : "Phone: not listed",
    `Address: ${s.address}`,
  ];
  if (s.rating != null) lines.push(`Rating: ${s.rating.toFixed(1)} ★ (${s.reviews.toLocaleString()} reviews)`);
  if (s.website) lines.push(`Website: ${s.website}`);
  lines.push(`Hours: ${s.hoursRaw ?? hoursLabel(s)}`);
  if (s.tags.length) lines.push(`Tags: ${s.tags.join(", ")}`);
  if (s.osmUrl) lines.push(`OSM: ${s.osmUrl}`);
  return lines.join("\n");
}

export function download(filename: string, content: string, mime: string): void {
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

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}
