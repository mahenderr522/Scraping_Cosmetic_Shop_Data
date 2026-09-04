import { Shop, generateShops } from "./data";
import { rng, hashSeed, int, chance } from "./rand";

export type LogKind = "sys" | "ok" | "warn" | "data";
export interface LogLine {
  id: number;
  time: string;
  kind: LogKind;
  msg: string;
}

export interface EngineHooks {
  onLog: (kind: LogKind, msg: string) => void;
  onBatch: (shops: Shop[]) => void;
  onProgress: (pct: number) => void;
  onPhase: (phase: string) => void;
  onDone: (stats: { total: number; phones: number; elapsed: number; aborted: boolean }) => void;
}

export interface CancelToken {
  cancelled: boolean;
}

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

const stamp = () => {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
};

/**
 * Demo extraction pipeline. Streams synthetic (deterministic per query+city)
 * Google-Maps-style place results in batches, mimicking a paginated local
 * search scrape. Swap `generateShops` for a real endpoint adapter to go live.
 */
export async function runExtraction(
  query: string,
  city: string,
  token: CancelToken,
  hooks: EngineHooks
): Promise<void> {
  const t0 = performance.now();
  const r = rng(hashSeed(`engine|${query}|${city}`));
  const { shops } = generateShops(query, city);
  const phones = shops.filter((s) => s.phone).length;

  const log = (kind: LogKind, msg: string) => hooks.onLog(kind, msg);

  log("sys", `glowscout engine v2.4 · source: synth-demo (deterministic)`);
  await sleep(380);
  if (token.cancelled) return abort();
  log("sys", `query → “${query}” near “${city}”`);
  hooks.onPhase("Resolving search");
  await sleep(520);
  if (token.cancelled) return abort();
  log("ok", "place search resolved · viewport locked to city bounds");
  await sleep(340);

  const pageSize = int(r, 16, 20);
  const pages = Math.ceil(shops.length / pageSize);
  let captured = 0;
  let offset = 0;

  for (let p = 1; p <= pages; p++) {
    if (token.cancelled) return abort();
    hooks.onPhase(`Crawling page ${p}/${pages}`);
    log("sys", `scrolling results · page ${p} of ${pages}…`);
    await sleep(int(r, 500, 800));
    if (token.cancelled) return abort();

    // occasional deterministic rate-limit flavor
    if (p === 2 && chance(r, 0.45)) {
      log("warn", "HTTP 429 · backing off 900ms with jitter");
      await sleep(900);
      if (token.cancelled) return abort();
      log("ok", "retry succeeded · resuming crawl");
      await sleep(260);
    }

    const slice = shops.slice(offset, offset + pageSize);
    // stream in sub-batches so the table fills gradually
    let i = 0;
    while (i < slice.length) {
      if (token.cancelled) return abort();
      const chunk = slice.slice(i, i + int(r, 3, 5));
      chunk.forEach((s, idx) => (s.capturedAt = offset + i + idx));
      hooks.onBatch(chunk);
      captured += chunk.length;
      hooks.onProgress(Math.round((captured / shops.length) * 88));
      log("data", `captured ${chunk.length} places · “${chunk[0].name}” ${chunk[0].phone ? `· ${chunk[0].phone}` : "· no phone listed"}`);
      i += chunk.length;
      await sleep(int(r, 230, 420));
    }
    offset += pageSize;
  }

  if (token.cancelled) return abort();
  hooks.onPhase("Normalizing fields");
  log("sys", "extracting fields · phone / address / hours / website");
  await sleep(620);
  if (token.cancelled) return abort();
  hooks.onProgress(96);
  log("sys", `dedupe + normalize · ${shops.length} unique listings`);
  await sleep(420);
  if (token.cancelled) return abort();

  const elapsed = (performance.now() - t0) / 1000;
  hooks.onProgress(100);
  hooks.onPhase("Complete");
  log("ok", `done in ${elapsed.toFixed(1)}s · ${shops.length} shops · ${phones} phone numbers captured`);
  hooks.onDone({ total: shops.length, phones, elapsed, aborted: false });
  return;

  function abort() {
    hooks.onPhase("Aborted");
    log("warn", `aborted by operator · ${captured}/${shops.length} listings kept`);
    hooks.onDone({ total: captured, phones, elapsed: (performance.now() - t0) / 1000, aborted: true });
  }
}
