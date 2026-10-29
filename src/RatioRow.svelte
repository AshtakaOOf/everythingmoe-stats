<script>
  // ratio row: label/value left, mini chart right
  import { ts, day, sgn, fmt } from "./lib.js";
  let { label, v, color, digits, a, b, since = null, hover = $bindable(null), onselect = null, norm = "raw" } = $props();
  let sel = $state(null);
  let w = $state(300);
  const H = 58;
  const s0 = $derived.by(() => { for (let i = a; i <= b; i++) if (Number.isFinite(v[i])) return i; return null; });
  const ext = $derived.by(() => { let lo = Infinity, hi = -Infinity; for (let i = a; i <= b; i++) if (Number.isFinite(v[i])) { lo = Math.min(lo, v[i]); hi = Math.max(hi, v[i]); } if (lo > hi) return [0, 1]; if (hi - lo < 1e-9) { lo -= Math.abs(lo) * 0.05 || 1; hi += Math.abs(hi) * 0.05 || 1; } return [lo, hi]; });
  const x = (i) => 3 + ((i - a) / Math.max(1, b - a)) * (w - 6);
  const y = (val) => H - 6 - ((val - ext[0]) / (ext[1] - ext[0])) * (H - 12);
  const d = $derived(s0 === null ? "" : Array.from({ length: b - s0 + 1 }, (_, k) => `${k ? "L" : "M"}${x(s0 + k).toFixed(1)},${y(v[s0 + k]).toFixed(1)}`).join(""));
  const shown = $derived(hover !== null && hover >= a && hover <= b ? hover : b);
  const ch = $derived(s0 === null ? NaN : (v[b] / v[s0] - 1) * 100);
  const at = (e) => { const px = e.clientX - e.currentTarget.getBoundingClientRect().left; return Math.max(a, Math.min(b, Math.round(a + ((px - 3) / (w - 6)) * (b - a)))); };
  const move = (e) => { hover = at(e); if (sel) sel = [sel[0], hover]; };
  const down = (e) => { if (!onselect || e.button) return; sel = [at(e), at(e)]; e.currentTarget.setPointerCapture(e.pointerId); };
  const up = () => { if (!sel) return; const [p, q] = sel; sel = null; Math.abs(q - p) >= 2 ? onselect(Math.min(p, q), Math.max(p, q)) : onselect(p - 7, p + 7); };
</script>
<div class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] items-center gap-4 py-2">
  <div class="min-w-0">
    <div class="truncate text-[11px] text-ink-3">{label}</div>
    <div class="num mt-0.5 text-lg font-medium leading-tight">{fmt(v[shown], digits)}</div>
    <div class="mt-0.5 truncate font-mono text-[10px] text-ink-3">{#if sel && Math.abs(sel[1] - sel[0]) >= 2}<span class="text-[#5b9cf6]">{day(ts[Math.min(...sel)], false)} – {day(ts[Math.max(...sel)], false)}</span>{:else if shown !== b}{day(ts[shown])}{:else if s0 === null}<span title={since ? `No data before ${since}` : null}>no data yet</span>{:else}<span class={ch < 0 ? "text-neg" : ch > 0 ? "text-pos" : ""}>{norm === "abs" ? sgn(v[b] - v[s0], digits) : sgn(ch, 1) + "%"}</span> {s0 > a ? `since ${day(ts[s0], false)}` : "in range"}{/if}</div>
  </div>
  <div bind:clientWidth={w} class="min-w-0" style="height:{H}px">
    <svg width={w} height={H} class="block cursor-crosshair touch-pan-y select-none" onpointermove={move} onpointerdown={down} onpointerup={up} onpointerleave={() => (hover = null)} aria-hidden="true">
      <rect width={w} height={H} class="fill-sunken" />
      {#if s0 !== null}<line x1="0" x2={w} y1={Math.round(y(v[s0])) + 0.5} y2={Math.round(y(v[s0])) + 0.5} class="stroke-line-strong" stroke-dasharray="2 3" />{/if}
      {#if sel}{@const x0 = Math.min(x(sel[0]), x(sel[1]))}{@const x1 = Math.max(x(sel[0]), x(sel[1]))}<rect x={x0} width={x1 - x0} height={H} fill="#5b9cf6" opacity="0.2" /><line x1={x0} x2={x0} y1="0" y2={H} stroke="#5b9cf6" /><line x1={x1} x2={x1} y1="0" y2={H} stroke="#5b9cf6" />{/if}
      <path {d} fill="none" stroke={color} stroke-width="1.5" stroke-linejoin="round" />
      {#if shown !== b}<line x1={x(shown)} x2={x(shown)} y1="0" y2={H} stroke="#666" stroke-dasharray="2 3" />{/if}
      {#if Number.isFinite(v[shown])}<rect x={x(shown) - 3} y={y(v[shown]) - 3} width="6" height="6" fill={color} />{/if}
    </svg>
  </div>
</div>
