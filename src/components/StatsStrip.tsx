import { useCountUp } from "./ui";
import { IconList, IconPhone, IconStar, IconClock } from "./icons";

interface Props {
  total: number;
  phones: number;
  avgRating: number;
  openNow: number;
  elapsed: number | null;
  active: boolean;
}

function Stat({
  icon,
  label,
  value,
  suffix = "",
  decimals = 0,
  tone,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  tone: string;
  active: boolean;
}) {
  const v = useCountUp(active ? value : 0);
  return (
    <div className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-pine-850/60 sm:px-7">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition-transform group-hover:scale-110 group-hover:-rotate-3 ${tone}`}>
        {icon}
      </span>
      <div>
        <p className="font-display text-[26px] font-bold leading-none tracking-tight tabular-nums">
          {v.toFixed(decimals)}
          <span className="text-[17px] text-mute">{suffix}</span>
        </p>
        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">{label}</p>
      </div>
    </div>
  );
}

export default function StatsStrip(p: Props) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-line bg-pine-900/70 transition-opacity duration-500 ${
        p.active ? "opacity-100" : "opacity-45"
      }`}
    >
      <div className="grid grid-cols-2 divide-x divide-line-soft lg:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line-soft lg:[&>*:nth-child(n+3)]:border-t-0">
        <Stat
          icon={<IconList size={17} />}
          label="shops captured"
          value={p.total}
          tone="border-rose/30 bg-rose/10 text-rose"
          active={p.active}
        />
        <Stat
          icon={<IconPhone size={17} />}
          label="phone numbers"
          value={p.phones}
          tone="border-mint/30 bg-mint/10 text-mint"
          active={p.active}
        />
        <Stat
          icon={<IconStar size={16} />}
          label="avg rating"
          value={p.avgRating}
          suffix="★"
          decimals={1}
          tone="border-amber/30 bg-amber/10 text-amber"
          active={p.active}
        />
        <Stat
          icon={<IconClock size={17} />}
          label={`open now${p.elapsed ? ` · crawled in ${p.elapsed.toFixed(1)}s` : ""}`}
          value={p.openNow}
          tone="border-sky/30 bg-sky/10 text-sky"
          active={p.active}
        />
      </div>
    </section>
  );
}
