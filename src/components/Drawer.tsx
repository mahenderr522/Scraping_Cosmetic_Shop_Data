import { useEffect } from "react";
import { Shop, SOURCE_LABEL, mapsUrl, hoursLabel, isOpenNow } from "../lib/data";
import { detailsText } from "../lib/export";
import { Stars, Tag } from "./ui";
import {
  IconX, IconPhone, IconCopy, IconGlobe, IconExternal, IconPin, IconClock,
  IconStar, IconBadge, IconCheck,
} from "./icons";

interface Props {
  shop: Shop | null;
  onClose: () => void;
  onCopy: (text: string, msg: string) => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtH(h: number) {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm ? `${h12}:${String(mm).padStart(2, "0")} ${ampm}` : `${h12} ${ampm}`;
}

const SOURCE_TONE: Record<Shop["source"], string> = {
  demo: "border-line text-dim",
  osm: "border-mint/50 bg-mint/10 text-mint",
  google: "border-sky/50 bg-sky/10 text-sky",
};

export default function Drawer(p: Props) {
  const s = p.shop;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && p.onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p]);

  if (!s) return null;
  const open = isOpenNow(s);
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-pine-950/70 backdrop-blur-[2px] fade-in" onClick={p.onClose} />
      <aside className="drawer-in nice-scroll absolute right-0 top-0 h-full w-full max-w-[430px] overflow-y-auto border-l border-line bg-pine-900 shadow-2xl">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line-soft bg-pine-900/95 px-6 py-5 backdrop-blur">
          <div>
            <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-widest ${SOURCE_TONE[s.source]}`}>
              {SOURCE_LABEL[s.source]}
            </span>
            <h2 className="mt-2 font-display text-[21px] font-bold leading-tight tracking-tight">{s.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-mute">
              <IconPin size={12} className="text-rose" />
              {s.area} · {s.address}
            </p>
          </div>
          <button
            onClick={p.onClose}
            className="rounded-lg border border-line p-2 text-dim transition-all hover:border-rose/50 hover:text-rose active:scale-90"
            aria-label="Close details"
          >
            <IconX size={15} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* phone hero */}
          <div className="rounded-xl border border-mint/30 bg-mint/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mint/80">
              {s.source === "demo" ? "phone (demo)" : "phone · verified field"}
            </p>
            {s.phone ? (
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <p className="font-mono text-[20px] font-semibold tracking-tight text-ink">{s.phone}</p>
                <button
                  onClick={() => p.onCopy(s.phone!, "Phone number copied")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-mint/50 bg-mint/10 px-3 py-2 text-[12.5px] font-semibold text-mint transition-all hover:-translate-y-0.5 hover:bg-mint/20 active:scale-95"
                >
                  <IconCopy size={13} /> Copy
                </button>
              </div>
            ) : (
              <p className="mt-1.5 text-[13.5px] italic text-dim">No phone number published for this listing.</p>
            )}
            {s.phone && s.source === "osm" && (
              <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-dim">
                Sourced from the OSM <code className="text-mint/70">phone / contact:mobile</code> tag — dial before visiting.
              </p>
            )}
          </div>

          {/* rating */}
          {s.rating != null ? (
            <div className="rounded-xl border border-line bg-pine-850/50 p-4">
              <div className="flex items-center gap-3">
                <p className="font-display text-[34px] font-bold leading-none text-amber">{s.rating.toFixed(1)}</p>
                <div>
                  <Stars rating={s.rating} size={15} />
                  <p className="mt-1 font-mono text-[11px] text-dim">{s.reviews.toLocaleString()} reviews</p>
                </div>
                <span className={`ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${open === false ? "border-line bg-pine-950 text-dim" : open ? "border-mint/40 bg-mint/10 text-mint" : "border-amber/40 bg-amber/10 text-amber"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${open === false ? "bg-dim" : open ? "bg-mint pulse-dot" : "bg-amber"}`} />
                  {open === false ? "Closed" : open ? "Open now" : "Hours n/a"}
                </span>
              </div>
              {s.breakdown && (
                <div className="mt-4 space-y-1.5">
                  {s.breakdown.map((b) => (
                    <div key={b.stars} className="flex items-center gap-2.5">
                      <span className="flex w-7 items-center gap-0.5 font-mono text-[11px] text-dim">{b.stars}<IconStar size={9} className="text-amber" /></span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pine-950">
                        <div className="bar-grow h-full rounded-full bg-gradient-to-r from-amber/70 to-amber" style={{ width: `${b.pct}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] text-mute tabular-nums">{b.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-pine-850/40 p-4">
              <IconStar size={18} className="text-dim" />
              <p className="text-[12.5px] leading-snug text-dim">
                No public rating — {s.source === "osm" ? "OpenStreetMap stores facts (phone, hours), not reviews." : "this listing has no published rating."}
              </p>
            </div>
          )}

          {/* hours */}
          <div className="rounded-xl border border-line bg-pine-850/50 p-4">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
              <IconClock size={12} className="text-amber" /> opening hours
            </p>
            {s.hoursRaw ? (
              <p className="mt-2.5 rounded-lg border border-line-soft bg-pine-950/70 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-ink/85">{s.hoursRaw}</p>
            ) : s.hours ? (
              <div className="mt-2.5 grid grid-cols-1 gap-1">
                {s.hours.map((h, i) => (
                  <div key={h.day} className={`flex items-center justify-between rounded-md px-2 py-1 ${i === todayIdx ? "bg-rose/10 text-ink" : "text-mute"}`}>
                    <span className={`text-[12.5px] ${i === todayIdx ? "font-semibold" : ""}`}>{DAY_NAMES[i]}{i === todayIdx && <span className="ml-1.5 font-mono text-[9px] uppercase text-rose">today</span>}</span>
                    <span className="font-mono text-[12px]">{h.open === null || h.close === null ? "closed" : `${fmtH(h.open)} – ${fmtH(h.close)}`}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2.5 text-[12.5px] italic text-dim">Hours not listed for this place.</p>
            )}
            {!s.hoursRaw && s.hours && (
              <p className="mt-2 font-mono text-[11px] text-dim">today: {hoursLabel(s)}</p>
            )}
          </div>

          {/* facts */}
          <div className="space-y-2.5">
            <FactRow label="address" value={`${s.address}, ${s.area}`} onCopy={p.onCopy} />
            <FactRow label={s.plus.includes("°") ? "coordinates" : "plus code"} value={s.plus} onCopy={p.onCopy} />
            {s.website && <FactRow label="website" value={s.website} onCopy={p.onCopy} />}
            {s.brand && <FactRow label="brand" value={s.brand} onCopy={p.onCopy} />}
          </div>

          {/* tags & badges */}
          <div className="flex flex-wrap items-center gap-2">
            {s.tags.map((t) => (
              <Tag key={t} tone="amber">{t}</Tag>
            ))}
            {s.womenOwned && <Tag tone="rose">women-owned</Tag>}
            {s.claimed && (
              <span className="flex items-center gap-1 font-mono text-[10.5px] text-dim">
                <IconBadge size={13} className="text-mint/80" /> claimed
              </span>
            )}
          </div>

          {/* actions */}
          <div className="grid gap-2 border-t border-line-soft pt-5">
            <a
              href={mapsUrl(s)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-rose px-4 py-2.5 font-display text-[13.5px] font-bold text-[#160a10] transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
            >
              <IconExternal size={14} /> Open in Google Maps
            </a>
            <div className="grid grid-cols-2 gap-2">
              {s.osmUrl && (
                <a
                  href={s.osmUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-mint/40 bg-mint/5 px-3 py-2.5 text-[12.5px] font-semibold text-mint transition-all hover:-translate-y-0.5 hover:bg-mint/15 active:scale-95"
                >
                  <IconGlobe size={13} /> View on OSM
                </a>
              )}
              <button
                onClick={() => p.onCopy(detailsText(s), "Full details copied")}
                className={`flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 text-[12.5px] font-semibold text-mute transition-all hover:-translate-y-0.5 hover:border-sky/40 hover:text-sky active:scale-95 ${s.osmUrl ? "" : "col-span-2"}`}
              >
                <IconCheck size={13} /> Copy all details
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function FactRow({ label, value, onCopy }: { label: string; value: string; onCopy: (t: string, m: string) => void }) {
  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-pine-850/40 px-3.5 py-2.5 transition-colors hover:border-line">
      <div className="min-w-0">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-dim">{label}</p>
        <p className="truncate text-[13px] font-medium text-ink/90">{value}</p>
      </div>
      <button
        onClick={() => onCopy(value, `${label[0].toUpperCase() + label.slice(1)} copied`)}
        className="shrink-0 rounded-md border border-transparent p-1.5 text-dim opacity-0 transition-all hover:border-mint/40 hover:bg-mint/10 hover:text-mint group-hover:opacity-100"
        aria-label={`Copy ${label}`}
      >
        <IconCopy size={13} />
      </button>
    </div>
  );
}
