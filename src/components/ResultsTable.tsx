import { useMemo } from "react";
import { Shop, type Tag as TagT, isOpenNow, hoursLabel, mapsUrl, ALL_TAGS } from "../lib/data";
import { copyText } from "../lib/export";
import { Stars, Tag } from "./ui";
import {
  IconPhone, IconCopy, IconCheck, IconGlobe, IconExternal, IconFilter,
  IconChevronL, IconChevronR, IconDownload, IconPin, IconX, IconBadge, IconSearch,
} from "./icons";

export interface Filters {
  text: string;
  minRating: number;
  openNow: boolean;
  hasPhone: boolean;
  hasWeb: boolean;
  tag: string | null;
}

export type SortKey = "name" | "rating" | "reviews";
export interface Sort {
  key: SortKey;
  dir: 1 | -1;
}

const PAGE_SIZE = 8;

interface Props {
  shops: Shop[];
  running: boolean;
  filters: Filters;
  onFilters: (f: Filters) => void;
  sort: Sort;
  onSort: (s: Sort) => void;
  page: number;
  onPage: (p: number) => void;
  checked: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onCopy: (text: string, msg: string) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
}

export default function ResultsTable(p: Props) {
  const f = p.filters;

  const filtered = useMemo(() => {
    const q = f.text.trim().toLowerCase();
    let list = p.shops.filter((s) => {
      if (q && !`${s.name} ${s.area} ${s.address}`.toLowerCase().includes(q)) return false;
      if ((s.rating ?? -1) < f.minRating) return false;
      if (f.openNow && !isOpenNow(s)) return false;
      if (f.hasPhone && !s.phone) return false;
      if (f.hasWeb && !s.website) return false;
      if (f.tag && !s.tags.includes(f.tag as TagT)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (p.sort.key === "name") return a.name.localeCompare(b.name) * p.sort.dir;
      return ((a[p.sort.key] ?? -1) - (b[p.sort.key] ?? -1)) * p.sort.dir;
    });
    return list;
  }, [p.shops, f, p.sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(p.page, pages);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const phones = filtered.filter((s) => s.phone).length;
  const hasActiveFilters = f.text || f.minRating > 0 || f.openNow || f.hasPhone || f.hasWeb || f.tag;

  const sortBtn = (key: SortKey, label: string) => (
    <button
      onClick={() => p.onSort({ key, dir: p.sort.key === key ? ((p.sort.dir * -1) as 1 | -1) : -1 })}
      className={`flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors hover:text-ink ${
        p.sort.key === key ? "text-rose" : "text-dim"
      }`}
    >
      {label}
      <span className="text-[9px]">{p.sort.key === key ? (p.sort.dir === -1 ? "▼" : "▲") : "↕"}</span>
    </button>
  );

  const togglePill = (on: boolean, set: (v: boolean) => void, label: string, tone = "mint") => (
    <button
      onClick={() => set(!on)}
      className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all hover:-translate-y-0.5 active:scale-95 ${
        on
          ? tone === "rose"
            ? "border-rose/60 bg-rose/15 text-rose"
            : "border-mint/60 bg-mint/15 text-mint"
          : "border-line bg-pine-850/60 text-mute hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-pine-900/80">
      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <span className="mr-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
          <IconFilter size={13} className="text-amber" /> filter
        </span>
        <label className="flex items-center gap-2 rounded-lg border border-line bg-pine-950/70 px-3 py-1.5 focus-within:border-mint/50">
          <IconSearch size={13} className="text-dim" />
          <input
            value={f.text}
            onChange={(e) => { p.onFilters({ ...f, text: e.target.value }); p.onPage(1); }}
            placeholder="Search results…"
            className="w-32 bg-transparent text-[13px] text-ink outline-none placeholder:text-dim sm:w-40"
          />
        </label>
        <select
          value={f.minRating}
          onChange={(e) => { p.onFilters({ ...f, minRating: Number(e.target.value) }); p.onPage(1); }}
          className="cursor-pointer rounded-lg border border-line bg-pine-950/70 px-2.5 py-1.5 text-[12.5px] font-medium text-ink outline-none transition-colors hover:border-amber/50 focus:border-amber/60"
        >
          <option value={0}>Any rating</option>
          <option value={3.5}>3.5★ +</option>
          <option value={4}>4.0★ +</option>
          <option value={4.5}>4.5★ +</option>
        </select>
        {togglePill(f.openNow, (v) => p.onFilters({ ...f, openNow: v }), "Open now")}
        {togglePill(f.hasPhone, (v) => p.onFilters({ ...f, hasPhone: v }), "Has phone", "rose")}
        {togglePill(f.hasWeb, (v) => p.onFilters({ ...f, hasWeb: v }), "Has website")}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={p.onExportCSV}
            disabled={!filtered.length}
            className="flex items-center gap-1.5 rounded-lg border border-mint/40 bg-mint/10 px-3 py-1.5 text-[12.5px] font-semibold text-mint transition-all hover:-translate-y-0.5 hover:bg-mint/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconDownload size={13} /> CSV
          </button>
          <button
            onClick={p.onExportJSON}
            disabled={!filtered.length}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-pine-850/70 px-3 py-1.5 text-[12.5px] font-semibold text-mute transition-all hover:-translate-y-0.5 hover:border-sky/40 hover:text-sky active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconDownload size={13} /> JSON
          </button>
        </div>
      </div>

      {/* tag chips row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-dim">tags:</span>
        {ALL_TAGS.map((t) => {
          const on = f.tag === t;
          return (
            <button
              key={t}
              onClick={() => { p.onFilters({ ...f, tag: on ? null : t }); p.onPage(1); }}
              className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition-all hover:-translate-y-0.5 ${
                on ? "border-amber/60 bg-amber/15 text-amber" : "border-line text-dim hover:border-amber/40 hover:text-mute"
              }`}
            >
              {t}
            </button>
          );
        })}
        <span className="ml-auto font-mono text-[11px] text-dim">
          <span className="text-mint font-semibold">{filtered.length}</span> listings ·{" "}
          <span className="text-rose font-semibold">{phones}</span> phones
        </span>
      </div>

      {/* table */}
      <div className="nice-scroll overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line-soft bg-pine-850/50">
              <th className="w-11 px-4 py-3">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((r) => p.checked.has(r.id))}
                  onChange={() => p.onToggleAll(rows.map((r) => r.id))}
                  className="h-3.5 w-3.5 cursor-pointer accent-[#f27398]"
                  aria-label="Select page"
                />
              </th>
              <th className="px-3 py-3">{sortBtn("name", "shop")}</th>
              <th className="px-3 py-3">{sortBtn("rating", "rating")}</th>
              <th className="px-3 py-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-dim">phone</th>
              <th className="px-3 py-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-dim">location</th>
              <th className="px-3 py-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-dim">status</th>
              <th className="w-24 px-4 py-3 text-right font-mono text-[10.5px] uppercase tracking-[0.16em] text-dim">actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const open = isOpenNow(s);
              const hot = s.id === p.hoveredId;
              return (
                <tr
                  key={s.id}
                  className="row-in group cursor-pointer border-b border-line-soft/70 transition-colors last:border-0 hover:bg-pine-850/70"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onMouseEnter={() => p.onHover(s.id)}
                  onMouseLeave={() => p.onHover(null)}
                  onClick={() => p.onSelect(s.id)}
                >
                  <td className={`px-4 py-3.5 transition-shadow ${hot ? "shadow-[inset_3px_0_0_var(--color-rose)]" : ""}`} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={p.checked.has(s.id)}
                      onChange={() => p.onToggle(s.id)}
                      className="h-3.5 w-3.5 cursor-pointer accent-[#f27398]"
                      aria-label={`Select ${s.name}`}
                    />
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-[14.5px] font-semibold text-ink transition-colors group-hover:text-rose">{s.name}</p>
                      {s.claimed && <IconBadge size={14} className="shrink-0 text-mint/80" />}
                      {s.womenOwned && <Tag tone="rose">women-owned</Tag>}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {s.tags.map((t) => (
                        <span key={t} className="font-mono text-[10px] uppercase tracking-wider text-dim">#{t.toLowerCase()}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    {s.rating != null ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13.5px] font-semibold text-amber">{s.rating.toFixed(1)}</span>
                          <Stars rating={s.rating} />
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-dim">{s.reviews.toLocaleString()} reviews</p>
                      </>
                    ) : (
                      <span className="font-mono text-[11.5px] italic text-dim">no public rating</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                    {s.phone ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${s.phone.replace(/[^+\d]/g, "")}`}
                          className="font-mono text-[12.5px] text-ink/90 underline decoration-transparent underline-offset-4 transition-colors hover:text-mint hover:decoration-mint/50"
                          title="Dial this number"
                        >
                          {s.phone}
                        </a>
                        <button
                          onClick={() => p.onCopy(s.phone!, `${s.name} — phone copied`)}
                          className="rounded-md border border-transparent p-1.5 text-dim opacity-0 transition-all hover:border-mint/40 hover:bg-mint/10 hover:text-mint group-hover:opacity-100 focus:opacity-100"
                          aria-label="Copy phone"
                        >
                          <IconCopy size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-[11.5px] italic text-dim">not listed</span>
                    )}
                  </td>
                  <td className="max-w-[220px] px-3 py-3.5">
                    <p className="truncate text-[13px] text-mute">{s.address}</p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-dim">{s.plus}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        open ? "border-mint/40 bg-mint/10 text-mint" : "border-line bg-pine-850 text-dim"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-mint pulse-dot" : "bg-dim"}`} />
                      {open ? "Open" : "Closed"}
                    </span>
                    <p className="mt-1 font-mono text-[10.5px] text-dim">{hoursLabel(s)}</p>
                  </td>
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => p.onSelect(s.id)}
                        className="rounded-md border border-line p-1.5 text-dim transition-all hover:border-rose/50 hover:bg-rose/10 hover:text-rose"
                        aria-label="View details"
                        title="Full details"
                      >
                        <IconPin size={13} />
                      </button>
                      {s.website ? (
                        <a
                          href={`https://${s.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-line p-1.5 text-dim transition-all hover:border-sky/50 hover:bg-sky/10 hover:text-sky"
                          title={s.website}
                        >
                          <IconGlobe size={13} />
                        </a>
                      ) : (
                        <span className="p-1.5 text-line" title="No website"><IconGlobe size={13} /></span>
                      )}
                      <a
                        href={mapsUrl(s)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-line p-1.5 text-dim transition-all hover:border-mint/50 hover:bg-mint/10 hover:text-mint"
                        title="Open in Google Maps"
                      >
                        <IconExternal size={13} />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* empty / waiting states */}
        {rows.length === 0 && (
          <div className="grid place-items-center px-6 py-16 text-center">
            {p.shops.length === 0 ? (
              <>
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-xl border border-line bg-pine-850 text-dim">
                  {p.running ? <span className="spin-slow inline-block"><IconFilter size={22} /></span> : <IconPin size={24} />}
                </div>
                <p className="font-display text-lg font-semibold text-ink">
                  {p.running ? "Waiting for first captures…" : "No listings captured yet"}
                </p>
                <p className="mt-1.5 max-w-sm text-[13.5px] text-mute">
                  {p.running
                    ? "The engine is resolving the search — rows will stream in below as places are captured."
                    : "Set a target city above and press Start extraction to pull cosmetics shops from the map."}
                </p>
              </>
            ) : (
              <>
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-xl border border-line bg-pine-850 text-amber">
                  <IconX size={22} />
                </div>
                <p className="font-display text-lg font-semibold text-ink">No matches for this filter set</p>
                <p className="mt-1.5 text-[13.5px] text-mute">Loosen the rating floor or clear a toggle.</p>
                {hasActiveFilters && (
                  <button
                    onClick={() => { p.onFilters({ text: "", minRating: 0, openNow: false, hasPhone: false, hasWeb: false, tag: null }); p.onPage(1); }}
                    className="mt-4 rounded-lg border border-rose/50 bg-rose/10 px-4 py-2 text-[13px] font-semibold text-rose transition-all hover:-translate-y-0.5 hover:bg-rose/20"
                  >
                    Clear all filters
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-line-soft px-4 py-3">
          <p className="font-mono text-[11px] text-dim">
            showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => p.onPage(page - 1)}
              disabled={page === 1}
              className="rounded-md border border-line p-1.5 text-mute transition-all hover:border-rose/50 hover:text-rose disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous page"
            >
              <IconChevronL size={14} />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 6).map((n) => (
              <button
                key={n}
                onClick={() => p.onPage(n)}
                className={`h-7 min-w-7 rounded-md border px-1 font-mono text-[12px] transition-all ${
                  n === page ? "border-rose/60 bg-rose/15 font-semibold text-rose" : "border-line text-dim hover:border-line hover:text-mute"
                }`}
              >
                {n}
              </button>
            ))}
            {pages > 6 && <span className="px-1 font-mono text-[12px] text-dim">… {pages}</span>}
            <button
              onClick={() => p.onPage(page + 1)}
              disabled={page === pages}
              className="rounded-md border border-line p-1.5 text-mute transition-all hover:border-rose/50 hover:text-rose disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next page"
            >
              <IconChevronR size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
