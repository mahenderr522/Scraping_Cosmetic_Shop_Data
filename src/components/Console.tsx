import React, { useEffect, useRef } from "react";
import { LogLine } from "../lib/engine";
import { SUGGESTED_CITIES } from "../lib/data";
import { IconSearch, IconPin, IconRadar, IconX, IconZap, IconArrow } from "./icons";

export type RunStatus = "idle" | "running" | "done";

interface Props {
  query: string;
  city: string;
  status: RunStatus;
  logs: LogLine[];
  progress: number;
  phase: string;
  cityError: string | null;
  onQuery: (v: string) => void;
  onCity: (v: string) => void;
  onRun: () => void;
  onStop: () => void;
}

const KIND_STYLE: Record<LogLine["kind"], string> = {
  sys: "text-mute",
  ok: "text-mint",
  warn: "text-amber",
  data: "text-rose",
};
const KIND_LABEL: Record<LogLine["kind"], string> = {
  sys: "SYS",
  ok: "OK ",
  warn: "WRN",
  data: "CAP",
};

export default function Console(p: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [p.logs.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        queryRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const running = p.status === "running";

  return (
    <section id="console" className="relative">
      {/* heading row — left-aligned, console-first opening */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-mint">
            <IconRadar size={14} />
            Google Maps lead extractor · beauty retail
          </p>
          <h1 className="font-display text-[clamp(1.9rem,4.6vw,3.4rem)] font-bold leading-[1.02] tracking-tight">
            Pull every <span className="text-rose">cosmetics shop</span>
            <br className="hidden sm:block" /> off the map — details &amp; numbers included.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mute">
            Point the engine at a city and it crawls the local-search layer, capturing names,
            phone numbers, addresses, hours and ratings — ready to export to your CRM.
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-lg border border-line bg-pine-850/70 px-3.5 py-2.5 font-mono text-[11.5px] text-mute md:flex">
          <span className={`h-2 w-2 rounded-full ${running ? "bg-rose pulse-dot-rose" : "bg-mint pulse-dot"}`} />
          engine: {running ? "crawling" : "ready"} · synth-demo v2.4
        </div>
      </div>

      {/* console panel */}
      <div className={`overflow-hidden rounded-xl border bg-pine-900/85 shadow-2xl shadow-black/40 transition-colors ${running ? "border-rose/40" : "border-line"}`}>
        {/* terminal chrome */}
        <div className="flex items-center justify-between border-b border-line-soft bg-pine-850/80 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-mint/80" />
            <span className="ml-3 font-mono text-[11px] text-dim">glowscout — extraction console</span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-dim">{p.phase || "standby"}</span>
        </div>

        {/* query bar */}
        <div className="grid gap-3 border-b border-line-soft p-4 md:grid-cols-[1.25fr_1fr_auto]">
          <label className={`group flex items-center gap-3 rounded-lg border bg-pine-950/70 px-3.5 py-3 transition-colors focus-within:border-rose/60 ${p.cityError ? "" : "border-line"}`}>
            <IconSearch size={18} className="shrink-0 text-dim transition-colors group-focus-within:text-rose" />
            <input
              ref={queryRef}
              value={p.query}
              onChange={(e) => p.onQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !running && p.onRun()}
              placeholder="Business type — e.g. cosmetics shop"
              className="w-full bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-dim"
            />
            <kbd className="hidden rounded border border-line bg-pine-850 px-1.5 py-0.5 font-mono text-[10px] text-dim sm:block">/</kbd>
          </label>

          <div>
            <label className={`flex items-center gap-3 rounded-lg border bg-pine-950/70 px-3.5 py-3 transition-colors focus-within:border-mint/60 ${p.cityError ? "border-amber/70 shake" : "border-line"}`}>
              <IconPin size={18} className={`shrink-0 ${p.cityError ? "text-amber" : "text-dim"}`} />
              <input
                value={p.city}
                onChange={(e) => p.onCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !running && p.onRun()}
                placeholder="Near city — e.g. Mumbai"
                className="w-full bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-dim"
              />
            </label>
            {p.cityError && (
              <p className="mt-1.5 flex items-center gap-1.5 pl-1 text-[12px] font-medium text-amber">
                <IconX size={11} /> {p.cityError}
              </p>
            )}
          </div>

          {running ? (
            <button
              onClick={p.onStop}
              className="group flex items-center justify-center gap-2.5 rounded-lg border border-amber/50 bg-amber/10 px-6 py-3 font-display text-[15px] font-semibold text-amber transition-all hover:bg-amber/20 active:scale-[0.97]"
            >
              <span className="h-3 w-3 rounded-[3px] border-2 border-amber bg-transparent transition-colors group-hover:bg-amber/40" />
              Stop crawl
            </button>
          ) : (
            <button
              onClick={p.onRun}
              className="group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-lg bg-rose px-7 py-3 font-display text-[15px] font-semibold text-pine-950 shadow-lg shadow-rose/25 transition-all hover:-translate-y-0.5 hover:bg-rose-deep hover:text-ink hover:shadow-xl hover:shadow-rose/30 active:translate-y-0 active:scale-[0.97]"
            >
              <IconZap size={16} />
              {p.status === "done" ? "Re-run extraction" : "Start extraction"}
              <IconArrow size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>

        {/* city chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-3">
          <span className="font-mono text-[10.5px] uppercase tracking-widest text-dim">targets:</span>
          {SUGGESTED_CITIES.map((c) => {
            const active = c.toLowerCase() === p.city.trim().toLowerCase();
            return (
              <button
                key={c}
                onClick={() => p.onCity(c)}
                className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition-all hover:-translate-y-0.5 ${
                  active
                    ? "border-mint/60 bg-mint/15 text-mint"
                    : "border-line bg-pine-850/60 text-mute hover:border-mint/40 hover:text-ink"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* log + progress */}
        <div className="grid lg:grid-cols-[1fr_260px]">
          <div
            ref={logRef}
            className="nice-scroll h-44 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-[1.75] lg:h-48"
          >
            {p.logs.length === 0 && (
              <p className="text-dim">// idle — set a city and press Start extraction</p>
            )}
            {p.logs.map((l) => (
              <p key={l.id} className="row-in flex gap-3 whitespace-pre-wrap">
                <span className="shrink-0 text-dim">[{l.time}]</span>
                <span className={`shrink-0 font-semibold ${KIND_STYLE[l.kind]}`}>{KIND_LABEL[l.kind]}</span>
                <span className={l.kind === "sys" ? "text-mute" : l.kind === "warn" ? "text-amber/90" : l.kind === "ok" ? "text-mint/90" : "text-ink/85"}>
                  {l.msg}
                </span>
              </p>
            ))}
            {running && (
              <p className="flex gap-3 text-dim">
                <span className="shrink-0">[{new Date().toTimeString().slice(0, 8)}]</span>
                <span className="caret text-mint">▌</span>
              </p>
            )}
          </div>

          <div className="flex flex-col justify-center gap-2.5 border-t border-line-soft px-5 py-4 lg:border-l lg:border-t-0">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-widest text-dim">progress</span>
              <span className={`font-mono text-lg font-semibold ${p.progress >= 100 ? "text-mint" : "text-rose"}`}>
                {p.progress}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-pine-950 ring-1 ring-line">
              <div
                className={`relative h-full rounded-full transition-all duration-500 ${p.progress >= 100 ? "bg-mint" : "bg-rose"}`}
                style={{ width: `${p.progress}%` }}
              >
                {running && <div className="progress-shimmer absolute inset-0" />}
              </div>
            </div>
            <p className="font-mono text-[11px] text-dim">
              {running ? "streaming captures…" : p.status === "done" ? "pipeline complete ✓" : "awaiting operator"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
