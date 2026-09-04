import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Console, { RunStatus } from "./components/Console";
import StatsStrip from "./components/StatsStrip";
import ResultsTable, { Filters, Sort } from "./components/ResultsTable";
import MapPanel from "./components/MapPanel";
import Drawer from "./components/Drawer";
import { ToastStack, Toast, Reveal } from "./components/ui";
import { LogoMark, IconDownload, IconPhone, IconX, IconSpark, IconArrow, IconAlert } from "./components/icons";
import { Shop, CityPreset, isOpenNow, generateShops } from "./lib/data";
import { LogLine, LogKind, CancelToken, runExtraction } from "./lib/engine";
import { exportCSV, exportJSON, copyText, phonesList } from "./lib/export";

const DEFAULT_FILTERS: Filters = { text: "", minRating: 0, openNow: false, hasPhone: false, hasWeb: false, tag: null };

export default function App() {
  const [query, setQuery] = useState("cosmetics shop");
  const [city, setCity] = useState("Mumbai");
  const [cityError, setCityError] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [preset, setPreset] = useState<CityPreset | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<Sort>({ key: "reviews", dir: -1 });
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const tokenRef = useRef<CancelToken | null>(null);
  const logId = useRef(0);
  const didInit = useRef(false);

  /* ---------------- toasts ---------------- */
  const addToast = useCallback((kind: Toast["kind"], msg: string) => {
    const id = ++logId.current + 90000;
    setToasts((t) => [...t.slice(-3), { id, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  /* ---------------- copy helper ---------------- */
  const handleCopy = useCallback(async (text: string, msg: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(text);
      setTimeout(() => setCopied(null), 1600);
      addToast("copy", msg);
    } else {
      addToast("warn", "Clipboard unavailable in this browser");
    }
  }, [addToast]);

  /* ---------------- engine ---------------- */
  const run = useCallback(async (q: string, c: string) => {
    if (!c.trim()) {
      setCityError("Enter a target city — e.g. Mumbai");
      return;
    }
    setCityError(null);

    if (tokenRef.current) tokenRef.current.cancelled = true;
    const token: CancelToken = { cancelled: false };
    tokenRef.current = token;

    setStatus("running");
    setShops([]);
    setLogs([]);
    setProgress(0);
    setPhase("Booting engine");
    setChecked(new Set());
    setPage(1);
    setSelectedId(null);
    setPreset(generateShops(q || "cosmetics shop", c).preset);

    const pushLog = (kind: LogKind, msg: string) => {
      const time = new Date().toTimeString().slice(0, 8);
      setLogs((l) => [...l.slice(-60), { id: ++logId.current, time, kind, msg }]);
    };

    await runExtraction(q || "cosmetics shop", c, token, {
      onLog: pushLog,
      onBatch: (batch) => setShops((s) => [...s, ...batch]),
      onProgress: setProgress,
      onPhase: setPhase,
      onDone: (stats) => {
        setStatus("done");
        setElapsed(stats.elapsed);
        if (!stats.aborted) addToast("ok", `Extraction complete — ${stats.total} shops, ${stats.phones} phones`);
      },
    });
  }, [addToast]);

  const stop = useCallback(() => {
    if (tokenRef.current) tokenRef.current.cancelled = true;
  }, []);

  /* ---------------- auto demo run on first load ---------------- */
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const t = setTimeout(() => run("cosmetics shop", "Mumbai"), 700);
    return () => clearTimeout(t);
  }, [run]);

  useEffect(() => () => { if (tokenRef.current) tokenRef.current.cancelled = true; }, []);

  /* ---------------- derived ---------------- */
  const stats = useMemo(() => {
    const phones = shops.filter((s) => s.phone).length;
    const avg = shops.length ? shops.reduce((a, s) => a + s.rating, 0) / shops.length : 0;
    const open = shops.filter((s) => isOpenNow(s)).length;
    return { total: shops.length, phones, avgRating: avg, openNow: open };
  }, [shops]);

  const selectedShop = shops.find((s) => s.id === selectedId) ?? null;
  const checkedShops = shops.filter((s) => checked.has(s.id));

  const toggle = (id: string) =>
    setChecked((c) => {
      const n = new Set(c);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = (ids: string[]) =>
    setChecked((c) => {
      const all = ids.every((id) => c.has(id));
      const n = new Set(c);
      ids.forEach((id) => (all ? n.delete(id) : n.add(id)));
      return n;
    });

  const exportCheckedOrAll = (kind: "csv" | "json") => {
    const list = checkedShops.length ? checkedShops : shops;
    if (!list.length) return addToast("warn", "Nothing to export yet");
    kind === "csv" ? exportCSV(list, city) : exportJSON(list, city);
    addToast("export", `${kind.toUpperCase()} exported — ${list.length} listings${checkedShops.length ? " (selection)" : ""}`);
  };

  const copyPhones = async () => {
    const list = checkedShops.length ? checkedShops : shops;
    const txt = phonesList(list);
    if (!txt) return addToast("warn", "No phone numbers in the current set");
    await handleCopy(txt, `${txt.split("\n").length} phone numbers copied`);
  };

  return (
    <div className="min-h-screen font-body text-ink">
      {/* ambient layers */}
      <div className="scene-bg" />
      <div className="scene-grid" />
      <div className="scene-noise" />
      <div className="glow-drift" style={{ top: "-120px", right: "-100px", width: 380, height: 380, background: "var(--color-rose)" }} />
      <div className="glow-drift" style={{ bottom: "-140px", left: "-120px", width: 420, height: 420, background: "var(--color-mint)", animationDelay: "-9s" }} />

      {/* header */}
      <header className="sticky top-0 z-50 border-b border-line-soft bg-pine-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#console" className="group flex items-center gap-2.5">
            <span className="transition-transform group-hover:-rotate-6 group-hover:scale-110"><LogoMark size={30} /></span>
            <span className="font-display text-[19px] font-bold tracking-tight">
              Glow<span className="text-rose">Scout</span>
            </span>
            <span className="ml-1 hidden rounded border border-line bg-pine-850 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-widest text-dim sm:block">maps lead engine</span>
          </a>
          <nav className="hidden items-center gap-5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-mute md:flex">
            <a href="#console" className="transition-colors hover:text-rose">Console</a>
            <a href="#results" className="transition-colors hover:text-rose">Results</a>
            <a href="#map" className="transition-colors hover:text-rose">Map</a>
            <a href="#method" className="transition-colors hover:text-rose">Method</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <span className="hidden items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-amber sm:flex">
              <IconAlert size={11} /> demo data
            </span>
            <button
              onClick={() => exportCheckedOrAll("csv")}
              disabled={!shops.length}
              className="flex items-center gap-1.5 rounded-lg border border-mint/40 bg-mint/10 px-3 py-1.5 text-[12px] font-semibold text-mint transition-all hover:-translate-y-0.5 hover:bg-mint/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconDownload size={13} /> Export
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        {/* console opens the page */}
        <div className="pt-10 sm:pt-14">
          <Console
            query={query}
            city={city}
            status={status}
            logs={logs}
            progress={progress}
            phase={phase}
            cityError={cityError}
            onQuery={(v) => setQuery(v)}
            onCity={(v) => { setCity(v); setCityError(null); }}
            onRun={() => run(query, city)}
            onStop={stop}
          />
        </div>

        {/* stats */}
        <div className="mt-8">
          <StatsStrip {...stats} elapsed={elapsed} active={shops.length > 0} />
        </div>

        {/* results + map */}
        <section id="results" className="mt-8 scroll-mt-20">
          <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
            <div className="min-w-0">
              <ResultsTable
                shops={shops}
                running={status === "running"}
                filters={filters}
                onFilters={setFilters}
                sort={sort}
                onSort={setSort}
                page={page}
                onPage={setPage}
                checked={checked}
                onToggle={toggle}
                onToggleAll={toggleAll}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onSelect={setSelectedId}
                onCopy={handleCopy}
                onExportCSV={() => exportCheckedOrAll("csv")}
                onExportJSON={() => exportCheckedOrAll("json")}
              />
            </div>
            <div id="map" className="scroll-mt-20">
              <div className="xl:sticky xl:top-20">
                <MapPanel
                  shops={shops}
                  preset={preset}
                  running={status === "running"}
                  hoveredId={hoveredId}
                  selectedId={selectedId}
                  onHover={setHoveredId}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
          </div>
        </section>

        {/* method */}
        <section id="method" className="mt-20 scroll-mt-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <div className="lg:sticky lg:top-24">
                <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-mint">
                  <IconSpark size={13} /> how the pipeline works
                </p>
                <h2 className="font-display text-[clamp(1.6rem,3.2vw,2.5rem)] font-bold leading-[1.05] tracking-tight">
                  Built like a real scraper, running on a <span className="text-rose">safe demo source.</span>
                </h2>
                <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-mute">
                  This build streams a deterministic synthetic dataset shaped exactly like a Google
                  Maps local-search crawl — same fields, same pagination cadence, same failure
                  modes — so every control is fully functional without touching live scraping.
                </p>
                <div className="mt-6 rounded-xl border border-amber/35 bg-amber/[0.06] p-4">
                  <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-amber">
                    <IconAlert size={13} /> compliance note
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-mute">
                    Automated collection from Google Maps is governed by Google's Terms of Service
                    and local data-protection law. For production use, go through licensed data
                    providers or official APIs — and always respect rate limits.
                  </p>
                </div>
              </div>
            </Reveal>

            <div className="space-y-4">
              {[
                {
                  n: "01",
                  t: "Point it at a source",
                  d: "The engine is source-agnostic. In production, swap the synth adapter for a licensed provider endpoint (Outscraper, SerpAPI, or your own headless crawler) — the pipeline, logs and UI stay identical.",
                  chip: "runExtraction(query, city, token, hooks)",
                },
                {
                  n: "02",
                  t: "Extract & normalize",
                  d: "Each place is captured, deduplicated and normalized into a fixed schema — the exact fields a cosmetics retailer needs for outreach.",
                  chip: "name · phone · address · hours · website · rating · reviews · photos",
                },
                {
                  n: "03",
                  t: "Ship it to your CRM",
                  d: "Filter to shops that have a phone number and are open now, tick the keepers, then export CSV or JSON — or copy the whole phone list in one click and paste straight into your dialer.",
                  chip: "export CSV / JSON · copy phones · open in Google Maps",
                },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 110}>
                  <div className="group flex gap-5 rounded-xl border border-line bg-pine-900/70 p-5 transition-all hover:-translate-y-1 hover:border-rose/40 hover:shadow-xl hover:shadow-rose/[0.06] sm:p-6">
                    <span className="font-display text-[42px] font-bold leading-none text-line transition-colors group-hover:text-rose sm:text-[52px]">{s.n}</span>
                    <div className="min-w-0">
                      <h3 className="font-display text-[19px] font-semibold">{s.t}</h3>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">{s.d}</p>
                      <p className="mt-3 inline-block max-w-full truncate rounded-md border border-line-soft bg-pine-950/70 px-2.5 py-1.5 font-mono text-[11px] text-mint">{s.chip}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* selection bar */}
      {checked.size > 0 && (
        <div className="toast-in fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-rose/40 bg-pine-850/95 py-2.5 pl-4 pr-2.5 shadow-2xl shadow-black/50 backdrop-blur">
          <span className="mr-1 font-mono text-[12px] font-semibold text-rose">{checked.size} selected</span>
          <button onClick={() => exportCheckedOrAll("csv")} className="flex items-center gap-1.5 rounded-lg bg-rose px-3 py-2 text-[12.5px] font-semibold text-pine-950 transition-all hover:bg-rose-deep hover:text-ink active:scale-95">
            <IconDownload size={13} /> CSV
          </button>
          <button onClick={copyPhones} className="flex items-center gap-1.5 rounded-lg border border-mint/50 bg-mint/10 px-3 py-2 text-[12.5px] font-semibold text-mint transition-all hover:bg-mint/20 active:scale-95">
            <IconPhone size={13} /> Copy phones
          </button>
          <button onClick={() => setChecked(new Set())} className="rounded-lg p-2 text-dim transition-colors hover:text-ink" aria-label="Clear selection">
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* footer */}
      <footer className="border-t border-line-soft bg-pine-950/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <LogoMark size={22} />
            <p className="font-mono text-[11.5px] text-dim">
              GlowScout · maps lead engine — synthetic demo data, no live Google scraping occurs in this build.
            </p>
          </div>
          <p className="flex items-center gap-2 font-mono text-[11.5px] text-dim">
            made for beauty retail outreach <IconArrow size={12} className="text-rose" /> © {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* overlays */}
      {selectedShop && (
        <Drawer shop={selectedShop} onClose={() => setSelectedId(null)} onCopy={handleCopy} copied={copied} />
      )}
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
