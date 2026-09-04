/** Deterministic seeded RNG (xmur3 + mulberry32) so each query+city is stable. */

export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export type Rng = () => number;

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const int = (r: Rng, min: number, max: number): number =>
  Math.floor(r() * (max - min + 1)) + min;

export const pick = <T,>(r: Rng, arr: readonly T[]): T =>
  arr[Math.floor(r() * arr.length)];

export const chance = (r: Rng, p: number): boolean => r() < p;

export const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Weighted pick — later items less likely. */
export function pickWeighted<T>(r: Rng, arr: readonly T[]): T {
  const w = arr.map((_, i) => arr.length - i);
  const total = w.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < arr.length; i++) {
    x -= w[i];
    if (x <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}
