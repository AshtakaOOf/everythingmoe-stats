import S from "./stats.json";
export const DAY = 864e5;
export const META = {
  users: ["Users", "#5b9cf6", "Registered accounts", "person-outline"],
  comments: ["Comments", "#a78bfa", "Comments posted", "chat-outline"],
  reviews: ["Reviews", "#f2b14c", "Reviews written", "rate-review-outline"],
  entries: ["Entries", "#3fc79a", "Sites listed", "language"],
  category: ["Categories", "#ef7a85", "Site categories", "category-outline"],
};
export const dates = S.dates;
export const ts = dates.map((d) => Date.parse(d));
export const builtAt = S.builtAt;
export const metrics = S.keys.map((k, i) => {
  const v = S.v[i];
  const ch = v.map((x, j) => (j ? x - v[j - 1] : NaN));
  return { key: k, label: META[k][0], color: META[k][1], desc: META[k][2], icon: META[k][3], v, ch, constant: v.every((x) => x === v[0]) };
});
export const growing = metrics.filter((m) => !m.constant);
const nf = new Intl.NumberFormat("en-US");
export const fmt = (n, d = 0) => (Number.isFinite(n) ? (d ? n.toFixed(d) : nf.format(Math.round(n))).replace("-", "−") : "—");
export const sgn = (n, d = 0) => (Number.isFinite(n) ? (n > 0 ? "+" : "") + fmt(n, d) : "—");
export const compact = (n) => (Math.abs(n) >= 1e3 ? +(n / 1e3).toFixed(n >= 1e4 ? 1 : 2) + "k" : fmt(n));
const MO = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
export const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const day = (t, y = true) => { const d = new Date(t); return `${MO[d.getUTCMonth()]} ${d.getUTCDate()}${y ? ", " + d.getUTCFullYear() : ""}`; };
export const month = (t) => { const d = new Date(t); return `${MO[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const avg = (a) => { const f = a.filter(Number.isFinite); return f.length ? f.reduce((s, x) => s + x, 0) / f.length : NaN; };
export function rolling(a, w = 7) { return a.map((_, i) => (i < 3 ? NaN : avg(a.slice(Math.max(1, i - w + 1), i + 1)))); }
export function niceStep(span) { const r = span / 4, p = 10 ** Math.floor(Math.log10(r)), f = r / p; return Math.max(1, (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p); }
export function ticks(lo, hi, n = 4) { const s = niceStep((hi - lo) * (4 / n)); const out = []; for (let x = Math.ceil(lo / s) * s; x <= hi; x += s) out.push(x); return out; }
export function months() {
  const out = new Map();
  ts.forEach((t, i) => { if (!i) return; const k = dates[i].slice(0, 7); if (!out.has(k)) out.set(k, { t, days: 0, sums: {} }); const o = out.get(k); o.days++; for (const m of metrics) o.sums[m.key] = (o.sums[m.key] || 0) + m.ch[i]; });
  return [...out.values()].reverse();
}
export function milestone(m) {
  const n = m.v.length, v1 = m.v[n - 1], v0 = m.v[0], step = niceStep(v1 - v0);
  const j = Math.max(0, n - 31), pace = (v1 - m.v[j]) / ((ts[n - 1] - ts[j]) / DAY);
  const next = Math.floor(v1 / step) * step + step, days = pace > 0 ? Math.ceil((next - v1) / pace) : null;
  let last = null; const target = next - step;
  for (let i = 0; i < n; i++) if (m.v[i] >= target) { last = ts[i]; break; }
  return { step, v0, v1, mult: v1 / v0, pace, next, days, eta: days ? ts[n - 1] + days * DAY : null, prev: target, prevAt: v0 >= target ? null : last, prog: (v1 - target) / step };
}
export const live = S.live;
