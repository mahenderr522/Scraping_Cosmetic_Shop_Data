import { Shop, isOpenNow } from "../lib/data";

interface Props {
  shops: Shop[];
  running: boolean;
  preset: { areas: string[] } | null;
  cityName: string;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export default function MapPanel(p: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-pine-900/80">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
        <div>
          <h3 className="font-display text-[14px] font-bold tracking-tight">capture map · {p.cityName}</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">schematic · not to scale</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${p.running ? "border-mint/50 bg-mint/10 text-mint" : "border-line text-dim"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${p.running ? "bg-mint pulse-dot" : "bg-dim"}`} />
          {p.running ? "sweeping" : `${p.shops.length} pins`}
        </span>
      </div>

      <div className="relative">
        <svg viewBox="0 0 100 100" className="block w-full" role="img" aria-label="Schematic city map with captured shops">
          {/* base */}
          <rect x="0" y="0" width="100" height="100" fill="#0a1611" />
          {/* river */}
          <path d="M -2 70 C 18 62, 30 84, 52 76 S 88 60, 104 68 L 104 104 L -2 104 Z" fill="#0e2431" opacity="0.85" />
          <path d="M -2 70 C 18 62, 30 84, 52 76 S 88 60, 104 68" fill="none" stroke="#1b4a5e" strokeWidth="0.5" opacity="0.7" />
          {/* park */}
          <rect x="60" y="14" width="20" height="15" rx="2.5" fill="#12291e" stroke="#1e4634" strokeWidth="0.4" />
          <circle cx="65" cy="19" r="1.6" fill="#1e4634" />
          <circle cx="70" cy="23" r="2" fill="#1e4634" />
          <circle cx="75" cy="18" r="1.4" fill="#1e4634" />
          {/* blocks */}
          {[
            [8, 10, 14, 9], [26, 8, 12, 12], [42, 12, 13, 8], [8, 24, 10, 12], [22, 25, 16, 10],
            [42, 25, 12, 11], [8, 42, 18, 10], [30, 41, 12, 12], [46, 42, 10, 9], [60, 34, 16, 10],
            [80, 22, 12, 12], [62, 48, 14, 10], [80, 42, 12, 10], [24, 57, 16, 9], [46, 56, 12, 8],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx="1" fill="#0e2019" stroke="#1a3a2e" strokeWidth="0.35" />
          ))}
          {/* streets */}
          <g stroke="#22463a" strokeWidth="0.9" strokeLinecap="round">
            <line x1="4" y1="21.5" x2="96" y2="21.5" />
            <line x1="4" y1="39" x2="96" y2="39" />
            <line x1="4" y1="54" x2="96" y2="54" />
            <line x1="20" y1="4" x2="20" y2="66" />
            <line x1="40" y1="4" x2="40" y2="66" />
            <line x1="58" y1="4" x2="58" y2="66" />
            <line x1="78" y1="4" x2="78" y2="64" />
          </g>
          <g stroke="#2c5a49" strokeWidth="0.35" strokeDasharray="1.6 1.6">
            <line x1="4" y1="21.5" x2="96" y2="21.5" />
            <line x1="4" y1="39" x2="96" y2="39" />
            <line x1="20" y1="4" x2="20" y2="66" />
            <line x1="58" y1="4" x2="58" y2="66" />
          </g>
          {/* street labels */}
          {(p.preset?.areas ?? []).slice(0, 4).map((a, i) => (
            <text key={a} x={[24, 44, 62, 82][i]} y={[20.2, 37.8, 52.8, 20.2][i]} fontSize="2.1" fill="#3d6b58" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.3">
              {a.toUpperCase()}
            </text>
          ))}

          {/* radar sweep while crawling */}
          {p.running && (
            <g className="radar-sweep" style={{ transformOrigin: "50px 46px" }}>
              <path d="M 50 46 L 50 2 A 44 44 0 0 1 78 12 Z" fill="url(#sweepGrad)" opacity="0.5" />
            </g>
          )}
          {p.running && <circle className="radar-ring" cx="50" cy="46" r="10" fill="none" stroke="#4fd8a0" strokeWidth="0.5" />}
          {p.running && <circle className="radar-ring" cx="50" cy="46" r="10" fill="none" stroke="#4fd8a0" strokeWidth="0.5" style={{ animationDelay: "0.9s" }} />}

          <defs>
            <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4fd8a0" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#4fd8a0" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* pins */}
          {p.shops.map((s, i) => {
            const open = isOpenNow(s);
            const fill = open === null ? "#f0b429" : open ? "#4fd8a0" : "#3a4a44";
            const hot = s.id === p.hoveredId;
            return (
              <g
                key={s.id}
                className="pin-in cursor-pointer"
                style={{ animationDelay: `${Math.min(i * 45, 600)}ms` }}
                onMouseEnter={() => p.onHover(s.id)}
                onMouseLeave={() => p.onHover(null)}
                onClick={() => p.onSelect(s.id)}
              >
                <title>{`${s.name}${s.phone ? " · " + s.phone : ""}`}</title>
                {hot && <circle cx={s.x} cy={s.y} r="4.5" fill={fill} opacity="0.18" />}
                <path
                  d={`M ${s.x} ${s.y + 0.6} c -2.6 -2.4 -3.9 -4.2 -3.9 -6.2 a 3.9 3.9 0 1 1 7.8 0 c 0 2 -1.3 3.8 -3.9 6.2 Z`}
                  fill={hot ? "#f27398" : fill}
                  stroke="#0a1611"
                  strokeWidth="0.45"
                  style={{ transition: "fill 0.15s" }}
                />
                <circle cx={s.x} cy={s.y - 5.6} r="1.3" fill="#0a1611" opacity="0.55" />
              </g>
            );
          })}

          {/* compass */}
          <g transform="translate(92, 90)">
            <circle r="4" fill="#0e2019" stroke="#22463a" strokeWidth="0.4" />
            <path d="M 0 -2.6 L 1 1 L 0 0.3 L -1 1 Z" fill="#f27398" />
            <text y="-5.4" textAnchor="middle" fontSize="2.4" fill="#5a7a6c" fontFamily="IBM Plex Mono, monospace">N</text>
          </g>
        </svg>

        {/* hovered label */}
        {p.hoveredId && (() => {
          const s = p.shops.find((x) => x.id === p.hoveredId);
          if (!s) return null;
          return (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg border border-rose/50 bg-pine-950/95 px-3 py-1.5 text-center shadow-xl fade-in">
              <p className="font-display text-[12px] font-bold text-ink">{s.name}</p>
              <p className="font-mono text-[10px] text-mint">{s.phone ?? "no phone listed"}</p>
            </div>
          );
        })()}
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft px-5 py-2.5 font-mono text-[10px] uppercase tracking-wider text-dim">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mint" /> open now</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3a4a44]" /> closed</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber" /> hours unknown</span>
        <span className="ml-auto normal-case tracking-normal text-dim/80">click a pin → full details</span>
      </div>
    </section>
  );
}
