import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Console from "./components/Console";
import MapPanel from "./components/MapPanel";
import ResultsTable, { Filters, Sort } from "./components/ResultsTable";
import Drawer from "./components/Drawer";
import StatsStrip from "./components/StatsStrip";
import { Reveal, ToastStack, type Toast } from "./components/ui";
import {
  CITIES, type DataSource, type Shop, SOURCE_LABEL, generateShops, isOpenNow,
} from "./lib/data";
import { runExtraction, stamp, type LogKind, type LogLine } from "./lib/engine";
import { fetchOsmShops } from "./lib/overpass";
import { searchGooglePlaces, DEFAULT_GOOGLE_KEY } from "./lib/google";
import { toCSV, toJSON, download, copyText } from "./lib/export";
import {
  LogoMark, IconPhone, IconDownload, IconX, IconAlert, IconGlobe, IconPin, IconRadar, IconCopy,
} from "./components/icons";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function App() {
  /* ── state ─────────────────────────────────────────── */
  const [query, setQuery] = useState("cosmetics shop");
  const [cityId, setCityId] = useState("mumbai");
  const [mode, setMode] = useState<DataSource>(() => {
    const m = localStorage.getItem("gs-mode");
    return m === "demo" || m === "google" || m === "osm" ? m : "google";
  });
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gs-gkey") ?? DEFAULT_GOOGLE_KEY);

  const [shops, setShops] = useState<Shop[]>([]);
  const [preset, setPreset] = useState<{ areas: string[] } | null>(null);
  const [lastSource, setLastSource] = useState<DataSource>("google");
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({ text: "", minRating: 0, openNow: false, hasPhone: false, hasWeb: false, tag: null });
  const [sort, setSort] = useState<Sort>({ key: "rating", dir: -1 });
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const runIdRef = useRef(0);
  const cancelRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

  const city = useMemo(() => CITIES.find((c) => c.id === cityId) ?? CITIES[0], [cityId]);

  useEffect(() => localStorage.setItem("gs-mode", mode), [mode]);
  useEffect(() => localStorage.setItem("gs-gkey", apiKey), [apiKey]);

  /* ── toasts ────────────────────────────────────────── */
  const addToast = useCallback((kind: Toast["kind"], msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, msg }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const handleCopy = useCallback(
    async (text: string, msg: string) => {
      const ok = await copyText(text);
      addToast(ok ? "copy" : "warn", ok ? msg : "Clipboard blocked by browser");
    },
    [addToast]
  );

  /* ── extraction flow ───────────────────────────────── */
  const start = useCallback(
    async (auto = false, modeOverride?: DataSource) => {
      const effMode = modeOverride ?? mode;
      if (modeOverride) setMode(modeOverride);
      const q = query.trim() || "cosmetics shop";
      const runId = ++runIdRef.current;
      cancelRef.current?.();
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      setRunning(true);
      setProgress(0);
      setShops([]);
      setChecked(new Set());
      setPage(1);
      setSelectedId(null);
      setPreset(null);
      setElapsed(null);
      setFallbackNote(null);
      setLastSource(effMode);
      setLogs([]);

      const pushLog = (kind: LogKind, msg: string) =>
        setLogs((l) => [...l.slice(-160), { id: Date.now() + Math.random(), t: stamp(), kind, msg }]);

      pushLog("sys", `target locked ▸ "${q}" · ${city.name}, ${city.country}`);

      let shops: Shop[] = [];
      let source: DataSource = mode;

      if (effMode === "demo") {
        const gen = generateShops(q, city);
        shops = gen.shops;
        setPreset(gen.preset);
      } else if (effMode === "osm") {
        pushLog("sys", "contacting overpass-api.de · OpenStreetMap …");
        try {
          shops = await fetchOsmShops(city, abort.signal);
          pushLog("ok", `live response · ${shops.length} real places tagged cosmetics / beauty / perfumery`);
        } catch (e) {
          if (runId !== runIdRef.current) return;
          const msg = (e as Error)?.name === "AbortError" ? "request aborted" : (e as Error)?.message || "request failed";
          pushLog("err", msg);
          pushLog("warn", "Overpass unreachable from this network — loading demo dataset instead");
          addToast("warn", "Live OSM fetch failed — demo data loaded so you can explore");
          const gen = generateShops(q, city);
          shops = gen.shops;
          setPreset(gen.preset);
          source = "demo";
          setLastSource("demo");
        }
      } else {
        if (!apiKey.trim()) {
          pushLog("err", "no API key — paste your Google Places key in the console panel");
          addToast("warn", "Add your Google Places API key first");
          setRunning(false);
          return;
        }
        pushLog("sys", "querying Google · places:searchText …");
        try {
          const res = await searchGooglePlaces(apiKey, q, city, abort.signal, (m) => pushLog("sys", m));
          shops = res.shops;
          pushLog(
            "ok",
            res.via === "new"
              ? `live response · ${shops.length} official Google listings via Places API (New)`
              : `live response · ${shops.length} official Google listings via legacy text-search + details`
          );
        } catch (e) {
          if (runId !== runIdRef.current) return;
          const msg = (e as Error)?.message || "request failed";
          pushLog("err", `Google: ${msg}`);
          pushLog("warn", "trying OpenStreetMap live data instead (real numbers, no key needed) …");
          try {
            const osm = await fetchOsmShops(city, abort.signal);
            if (osm.length === 0) throw new Error("0 places tagged in OSM for this area");
            shops = osm;
            source = "osm";
            setLastSource("osm");
            setFallbackNote(
              `Google Places failed (${msg}) — showing real OpenStreetMap numbers instead. Run “Test key” in the console to repair the Google path.`
            );
            pushLog("ok", `live response · ${shops.length} real places from OpenStreetMap`);
          } catch (e2) {
            if (runId !== runIdRef.current) return;
            pushLog("err", `OpenStreetMap also unavailable (${(e2 as Error)?.message || "no results"})`);
            pushLog("warn", "last resort · loading the labelled synthetic demo dataset");
            addToast("warn", "Both live sources failed — demo data loaded");
            const gen = generateShops(q, city);
            shops = gen.shops;
            setPreset(gen.preset);
            source = "demo";
            setLastSource("demo");
            setFallbackNote(
              `Every live source failed (Google: ${msg}). The numbers below are SYNTHETIC demo records, not real shops. Fix the key with “Test key”, then retry Google.`
            );
          }
        }
      }

      if (runId !== runIdRef.current) return;
      if (shops.length === 0) {
        if (source !== "demo") {
          pushLog("warn", source === "osm"
            ? "0 places matched — OSM coverage varies by city. Try Mumbai, Delhi, Dubai or London."
            : "0 places matched — the query or city returned no listings (or the key quota is exhausted).");
          pushLog("warn", "falling back to the labelled demo dataset");
          addToast("warn", "No live results — demo data loaded instead");
          const gen = generateShops(q, city);
          shops = gen.shops;
          setPreset(gen.preset);
          source = "demo";
          setLastSource("demo");
        } else {
          pushLog("warn", "0 places matched — try a broader query or another city.");
          addToast("warn", "No results for this city — try another target");
          setRunning(false);
          return;
        }
      }

      cancelRef.current = runExtraction({
        query: q,
        city,
        mode: source,
        shops,
        onEvent: (kind, msg) => {
          if (runId === runIdRef.current) pushLog(kind, msg);
        },
        onBatch: (b) => {
          if (runId === runIdRef.current) setShops((s) => [...s, ...b]);
        },
        onProgress: (pct) => {
          if (runId === runIdRef.current) setProgress(pct);
        },
        onDone: (sum) => {
          if (runId !== runIdRef.current) return;
          setRunning(false);
          setElapsed(sum.durationMs / 1000);
          addToast("ok", `${sum.total} shops captured · ${sum.withPhone} with a phone number`);
        },
      });
    },
    [query, city, mode, apiKey, addToast]
  );

  const stop = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    cancelRef.current?.();
    setRunning(false);
    setLogs((l) => [...l, { id: Date.now() + Math.random(), t: stamp(), kind: "warn", msg: "stopped by operator" }]);
  }, []);

  /* auto-run once on first load */
  const startRef = useRef(start);
  startRef.current = start;
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      void startRef.current(true);
    }
  }, []);

  /* ── derived ───────────────────────────────────────── */
  const phones = useMemo(() => shops.filter((s) => s.phone).length, [shops]);
  const avgRating = useMemo(() => {
    const rated = shops.filter((s) => s.rating != null);
    return rated.length ? rated.reduce((a, s) => a + (s.rating as number), 0) / rated.length : 0;
  }, [shops]);
  const openCount = useMemo(() => shops.filter((s) => isOpenNow(s)).length, [shops]);

  const exportSet = useCallback(
    () => (checked.size ? shops.filter((s) => checked.has(s.id)) : shops),
    [shops, checked]
  );

  const onExportCSV = useCallback(() => {
    const set = exportSet();
    if (!set.length) return;
    download(`glowscout-${slug(city.name)}-${set.length}.csv`, toCSV(set), "text/csv;charset=utf-8");
    addToast("export", `CSV exported · ${set.length} rows${checked.size ? " (selection)" : ""}`);
  }, [exportSet, city.name, checked.size, addToast]);

  const onExportJSON = useCallback(() => {
    const set = exportSet();
    if (!set.length) return;
    download(`glowscout-${slug(city.name)}-${set.length}.json`, toJSON(set), "application/json");
    addToast("export", `JSON exported · ${set.length} rows${checked.size ? " (selection)" : ""}`);
  }, [exportSet, city.name, checked.size, addToast]);

  const onCopyPhones = useCallback(async () => {
    const list = exportSet().filter((s) => s.phone).map((s) => s.phone as string);
    if (!list.length) {
      addToast("warn", "No phone numbers in the current set");
      return;
    }
    const ok = await copyText(list.join("\n"));
    addToast(ok ? "copy" : "warn", ok ? `${list.length} phone numbers copied to clipboard` : "Clipboard blocked by browser");
  }, [exportSet, addToast]);

  const toggleCheck = useCallback((id: string) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setChecked((prev) => {
      const all = ids.every((id) => prev.has(id));
      const n = new Set(prev);
      ids.forEach((id) => (all ? n.delete(id) : n.add(id)));
      return n;
    });
  }, []);

  const selectedShop = useMemo(() => shops.find((s) => s.id === selectedId) ?? null, [shops, selectedId]);

  /* ── render ────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen overflow-x-clip text-ink">
      {/* ambient layers */}
      <div className="scene-bg pointer-events-none fixed inset-0" />
      <div className="scene-grid pointer-events-none fixed inset-0" />
      <div className="scene-noise pointer-events-none fixed inset-0" />
      <div className="glow-drift pointer-events-none fixed -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-rose/10 blur-[130px]" />
      <div className="glow-drift pointer-events-none fixed right-0 top-1/3 h-[420px] w-[420px] rounded-full bg-mint/10 blur-[120px]" style={{ animationDelay: "-6s" }} />

      <div className="relative mx-auto max-w-[1340px] px-4 pb-24 sm:px-6">
        {/* header */}
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 py-6">
          <div className="flex items-center gap-3">
            <span className="float-y"><LogoMark size={38} /></span>
            <div>
              <h1 className="font-display text-[24px] font-extrabold leading-none tracking-tight">
                Glow<span className="text-rose">Scout</span>
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-dim">map → cosmetics shop lead sheet</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-widest ${mode === "demo" ? "border-line text-dim" : "border-mint/50 bg-mint/10 text-mint"}`}>
              <IconRadar size={12} />
              source: {mode === "osm" ? "openstreetmap" : mode === "google" ? "google places" : "demo synth"}
            </span>
            <span className="hidden rounded-full border border-line px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-widest text-dim sm:block">
              v2.1 · live numbers
            </span>
          </div>
        </header>

        {/* console */}
        <Console
          query={query}
          onQuery={setQuery}
          cityId={cityId}
          onCity={setCityId}
          running={running}
          progress={progress}
          logs={logs}
          onRun={() => void start()}
          onStop={stop}
          mode={mode}
          onMode={setMode}
          apiKey={apiKey}
          onApiKey={setApiKey}
        />

        {/* stats */}
        <div className="mt-5">
          <StatsStrip
            total={shops.length}
            phones={phones}
            avgRating={avgRating}
            openNow={openCount}
            elapsed={elapsed}
            active={shops.length > 0}
          />
        </div>

        {/* results + map */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0">
            {fallbackNote && (
              <div className="fade-in mb-3.5 flex flex-wrap items-center gap-3 rounded-xl border border-amber/45 bg-amber/10 px-4 py-3 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)]">
                <IconAlert size={17} className="shrink-0 text-amber" />
                <p className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-ink/90">{fallbackNote}</p>
                <div className="flex items-center gap-2">
                  {lastSource === "demo" && (
                    <button
                      onClick={() => void start(false, "osm")}
                      disabled={running}
                      className="rounded-lg border border-mint/50 bg-mint/10 px-3 py-1.5 text-[12px] font-bold text-mint transition-all hover:-translate-y-0.5 hover:bg-mint/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Run OpenStreetMap live
                    </button>
                  )}
                  {lastSource !== "google" && (
                    <button
                      onClick={() => void start(false, "google")}
                      disabled={running}
                      className="rounded-lg border border-sky/50 bg-sky/10 px-3 py-1.5 text-[12px] font-bold text-sky transition-all hover:-translate-y-0.5 hover:bg-sky/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Retry Google
                    </button>
                  )}
                  <button
                    onClick={() => setFallbackNote(null)}
                    className="rounded-lg border border-line p-1.5 text-dim transition-all hover:border-amber/50 hover:text-amber active:scale-95"
                    aria-label="Dismiss notice"
                  >
                    <IconX size={13} />
                  </button>
                </div>
              </div>
            )}
            <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-[16px] font-bold tracking-tight">captured listings</h2>
              <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-widest ${lastSource === "demo" ? "border-amber/40 bg-amber/10 text-amber" : "border-mint/50 bg-mint/10 text-mint"}`}>
                {SOURCE_LABEL[lastSource]}
              </span>
              {lastSource !== "demo" && (
                <span className="font-mono text-[10.5px] text-dim">phone numbers are real, published listings</span>
              )}
              {lastSource === "demo" && (
                <span className="font-mono text-[10.5px] text-amber/80">demo numbers — not callable</span>
              )}
            </div>
            <ResultsTable
              shops={shops}
              running={running}
              filters={filters}
              onFilters={setFilters}
              sort={sort}
              onSort={setSort}
              page={page}
              onPage={setPage}
              checked={checked}
              onToggle={toggleCheck}
              onToggleAll={toggleAll}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onSelect={setSelectedId}
              onCopy={handleCopy}
              onExportCSV={onExportCSV}
              onExportJSON={onExportJSON}
            />
          </section>

          <div className="xl:sticky xl:top-5 xl:self-start">
            <MapPanel
              shops={shops}
              running={running}
              preset={preset}
              cityName={city.name}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onSelect={setSelectedId}
            />
          </div>
        </div>

        {/* how the numbers get here */}
        <section className="mt-16">
          <Reveal>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-rose">provenance</p>
            <h2 className="mt-2 font-display text-[clamp(24px,3.2vw,34px)] font-extrabold leading-tight tracking-tight">
              where these phone numbers come from
            </h2>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-mute">
              GlowScout never invents contact data in live mode. Pick a source in the console — each one feeds the exact
              same pipeline, table and export.
            </p>
          </Reveal>

          <div className="mt-8 space-y-3">
            {[
              {
                n: "01",
                icon: <IconGlobe size={19} />,
                title: "OpenStreetMap · Overpass API",
                tone: "text-mint border-mint/40",
                body: "A live query for shop=cosmetics / beauty / perfumery / chemist within ~9 km of the city centre, answered by the public Overpass API. The phone comes straight from the listing's phone / contact:mobile tag — the same number shown on openstreetmap.org. No key, no account, ODbL-licensed community data.",
              },
              {
                n: "02",
                icon: <IconPin size={19} />,
                title: "Google Places · key bundled",
                tone: "text-sky border-sky/40",
                body: "GlowScout ships with a Places API (New) key and calls places:searchText straight from your browser, returning the official Google listing — name, formatted address, rating, opening hours and the internationalPhoneNumber field. Swap in your own Google Cloud key any time; it never leaves your machine except to Google. If the call is blocked or the quota runs dry, the console flags it and falls back to the labelled demo set.",
              },
              {
                n: "03",
                icon: <IconDownload size={19} />,
                title: "Export & dial",
                tone: "text-amber border-amber/40",
                body: "Filter to rows with a phone, tick the ones you want, then copy all numbers in one click or download CSV / JSON for your CRM or dialer. Demo mode stays clearly labelled with synthetic numbers so test data never leaks into real outreach.",
              },
              {
                n: "04",
                icon: <IconPhone size={19} />,
                title: "Whose number is this?",
                tone: "text-rose border-rose/40",
                body: "The number on a listing is the line the owner published for customers — for an independent cosmetics shop, that is the owner's business number, the same one printed on the storefront. No legitimate API hands out a person's private mobile; tools claiming otherwise are guessing. GlowScout only surfaces published, callable numbers, and marks them tel:-dialable so you can verify with one call.",
              },
            ].map((r, i) => (
              <Reveal key={r.n} delay={i * 90}>
                <div className="group flex gap-5 rounded-xl border border-line bg-pine-900/60 p-5 transition-all hover:-translate-y-1 hover:border-line hover:bg-pine-900/90 hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)] sm:gap-7 sm:p-6">
                  <span className={`hidden h-12 w-12 shrink-0 place-items-center rounded-lg border bg-pine-950/60 sm:grid ${r.tone}`}>{r.icon}</span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] tracking-[0.2em] text-dim">{r.n}</p>
                    <h3 className="mt-1 font-display text-[17px] font-bold tracking-tight">{r.title}</h3>
                    <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-mute">{r.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-6 flex items-start gap-3.5 rounded-xl border border-amber/30 bg-amber/5 p-5">
              <IconAlert size={18} className="mt-0.5 shrink-0 text-amber" />
              <p className="text-[13px] leading-relaxed text-mute">
                <strong className="font-semibold text-amber">Fair-use notice.</strong> Direct scraping of Google Maps search
                pages is blocked by Google and breaches its Terms of Service — that's why GlowScout routes live data
                through the official Places API with your own key, or through OpenStreetMap's open data. Respect local
                call-time rules (DND/CTPR registries) when dialing captured numbers. Live map data ©{" "}
                <a className="text-mint underline decoration-mint/40 underline-offset-2 hover:decoration-mint" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> (ODbL).
              </p>
            </div>
          </Reveal>
        </section>

        {/* footer */}
        <footer className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line-soft pt-6">
          <span className="flex items-center gap-2 font-mono text-[11px] text-dim">
            <LogoMark size={18} /> GlowScout — built for beauty-industry lead research
          </span>
          <span className="font-mono text-[11px] text-dim/70">
            {mode === "osm" && "live data via overpass-api.de · © OpenStreetMap contributors"}
            {mode === "google" && "live data via places.googleapis.com · Places API (New)"}
            {mode === "demo" && "demo dataset · all records synthetic"}
          </span>
          <span className="ml-auto font-mono text-[11px] text-dim/70">no data leaves your browser except the source APIs</span>
        </footer>
      </div>

      {/* selection bar */}
      {checked.size > 0 && (
        <div className="toast-in fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-rose/40 bg-pine-950/95 py-2.5 pl-4 pr-2.5 shadow-2xl shadow-black/50 backdrop-blur">
          <span className="mr-1 font-mono text-[12px] text-ink">
            <strong className="text-rose">{checked.size}</strong> selected
          </span>
          <button
            onClick={() => void onCopyPhones()}
            className="flex items-center gap-1.5 rounded-lg bg-mint px-3.5 py-2 text-[12.5px] font-bold text-pine-950 transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
          >
            <IconPhone size={13} /> Copy phones
          </button>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-mute transition-all hover:border-mint/40 hover:text-mint active:scale-95"
          >
            <IconDownload size={13} /> CSV
          </button>
          <button
            onClick={() => setChecked(new Set())}
            className="rounded-lg border border-line p-2 text-dim transition-all hover:border-rose/40 hover:text-rose active:scale-95"
            aria-label="Clear selection"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      <Drawer shop={selectedShop} onClose={() => setSelectedId(null)} onCopy={handleCopy} />
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
