import React, { useEffect, useRef, useState } from "react";
import { IconCheck, IconAlert, IconPhone, IconDownload } from "./icons";

/* ---------------- scroll reveal ---------------- */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            io.disconnect();
          }
        });
      },
      { threshold: 0.14 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------------- animated counter ---------------- */
export function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const to = target;
    prev.current = target;
    if (from === to) {
      setVal(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setVal(from + (to - from) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ---------------- toasts ---------------- */
export interface Toast {
  id: number;
  kind: "ok" | "warn" | "copy" | "export";
  msg: string;
}

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col gap-2.5 max-w-[calc(100vw-2.5rem)]">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`toast-in group flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm shadow-xl shadow-black/30 backdrop-blur-sm transition-transform hover:translate-x-[-3px] ${
            t.kind === "warn"
              ? "border-amber/40 bg-[#2a2113]/95 text-amber"
              : "border-line bg-pine-850/95 text-ink"
          }`}
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${
              t.kind === "warn" ? "bg-amber/15 text-amber" : t.kind === "copy" ? "bg-mint/15 text-mint" : t.kind === "export" ? "bg-sky/15 text-sky" : "bg-rose/15 text-rose"
            }`}
          >
            {t.kind === "warn" ? <IconAlert size={14} /> : t.kind === "copy" ? <IconPhone size={13} /> : t.kind === "export" ? <IconDownload size={13} /> : <IconCheck size={13} />}
          </span>
          <span className="font-medium leading-snug">{t.msg}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- small bits ---------------- */
export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="relative inline-flex" aria-label={`${rating} out of 5`}>
      <span className="flex gap-[2px] text-line">
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} size={size} />
        ))}
      </span>
      <span
        className="absolute inset-0 flex gap-[2px] overflow-hidden text-amber"
        style={{ width: `${(rating / 5) * 100}%` }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} size={size} />
        ))}
      </span>
    </span>
  );
}

const StarIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
    <path d="M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.1l6.1-.7z" />
  </svg>
);

export function Tag({ children, tone = "mint" }: { children: React.ReactNode; tone?: "mint" | "rose" | "amber" | "sky" }) {
  const tones = {
    mint: "bg-mint/10 text-mint border-mint/25",
    rose: "bg-rose/10 text-rose border-rose/25",
    amber: "bg-amber/10 text-amber border-amber/30",
    sky: "bg-sky/10 text-sky border-sky/25",
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}
