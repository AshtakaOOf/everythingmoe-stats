// Build-time fetch of stats data into src/stats.json.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
const BASE = "https://everythingmoe.com/data/cache";
const MAX_MISS = 7, CONCURRENCY = 1, RETRIES = 8, GAP_MS = 400, MAX_WAIT = 60000, START = Date.parse("2020-01-01");
const CACHE = new URL("../.cache/", import.meta.url);
mkdirSync(CACHE, { recursive: true });
const MISS = "__404__";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fromCache = (p) => { const b = readFileSync(p); return b.toString() === MISS ? null : b; };
const isJson = (b) => { try { const j = JSON.parse(b); return j && typeof j === "object"; } catch { return false; } };
const TRUST_404_AFTER = 30 * 864e5;
async function get(url, file, immutable, day) {
  const p = new URL(file, CACHE);
  const old = day != null && Date.now() - day > TRUST_404_AFTER;
  if (immutable && existsSync(p)) {
    const b = fromCache(p);
    if (b ? isJson(b) : old) return b; // re-fetch recent 404s and anything corrupt
  }
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (r.status === 404) { if (immutable && old) writeFileSync(p, MISS); return null; }
      if ((r.status === 429 || r.status >= 500) && i < RETRIES) {
        const ra = Number(r.headers.get("retry-after"));
        await sleep(Math.min(MAX_WAIT, ra > 0 ? ra * 1000 : 1000 * 2 ** i + Math.random() * 500));
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const b = Buffer.from(await r.arrayBuffer());
      if (!isJson(b)) throw new Error("not valid JSON (site down?)");
      writeFileSync(p, b);
      await sleep(GAP_MS); // be polite to the server
      return b;
    } catch (e) {
      if (i < RETRIES && e.name === "TimeoutError") { await sleep(500 * 2 ** i); continue; }
      if (existsSync(p)) { console.warn(`! ${url}: ${e.message}, using cache`); return fromCache(p); }
      throw new Error(`${url}: ${e.message}`); // don't silently treat errors as missing days
    }
  }
}
const ymd = (t) => new Date(t).toISOString().slice(0, 10);
const today = Date.parse(ymd(Date.now()));
const byDate = new Map(), missing = [];
let miss = 0, t = today;
while (miss < MAX_MISS && t >= START) {
  const batch = [];
  for (let i = 0; i < CONCURRENCY && t >= START; i++, t -= 864e5) batch.push(t);
  const res = await Promise.all(batch.map(async (d) => {
    const k = ymd(d).replaceAll("-", "");
    const b = await get(`${BASE}/statshistory/${k}.json`, `day-${k}.json`, d < today, d);
    try { return b && JSON.parse(b); } catch { return null; }
  }));
  for (let i = 0; i < batch.length; i++) {
    if (res[i] && typeof res[i] === "object") { byDate.set(ymd(batch[i]), res[i]); miss = 0; }
    else { missing.push(ymd(batch[i])); if (++miss >= MAX_MISS) break; }
  }
}
let live = null;
try { const b = await get(`${BASE}/site-stats.json`, "site-stats.json", false); if (b) live = JSON.parse(b); } catch (e) { console.warn("! live totals:", e.message); }
let annotations = [];
try {
  const b = await get(`${BASE}/statshistory/annotation.json`, "annotation.json", false);
  const j = b ? JSON.parse(b) : [];
  if (Array.isArray(j)) annotations = j
    .filter((o) => o && Number.isFinite(+o.time) && typeof o.name === "string" && o.name.trim())
    .map((o) => ({ d: ymd(+o.time * 1000), time: +o.time, name: o.name.trim().slice(0, 80) }))
    .sort((p, q) => p.time - q.time);
} catch (e) { console.warn("! annotations:", e.message); }
if (!byDate.size) throw new Error("No stats data available");
const rows = [...byDate].sort((a, b) => a[0].localeCompare(b[0]));
const first = rows[0][0];
const gaps = missing.filter((d) => d > first);
const keys = ["users", "comments", "reviews", "entries", "category"];
const out = {
  builtAt: new Date().toISOString(), keys,
  dates: rows.map((r) => r[0]),
  v: keys.map((k) => rows.map((r) => r[1][k] ?? null)),
  live: live && { time: live.time ?? null, v: keys.map((k) => live[k] ?? null) },
  annotations,
};
writeFileSync(new URL("../src/stats.json", import.meta.url), JSON.stringify(out));
console.log(`stats: ${rows.length} days, ${first} – ${rows.at(-1)[0]}; ${gaps.length} gap day(s)${gaps.length ? " [" + gaps.join(",") + "]" : ""}; live totals: ${live ? "yes" : "no"}; ${annotations.length} annotation(s)`);
