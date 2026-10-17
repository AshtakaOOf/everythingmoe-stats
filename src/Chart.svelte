<script>
  // lightweight SVG line chart with hover
  import { ts, day, ticks, fmt } from "./lib.js";
  let { series, a = 0, b = ts.length - 1, h = 220, bars = null, zero = false, unit = "", endLabels = false, onselect = null } = $props();
  let sel = $state(null); // [start, end] while dragging
  let w = $state(600), hi = $state(null);
  const P = $derived({ l: 54, r: endLabels ? 66 : 14, t: 14, b: 28 });
  const H = $derived(h - (bars ? 50 : 0));
  const idx = $derived(Array.from({ length: b - a + 1 }, (_, i) => a + i));
  const ext = $derived.by(() => {
    let lo = Infinity, hi2 = -Infinity;
    for (const s of series) for (const i of idx) { const y = s.v[i]; if (Number.isFinite(y)) { lo = Math.min(lo, y); hi2 = Math.max(hi2, y); } }
    if (zero) lo = Math.min(0, lo);
    const pad = (hi2 - lo) * 0.06 || 1; return [lo - (zero && lo === 0 ? 0 : pad), hi2 + pad];
  });
  const x = (i) => P.l + ((i - a) / Math.max(1, b - a)) * (w - P.l - P.r);
  const y = (v) => P.t + (1 - (v - ext[0]) / (ext[1] - ext[0])) * (H - P.t - P.b);
  const path = (v) => { let d = "", pen = false; for (const i of idx) { const yy = v[i]; if (!Number.isFinite(yy)) { pen = false; continue; } d += (pen ? "L" : "M") + x(i).toFixed(1) + "," + y(yy).toFixed(1); pen = true; } return d; };
  // end labels: avoid overlap
  const labelY = $derived.by(() => {
    if (!endLabels) return [];
    const o = series.map((s, k) => ({ k, y: y(s.v[b]) })).sort((p, q) => p.y - q.y);
    for (let i = 1; i < o.length; i++) o[i].y = Math.max(o[i].y, o[i - 1].y + 12);
    const out = []; for (const e of o) out[e.k] = e.y; return out;
  });
  const yt = $derived(ticks(ext[0], ext[1]));
  const xt = $derived.by(() => { const n = Math.max(2, Math.floor(w / 110)); const st = Math.max(1, Math.ceil(idx.length / n)); return idx.filter((_, k) => k % st === 0); });
  const bmax = $derived(bars ? Math.max(1, ...idx.map((i) => Math.abs(bars.v[i]) || 0)) : 1);
  const at = (e) => { const px = e.clientX - e.currentTarget.getBoundingClientRect().left; return Math.max(a, Math.min(b, Math.round(a + ((px - P.l) / (w - P.l - P.r)) * (b - a)))); };
  function move(e) { hi = at(e); if (sel) sel = [sel[0], hi]; }
  // click = 2-week window, drag = exact span
  function down(e) { if (!onselect || e.button) return; sel = [at(e), at(e)]; e.currentTarget.setPointerCapture(e.pointerId); }
  function up() { if (!sel) return; const [p, q] = sel; sel = null; Math.abs(q - p) >= 2 ? onselect(Math.min(p, q), Math.max(p, q)) : onselect(p - 7, p + 7); }
</script>
<div class="relative select-none" bind:clientWidth={w}>
  <svg width={w} height={h} role="img" aria-label="chart" onpointermove={move} onpointerdown={down} onpointerup={up} onpointerleave={() => (hi = null)} class="block touch-pan-y {onselect ? 'cursor-crosshair' : ''}">
    {#if sel}{@const x0 = Math.min(x(sel[0]), x(sel[1]))}{@const x1 = Math.max(x(sel[0]), x(sel[1]))}<rect x={x0} width={x1 - x0} y={P.t} height={h - P.t} fill="#5b9cf6" opacity="0.18" /><line x1={x0} x2={x0} y1={P.t} y2={h} stroke="#5b9cf6" /><line x1={x1} x2={x1} y1={P.t} y2={h} stroke="#5b9cf6" />{#if Math.abs(sel[1] - sel[0]) >= 2}<text x={(x0 + x1) / 2} y={P.t + 10} text-anchor="middle" class="fill-ink font-mono text-[10px]">{day(ts[Math.min(...sel)], false)} – {day(ts[Math.max(...sel)], false)} ({Math.abs(sel[1] - sel[0])}d)</text>{/if}{/if}
    {#each yt as t}<line x1={P.l} x2={w - P.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#3b3b3b" : "#2a2a2a"} class="hc:stroke-line-strong" /><text x={P.l - 10} y={y(t) + 3} text-anchor="end" class="fill-ink-3 font-mono text-[10px]">{Math.abs(t) >= 1e3 ? +(t / 1e3).toFixed(1) + "k" : t}{unit}</text>{/each}
    {#each xt as i}<text x={x(i)} y={H - 9} text-anchor="middle" class="fill-ink-3 font-mono text-[10px]">{day(ts[i], false)}</text>{/each}
    {#each series as s}<path d={path(s.v)} fill="none" stroke-linejoin="round" stroke={s.color} stroke-width={s.thin ? 1.25 : 1.75} stroke-dasharray={s.dash ? "3 3" : null} opacity={s.thin ? 0.7 : 1} />{/each}
    {#if endLabels}{#each series as s, k}{#if Number.isFinite(s.v[b])}<rect x={x(b) - 3} y={y(s.v[b]) - 3} width="6" height="6" fill={s.color} /><text x={x(b) + 8} y={labelY[k] + 3.5} fill={s.color} class="font-mono text-[10px] font-medium">{s.f ? s.f(s.v[b]) : fmt(s.v[b])}</text>{/if}{/each}{/if}
    {#if bars}
      {@const bw = Math.max(1, (w - P.l - P.r) / idx.length - 1)}
      {#each idx as i}{@const v = bars.v[i]}{#if Number.isFinite(v) && v}<rect x={x(i) - bw / 2} width={bw} y={v > 0 ? h - 4 - (v / bmax) * 40 : h - 4} height={(Math.abs(v) / bmax) * 40} fill={v > 0 ? bars.color : "#e5675f"} opacity={hi === i ? 1 : 0.55} />{/if}{/each}
    {/if}
    {#if hi !== null}<line x1={x(hi)} x2={x(hi)} y1={P.t} y2={h} class="stroke-ink-3" />{#each series as s}{#if Number.isFinite(s.v[hi])}<circle cx={x(hi)} cy={y(s.v[hi])} r="3" fill={s.color} />{/if}{/each}{/if}
  </svg>
  {#if hi !== null}
    <div class="pointer-events-none absolute top-1 z-10 min-w-32 rounded border border-line-strong bg-raised/95 px-2 py-1.5 text-[11px] shadow-lg" style="left:{Math.min(x(hi) + 10, w - 150)}px">
      <div class="mb-1 font-mono text-ink-3">{day(ts[hi])}</div>
      {#each series.filter((s) => s.label) as s}<div class="flex justify-between gap-3"><span style="color:{s.color}">{s.label}</span><span class="num">{s.f ? s.f(s.v[hi]) : fmt(s.v[hi])}</span></div>{/each}
    {#if bars}<div class="flex justify-between gap-3 text-ink-2"><span>Δ day</span><span class="num">{bars.f(bars.v[hi])}</span></div>{/if}
    </div>
  {/if}
</div>
