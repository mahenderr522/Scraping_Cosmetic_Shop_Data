import { useEffect } from "react";
import { Shop, isOpenNow, hoursLabel, mapsUrl } from "../lib/data";
import { shopAsText } from "../lib/export";
import { Stars, Tag } from "./ui";
import { IconX, IconPhone, IconCopy, IconGlobe, IconExternal, IconPin, IconClock, IconBadge, IconSpark, IconCamera, IconCheck } from "./icons";

interface Props {
  shop: Shop;
  onClose: () => void;
  onCopy: (text: string, msg: string) => void;
  copied: string | null;
}

export default function Drawer({ shop: s, onClose, onCopy, copied }: Props) {
  const open = isOpenNow(s);
  const today = (new Date().getDay() + 6) % 7;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const field = (label: string, value: React.ReactNode, mono = false) => (
    <div className="rounded-lg border border-line-soft bg-pine-950/50 px-3.5 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">{label}</p>
      <div className={`mt-1 text-[13.5px] text-ink ${mono ? "font-mono" : "font-medium"}`}>{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="fade-in absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="drawer-in nice-scroll absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-line bg-pine-900 shadow-2xl shadow-black/60">
        {/* header */}
        <div className="sticky top-0 z-10 border-b border-line-soft bg-pine-900/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mint">captured listing · {s.plusCode}</p>
              <h2 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">{s.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {s.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                {s.claimed && <Tag tone="sky"><IconBadge size={11} />&nbsp;claimed</Tag>}
                {s.womenOwned && <Tag tone="rose">women-owned</Tag>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-line p-2 text-mute transition-all hover:rotate-90 hover:border-rose/50 hover:text-rose"
              aria-label="Close details"
            >
              <IconX size={15} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* rating block */}
          <div className="flex items-center gap-4 rounded-xl border border-amber/25 bg-amber/[0.06] px-4 py-3.5">
            <p className="font-display text-[38px] font-bold leading-none text-amber">{s.rating.toFixed(1)}</p>
            <div>
              <Stars rating={s.rating} size={15} />
              <p className="mt-1 font-mono text-[11.5px] text-mute">{s.reviews.toLocaleString()} Google reviews · {s.currency.repeat(s.priceLevel)} price level</p>
            </div>
          </div>

          {/* phone hero */}
          <div className={`rounded-xl border px-4 py-4 ${s.phone ? "border-rose/35 bg-rose/[0.07]" : "border-line-soft bg-pine-950/50"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">phone number</p>
                {s.phone ? (
                  <p className="mt-1 font-mono text-[19px] font-semibold tracking-wide text-ink">{s.phone}</p>
                ) : (
                  <p className="mt-1 text-[14px] italic text-mute">Not listed on the map profile</p>
                )}
              </div>
              {s.phone && (
                <button
                  onClick={() => onCopy(s.phone!, "Phone number copied")}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5 active:scale-95 ${
                    copied === s.phone
                      ? "border-mint/60 bg-mint/15 text-mint"
                      : "border-rose/50 bg-rose/15 text-rose hover:bg-rose/25"
                  }`}
                >
                  {copied === s.phone ? <IconCheck size={14} /> : <IconPhone size={14} />}
                  {copied === s.phone ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          </div>

          {/* quick fields */}
          <div className="grid grid-cols-2 gap-2.5">
            {field("status", (
              <span className={`flex items-center gap-1.5 font-semibold ${open ? "text-mint" : "text-dim"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-mint pulse-dot" : "bg-dim"}`} />
                {open ? "Open now" : "Closed now"}
              </span>
            ))}
            {field("price level", <span>{s.currency.repeat(s.priceLevel)}<span className="text-dim"> / {s.currency.repeat(4)}</span></span>)}
            {field("photos", <span className="flex items-center gap-1.5"><IconCamera size={13} className="text-sky" />{s.photos} photos</span>)}
            {field("website", s.website ? (
              <a href={`https://${s.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 break-all text-sky hover:underline">
                <IconGlobe size={13} /> {s.website}
              </a>
            ) : <span className="text-dim">—</span>)}
          </div>

          {field("address", (
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-start gap-1.5"><IconPin size={14} className="mt-0.5 shrink-0 text-rose" />{s.address}</span>
              <button onClick={() => onCopy(s.address, "Address copied")} className="shrink-0 text-dim transition-colors hover:text-mint" aria-label="Copy address">
                <IconCopy size={14} />
              </button>
            </div>
          ))}

          {/* hours */}
          <div className="rounded-lg border border-line-soft bg-pine-950/50 px-4 py-3.5">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
              <IconClock size={12} /> weekly hours · {hoursLabel(s)}
            </p>
            <div className="mt-2.5 space-y-1">
              {s.hours.map((h, i) => (
                <div key={h.day} className={`flex items-center justify-between rounded px-2 py-1 font-mono text-[12px] ${i === today ? "bg-mint/10 text-mint" : "text-mute"}`}>
                  <span className="flex items-center gap-2">
                    {h.day}
                    {i === today && <span className="rounded bg-mint/20 px-1 text-[9px] font-semibold uppercase">today</span>}
                  </span>
                  <span className={h.closed ? "italic text-dim" : ""}>{h.closed ? "Closed" : `${h.open} – ${h.close}`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* rating breakdown */}
          <div className="rounded-lg border border-line-soft bg-pine-950/50 px-4 py-3.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">review breakdown</p>
            <div className="mt-2.5 space-y-1.5">
              {s.breakdown.map((pct, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="w-6 font-mono text-[11px] text-mute">{5 - i}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-pine-850">
                    <div className="bar-grow h-full rounded-full bg-amber/80" style={{ width: `${pct}%`, animationDelay: `${i * 90}ms` }} />
                  </div>
                  <span className="w-9 text-right font-mono text-[11px] text-dim">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* actions */}
          <div className="grid grid-cols-2 gap-2.5 pb-2">
            <a
              href={mapsUrl(s)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-rose px-4 py-3 font-display text-[14px] font-semibold text-pine-950 shadow-lg shadow-rose/20 transition-all hover:-translate-y-0.5 hover:bg-rose-deep hover:text-ink active:scale-95"
            >
              <IconExternal size={15} /> Open in Maps
            </a>
            <button
              onClick={() => onCopy(shopAsText(s), "Full details copied as text")}
              className="flex items-center justify-center gap-2 rounded-lg border border-mint/50 bg-mint/10 px-4 py-3 font-display text-[14px] font-semibold text-mint transition-all hover:-translate-y-0.5 hover:bg-mint/20 active:scale-95"
            >
              <IconCopy size={15} /> Copy all details
            </button>
          </div>

          <p className="flex items-center gap-2 pb-4 font-mono text-[10.5px] leading-relaxed text-dim">
            <IconSpark size={12} className="shrink-0 text-amber" />
            Synthetic demo record — deep link opens a live Google Maps search for this shop.
          </p>
        </div>
      </aside>
    </div>
  );
}
