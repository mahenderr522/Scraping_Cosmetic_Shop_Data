import { City, DataSource, Shop } from "./data";

export type LogKind = "sys" | "ok" | "warn" | "err" | "cap";
export interface LogLine {
  id: number;
  t: string;
  kind: LogKind;
  msg: string;
}

const stamp = () =>
  new Date().toLocaleTimeString("en-GB", { hour12: false });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface EngineOpts {
  query: string;
  city: City;
  mode: DataSource;
  shops: Shop[];
  onEvent: (kind: LogKind, msg: string) => void;
  onBatch: (batch: Shop[]) => void;
  onProgress: (pct: number) => void;
  onDone: (summary: { total: number; withPhone: number; durationMs: number }) => void;
}

/** Streams a captured shop list into the UI with a live pipeline log. Returns a cancel fn. */
export function runExtraction(opts: EngineOpts): () => void {
  const { query, city, mode, shops, onEvent, onBatch, onProgress, onDone } = opts;
  let cancelled = false;
  const startedAt = Date.now();

  const script = async () => {
    if (mode === "osm") {
      onEvent("sys", "overpass-api.de · live OpenStreetMap feed connected");
      await sleep(360);
      onEvent("ok", `query "${query}" around ${city.name} · ${shops.length} real places captured`);
    } else if (mode === "google") {
      onEvent("sys", "google response staged · name, phone, address, hours, website fields");
      await sleep(360);
      onEvent("ok", `textQuery "${query} in ${city.name}" · ${shops.length} official listings captured`);
    } else {
      onEvent("sys", `maps.google.com · search "${query}" near ${city.name}`);
      await sleep(380);
      onEvent("ok", "result grid resolved · hydrating place details");
      await sleep(300);
      onEvent("warn", "synthetic demo dataset — swap source to OSM/Google for live numbers");
    }
    await sleep(260);

    let withPhone = 0;
    let done = 0;
    const batch: Shop[] = [];

    for (const s of shops) {
      if (cancelled) return;
      batch.push(s);
      done += 1;
      if (s.phone) withPhone += 1;
      onEvent("cap", `capture ▸ ${s.name} · ${s.phone ?? "no phone listed"}`);
      if (done % 6 === 0) {
        onEvent("ok", `hydrating detail cards ${done}/${shops.length}`);
      }
      if (batch.length >= 5) {
        onBatch([...batch]);
        batch.length = 0;
      }
      onProgress(Math.round((done / Math.max(1, shops.length)) * 100));
      await sleep(150 + Math.random() * 90);
    }
    if (batch.length && !cancelled) onBatch([...batch]);

    if (cancelled) return;
    await sleep(280);

    if (mode === "osm") {
      onEvent("ok", `done · ${withPhone} real phone numbers from OSM tags (phone / contact:mobile)`);
    } else if (mode === "google") {
      onEvent("ok", `done · ${withPhone} phone numbers via Places internationalPhoneNumber`);
    } else {
      onEvent("ok", `done · ${shops.length} listings captured · ${withPhone} with phone`);
    }
    onDone({ total: shops.length, withPhone, durationMs: Date.now() - startedAt });
  };

  void script();
  return () => {
    cancelled = true;
  };
}

export { stamp };
