import { CITIES, DataSource } from "../lib/data";
import { LogLine, LogKind } from "../lib/engine";
import { IconSearch, IconPin, IconZap, IconX, IconRadar, IconGlobe, IconSpark } from "./icons";

const KIND_STYLE: Record<LogKind, { label: string; cls: string }> = {
  sys: { label: "SYS", cls: "text-sky" },
  ok: { label: "OK ", cls: "text-mint" },
  warn: { label: "WRN", cls: "text-amber" },
  err: { label: "ERR", cls: "text-rose" },
  cap: { label: "CAP", cls: "text-ink/60" },
};

const SOURCES: { id: DataSource; title: string; desc: string; icon: React.ReactNode; tone: string; badge: string }[] = [
  {
    id: "osm",
    title: "OpenStreetMap · live",
    desc: "Real shops with real phone numbers from OSM via the Overpass API. No key needed.",
    icon: <IconGlobe size={15} />,
    tone: "border-mint/50 bg-mint/10 text-mint",
    badge: "real numbers",
  },
  {
    id: "google",
    title: "Google Places · live",
    desc: "Actual Google listings — names, numbers & ratings — using your own Places API key.",
    icon: <IconPin size={15} />,
    tone: "border-sky/50 bg-sky/10 text-sky",
    badge: "needs key",
  },
  {
    id: "demo",
    title: "Demo · synthetic",
    desc: "Deterministic sample dataset for UI testing. Phone numbers are fake.",
    icon: <IconSpark size={15} />,
    tone: "border-line bg-pine-850/70 text-mute",
    badge: "fake data",
  },
];

interface Props {
  query: string;
  onQuery: (v: string) => void;
  cityId: string;
  onCity: (id: string) => void;
  running: boolean;
  progress: number;
  logs: LogLine[];
  onRun: () => void;
  onStop: () => void;
  mode: DataSource;
  onMode: (m: DataSource) => void;
  apiKey: string;
  onApiKey: (v: string) => void;
}

export default function Console(p: Props) {
  const city = CITIES.find((c) => c.id === p.cityId) ?? CITIES[0];

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-pine-900/80">
      {/* header */}
      <div className="flex items-center gap-2.5 border-b border-line-soft px-5 py-3.5">
        <span className={`grid h-8 w-8 place-items-center rounded-lg border ${p.running ? "border-mint/50 bg-mint/10 text-mint" : "border-line bg-pine-850 text-dim"}`}>
          <IconRadar size={16} />
        </span>
        <div>
          <h2 className="font-display text-[15px] font-bold tracking-tight">extraction console</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
            {p.running ? "pipeline live" : "pipeline idle"} · {city.name.toLowerCase()} grid
          </p>
        </div>
        <span className={`ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${p.running ? "border-mint/50 bg-mint/10 text-mint" : "border-line text-dim"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${p.running ? "bg-mint pulse-dot" : "bg-dim"}`} />
          {p.running ? "crawling" : "ready"}
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
        {/* left: controls */}
        <div className="border-b border-line-soft p-5 lg:border-b-0 lg:border-r">
          {/* data source */}
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">data source</p>
          <div className="grid gap-2">
            {SOURCES.map((s) => {
              const on = p.mode === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => !p.running && p.onMode(s.id)}
                  disabled={p.running}
                  className={`group flex items-start gap-3 rounded-lg border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    on ? "border-rose/60 bg-rose/10 shadow-[0_0_0_1px_var(--color-rose)]" : "border-line bg-pine-850/50 hover:border-rose/30 hover:bg-pine-850"
                  }`}
                >
                  <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border ${on ? s.tone : "border-line text-dim"}`}>{s.icon}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={`font-display text-[13.5px] font-bold ${on ? "text-ink" : "text-mute"}`}>{s.title}</span>
                      <span className={`rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${on ? s.tone : "border-line text-dim"}`}>{s.badge}</span>
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-dim">{s.desc}</span>
                  </span>
                  <span className={`ml-auto mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-all ${on ? "border-rose bg-rose" : "border-line bg-transparent group-hover:border-rose/40"}`} />
                </button>
              );
            })}
          </div>

          {p.mode === "google" && (
            <div className="fade-in mt-3 rounded-lg border border-sky/30 bg-sky/5 p-3">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-sky" htmlFor="gkey">google places api key</label>
              <input
                id="gkey"
                type="password"
                value={p.apiKey}
                onChange={(e) => p.onApiKey(e.target.value)}
                placeholder="AIza…"
                className="mt-1.5 w-full rounded-md border border-line bg-pine-950/80 px-3 py-2 font-mono text-[12.5px] text-ink outline-none placeholder:text-dim focus:border-sky/60"
              />
              <p className="mt-1.5 text-[11px] leading-snug text-dim">
                Stored only in this browser (localStorage). Enable the <em>Places API (New)</em> in Google Cloud Console —
                phone fields cost ~$17 per 1,000 requests.
              </p>
            </div>
          )}

          {/* query + city */}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">search query</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-pine-950/70 px-3 py-2.5 transition-colors focus-within:border-rose/60">
                <IconSearch size={14} className="shrink-0 text-dim" />
                <input
                  value={p.query}
                  onChange={(e) => p.onQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !p.running && p.onRun()}
                  placeholder="cosmetics shop"
                  className="w-full bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-dim"
                />
              </div>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">target city</span>
              <select
                value={p.cityId}
                onChange={(e) => p.onCity(e.target.value)}
                className="mt-1.5 w-full cursor-pointer rounded-lg border border-line bg-pine-950/70 px-3 py-[11px] text-[13.5px] font-medium text-ink outline-none transition-colors hover:border-rose/40 focus:border-rose/60"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.country}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {CITIES.map((c) => (
              <button
                key={c.id}
                onClick={() => !p.running && p.onCity(c.id)}
                disabled={p.running}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed ${
                  c.id === p.cityId ? "border-rose/60 bg-rose/15 text-rose" : "border-line text-dim hover:border-rose/40 hover:text-mute"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* run / stop */}
          <div className="mt-4 flex items-center gap-3">
            {!p.running ? (
              <button
                onClick={p.onRun}
                className="group flex items-center gap-2.5 rounded-lg bg-rose px-6 py-3 font-display text-[14px] font-bold text-[#160a10] shadow-[0_8px_24px_-8px_var(--color-rose)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
              >
                <IconZap size={16} className="transition-transform group-hover:scale-110" />
                {p.mode === "demo" ? "Start demo extraction" : "Start live extraction"}
              </button>
            ) : (
              <button
                onClick={p.onStop}
                className="flex items-center gap-2.5 rounded-lg border border-rose/60 bg-rose/10 px-6 py-3 font-display text-[14px] font-bold text-rose transition-all hover:bg-rose/20 active:scale-95"
              >
                <IconX size={15} />
                Stop crawl
              </button>
            )}
            {p.running && (
              <div className="h-2 flex-1 overflow-hidden rounded-full border border-line bg-pine-950">
                <div
                  className="progress-shimmer h-full rounded-full bg-gradient-to-r from-rose via-amber to-mint transition-[width] duration-300"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            )}
            {p.running && <span className="font-mono text-[12px] font-semibold text-mint tabular-nums">{p.progress}%</span>}
          </div>
        </div>

        {/* right: live log */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">pipeline log</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose/70" />
              <span className="h-2 w-2 rounded-full bg-amber/70" />
              <span className="h-2 w-2 rounded-full bg-mint/70" />
            </span>
          </div>
          <div className="nice-scroll h-[264px] flex-1 overflow-y-auto px-5 py-3 font-mono text-[11.5px] leading-[1.9] lg:h-auto lg:max-h-[330px]">
            {p.logs.length === 0 && (
              <p className="text-dim">
                <span className="text-sky">SYS</span> · standing by — pick a source, set a city, press start.
              </p>
            )}
            {p.logs.map((l) => (
              <p key={l.id} className="fade-in whitespace-pre-wrap break-words">
                <span className="text-dim/70">{l.t}</span>{" "}
                <span className={KIND_STYLE[l.kind].cls}>{KIND_STYLE[l.kind].label}</span>{" "}
                <span className={l.kind === "cap" ? "text-mute" : l.kind === "err" ? "text-rose" : "text-ink/85"}>{l.msg}</span>
              </p>
            ))}
            {p.running && <span className="caret text-mint">▮</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
