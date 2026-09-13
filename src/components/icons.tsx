import React from "react";

type P = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconSearch = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="10.5" cy="10.5" r="6.2" />
    <path d="M15.2 15.6 20.5 21M8 10.5h5M10.5 8v5" />
  </svg>
);

export const IconPin = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 21.5s-7-6.1-7-11.6A7 7 0 0 1 12 3a7 7 0 0 1 7 6.9c0 5.5-7 11.6-7 11.6Z" />
    <path d="M12 7.4l1 2.1 2.1 1-2.1 1-1 2.1-1-2.1-2.1-1 2.1-1z" strokeWidth={1.4} />
  </svg>
);

export const IconPhone = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5.2 3.8h3.4l1.6 4.3-2.1 1.6a12.8 12.8 0 0 0 6.2 6.2l1.6-2.1 4.3 1.6v3.4c0 .8-.7 1.5-1.5 1.5C10.6 20 4 13.4 3.7 5.3c0-.8.7-1.5 1.5-1.5Z" />
  </svg>
);

export const IconStar = ({ size, ...p }: P) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.1l6.1-.7z" />
  </svg>
);

export const IconGlobe = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M3.4 12h17.2M12 3.4c-2.5 2.3-3.8 5.2-3.8 8.6s1.3 6.3 3.8 8.6c2.5-2.3 3.8-5.2 3.8-8.6S14.5 5.7 12 3.4Z" />
  </svg>
);

export const IconClock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 6.8V12l3.4 2.2" />
  </svg>
);

export const IconCopy = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2" />
    <path d="M15.5 5.6V5a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 5v7A2.5 2.5 0 0 0 6 14.5h.6" />
  </svg>
);

export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.5 12.6 9.6 18 19.5 6.5" />
  </svg>
);

export const IconDownload = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15" />
  </svg>
);

export const IconX = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconExternal = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 0 6.5 20h10a2.5 2.5 0 0 0 2.5-2.5V14M13.5 4H20v6.5M20 4l-8.5 8.5" />
  </svg>
);

export const IconRadar = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <circle cx="12" cy="12" r="4.6" opacity={0.55} />
    <path d="M12 12l6-6.4" />
    <circle cx="15" cy="14.6" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSpark = ({ size, ...p }: P) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2.5l2.2 6.2 6.3 2.1-6.3 2.1L12 19.1l-2.2-6.2-6.3-2.1 6.3-2.1z" />
    <path d="M19 15.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" opacity={0.7} />
  </svg>
);

export const IconArrow = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 12h15.5M13.5 6l6 6-6 6" />
  </svg>
);

export const IconChevronL = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </svg>
);

export const IconChevronR = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </svg>
);

export const IconAlert = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 4 2.8 19.5h18.4L12 4Z" />
    <path d="M12 10v4.2M12 17.2v.1" />
  </svg>
);

export const IconList = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <circle cx="4.7" cy="6.5" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="4.7" cy="12" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="4.7" cy="17.5" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);

export const IconFilter = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);

export const IconZap = ({ size, ...p }: P) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M13.2 2.5 5 13.4h5.2l-1.4 8.1L17 10.6h-5.2z" />
  </svg>
);

export const IconCamera = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 8.2h3l1.6-2.4h6.8L17 8.2h3v11H4z" />
    <circle cx="12" cy="13.4" r="3.1" />
  </svg>
);

export const IconBadge = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.5l2 1.9 2.7-.4 1 2.6 2.6 1-.4 2.7 1.9 2-1.9 2 .4 2.7-2.6 1-1 2.6-2.7-.4-2 1.9-2-1.9-2.7.4-1-2.6-2.6-1 .4-2.7-1.9-2 1.9-2-.4-2.7 2.6-1 1-2.6 2.7.4z" />
    <path d="M9 12.4l2 2 4-4.2" />
  </svg>
);

/** Brand mark — pin + sparkle, two-tone */
export const LogoMark = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 2.8c-5.9 0-10.6 4.6-10.6 10.4C5.4 21.3 16 29.4 16 29.4s10.6-8.1 10.6-16.2C26.6 7.4 21.9 2.8 16 2.8Z"
      fill="var(--color-rose)"
    />
    <path
      d="M16 8.6l1.7 3.6 3.6 1.7-3.6 1.7L16 19.2l-1.7-3.6-3.6-1.7 3.6-1.7z"
      fill="var(--color-pine-950)"
    />
    <circle cx="23.4" cy="8" r="1.4" fill="var(--color-mint)" />
  </svg>
);
