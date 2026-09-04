import { Shop, CityPreset, isOpenNow } from "../lib/data";
import { IconRadar, IconPin } from "./icons";

interface Props {
  shops: Shop[];
  preset: CityPreset | null;
  running: boolean;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  className?: string;
}

const W = 400;
const H = 420;
const pad = 30;
const px = (x: number) => pad + x * (W - pad * 2);
const py = (y: number) => pad + y * (H - pad * 2);

export default function MapPanel(p: Props) {
  const hovered = p.shops.find((s) => s.id === p.hoveredId) ?? null;
  const openCount = p.shops.filter((s) => isOpenNow(s)).length;

  return (
    <div className={`overflow-hidden rounded-xl border border-line bg-pine-900/80 ${p.className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
          <IconRadar size={14} className="text-rose" />
          capture map {p.preset ? `· ${p.preset.name}` : ""}
        </p>
        <span className={`flex items-center gap-1.5 font-mono text-[10.5px] ${p.running ? "text-rose" : "text-dim"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${p.running ? "bg-rose pulse-dot-rose" : "bg-mint"}`} />
          {p.running ? "scanning" : `${p.shops.length} pins`}
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
          <defs>
            <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-mint)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-mint)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* base */}
          <rect width={W} height={H} fill="#0d1a15" />

          {/* city blocks */}
          {[
            [38, 38, 70, 52], [128, 38, 58, 52], [228, 38, 66, 52], [312, 38, 52, 52],
            [38, 118, 70, 70], [128, 118, 58, 70], [312, 118, 52, 70],
            [38, 232, 70, 64], [128, 232, 58, 64], [228, 232, 66, 64], [312, 232, 52, 64],
            [38, 330, 70, 54], [128, 330, 58, 54], [228, 330, 66, 54],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx={5} fill="#12241d" stroke="#1b352b" strokeWidth={1} />
          ))}

          {/* park */}
          <rect x={228} y={118} width={66} height={70} rx={8} fill="#14301f" stroke="#1f4530" />
          <circle cx={248} cy={140} r={5} fill="#1f4530" />
          <circle cx={270} cy={158} r={6} fill="#1f4530" />
          <circle cx={252} cy={170} r={4} fill="#1f4530" />

          {/* river */}
          <path d="M-10 385 C 90 355, 150 415, 240 395 S 380 360, 415 380" fill="none" stroke="#153844" strokeWidth={16} strokeLinecap="round" opacity={0.9} />
          <path d="M-10 385 C 90 355, 150 415, 240 395 S 380 360, 415 380" fill="none" stroke="#1d4b59" strokeWidth={2} strokeDasharray="1 7" opacity={0.7} />

          {/* roads */}
          {[120, 218, 304].map((x) => (
            <line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="#20403422" strokeWidth={10} />
          ))}
          {[104, 210, 308].map((y) => (
            <line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="#20403422" strokeWidth={10} />
          ))}
          {[120, 218, 304].map((x) => (
            <line key={`vc${x}`} x1={x} y1={0} x2={x} y2={H} stroke="#2c5243" strokeWidth={1.2} strokeDasharray="5 6" opacity={0.5} />
          ))}
          {[104, 210, 308].map((y) => (
            <line key={`hc${y}`} x1={0} y1={y} x2={W} y2={y} stroke="#2c5243" strokeWidth={1.2} strokeDasharray="5 6" opacity={0.5} />
          ))}
          <line x1={0} y1={30} x2={W} y2={250} stroke="#2c5243" strokeWidth={1} opacity={0.35} />

          {/* area labels */}
          {p.preset &&
            p.preset.areas.slice(0, 5).map((a, i) => {
              const spots = [
                [70, 60], [310, 74], [64, 260], [330, 260], [170, 350],
              ];
              return (
                <text key={a} x={spots[i][0]} y={spots[i][1]} className="fill-[#41614f]" fontSize={9.5} fontFamily="IBM Plex Mono, monospace" letterSpacing={1}>
                  {a.toUpperCase()}
                </text>
              );
            })}

          {/* radar sweep while running */}
          {p.running && (
            <g className="radar-sweep" style={{ transformOrigin: "200px 210px" }}>
              <path d="M200 210 L200 8 A202 202 0 0 1 301 35 Z" fill="url(#sweep)" />
            </g>
          )}
          {p.running && (
            <>
              <circle cx={200} cy={210} r={150} fill="none" stroke="var(--color-rose)" strokeWidth={1.5} className="radar-ring" opacity={0.8} />
              <circle cx={200} cy={210} r={150} fill="none" stroke="var(--color-mint)" strokeWidth={1} className="radar-ring" style={{ animationDelay: "1.3s" }} opacity={0.7} />
            </>
          )}

          {/* pins */}
          {p.shops.map((s) => {
            const open = isOpenNow(s);
            const hot = s.id === p.hoveredId || s.id === p.selectedId;
            const color = hot ? "var(--color-rose)" : open ? "var(--color-mint)" : "#55746462";
            return (
              <g
                key={s.id}
                transform={`translate(${px(s.x)}, ${py(s.y)})`}
                className="pin-in cursor-pointer"
                style={{ animationDelay: `${Math.min(s.capturedAt * 45, 1800)}ms` }}
                onMouseEnter={() => p.onHover(s.id)}
                onMouseLeave={() => p.onHover(null)}
                onClick={() => p.onSelect(s.id)}
              >
                {hot && <circle r={13} fill="var(--color-rose)" opacity={0.18} />}
                <circle r={hot ? 6.5 : 4.5} fill={color} stroke="#0a1411" strokeWidth={1.6} style={{ transition: "all .2s" }} />
                {hot && <circle r={10} fill="none" stroke="var(--color-rose)" strokeWidth={1.2} opacity={0.7} />}
              </g>
            );
          })}

          {/* hovered tooltip */}
          {hovered && (
            <g transform={`translate(${Math.min(Math.max(px(hovered.x), 90), W - 90)}, ${py(hovered.y) - 16})`} pointerEvents="none">
              <rect x={-82} y={-22} width={164} height={26} rx={6} fill="#0a1411" stroke="var(--color-line)" />
              <text textAnchor="middle" y={-5} fontSize={10.5} className="fill-[#eaf4ee]" fontFamily="IBM Plex Mono, monospace">
                {hovered.name.length > 24 ? hovered.name.slice(0, 23) + "…" : hovered.name}
              </text>
            </g>
          )}

          {/* crosshair */}
          <path d="M200 200v20M190 210h20" stroke="#41614f" strokeWidth={1} opacity={0.6} />
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line-soft px-4 py-3 font-mono text-[10.5px] text-dim">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mint" /> open now ({openCount})</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#557464]" /> closed</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose" /> focused</span>
        <span className="ml-auto flex items-center gap-1 text-dim"><IconPin size={11} /> synthetic bounds</span>
      </div>
    </div>
  );
}
