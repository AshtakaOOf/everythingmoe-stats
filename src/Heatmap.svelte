<script>
  // calendar heatmap: month window, click = week, drag = span
  import { ts, dates, day, month, sgn, WD } from "./lib.js";
  import Icon from "./Icon.svelte";
  let { m, a, b, onselect } = $props();
  let w = $state(700), hi = $state(null), sel = $state(null), start = $state(null);
  const MONTHS = [...new Set(dates.map((d) => d.slice(0, 7)))];
  const L = 30, T = 18, G = 3;
  const fit = $derived(Math.max(1, Math.min(MONTHS.length, Math.floor((w - L) / (4.6 * (24 + G))))));
  const m0 = $derived(start === null ? MONTHS.length - fit : Math.max(0, Math.min(start, MONTHS.length - fit)));
  const i0 = $derived(dates.findIndex((d) => d.startsWith(MONTHS[m0])));
  const i1 = $derived(dates.findLastIndex((d) => d.startsWith(MONTHS[m0 + fit - 1])));
  const pad = $derived((new Date(ts[i0]).getUTCDay() + 6) % 7);
  const weeks = $derived(Math.ceil((i1 - i0 + 1 + pad) / 7));
  const cell = $derived(Math.max(8, Math.min(44, (w - L) / weeks - G)));
  const H = $derived(T + 7 * (cell + G));
  const pos = (i) => [L + Math.floor((i - i0 + pad) / 7) * (cell + G), T + ((i - i0 + pad) % 7) * (cell + G)];
  const max = $derived(Math.max(1, ...m.ch.slice(1).filter(Number.isFinite)));
  const idx = $derived(Array.from({ length: i1 - i0 + 1 }, (_, k) => i0 + k));
  const heads = $derived(idx.filter((i) => i === i0 || dates[i].endsWith("-01")));
  const shift = (d) => (start = Math.max(0, Math.min(MONTHS.length - fit, m0 + d)));
  const idxAt = (e) => { const r = e.currentTarget.getBoundingClientRect(); const c = Math.floor((e.clientX - r.left - L) / (cell + G)), rr = Math.floor((e.clientY - r.top - T) / (cell + G)); const i = i0 + c * 7 + rr - pad; return c >= 0 && rr >= 0 && rr < 7 && i >= i0 && i <= i1 ? i : null; };
  const live = (p, q) => { if (p > q) [p, q] = [q, p]; if (q - p < 2) { p -= (new Date(ts[p]).getUTCDay() + 6) % 7; q = p + 6; } onselect(p, q); };
  function move(e) { hi = idxAt(e); if (sel && hi !== null) { sel = [sel[0], hi]; live(...sel); } }
  function down(e) { const i = idxAt(e); if (i === null || e.button) return; sel = [i, i]; live(i, i); e.currentTarget.setPointerCapture(e.pointerId); }
  function up() { sel = null; }
  function key(e) { if (e.key === "ArrowLeft") shift(-1); else if (e.key === "ArrowRight") shift(1); else return; e.preventDefault(); e.stopPropagation(); }
  const inSel = (i) => sel && i >= Math.min(...sel) && i <= Math.max(...sel);
</script>
<div class="relative" bind:clientWidth={w}>
  <div class="mb-2 flex items-center gap-1 text-[12px] text-ink-2">
    <button class="inline-flex size-6 items-center justify-center rounded-[3px] border border-line-strong hover:text-ink disabled:opacity-30" disabled={m0 === 0} onclick={() => shift(-1)} aria-label="Previous month"><Icon name="chevron-left" /></button>
    <button class="inline-flex size-6 items-center justify-center rounded-[3px] border border-line-strong hover:text-ink disabled:opacity-30" disabled={m0 + fit >= MONTHS.length} onclick={() => shift(1)} aria-label="Next month"><Icon name="chevron-right" /></button>
    <span class="cal-window ml-1 font-mono text-[11px]">{month(ts[i0])} – {month(ts[i1])}</span>
    <span class="ml-auto text-[10px] text-ink-3">{m0 + 1}–{m0 + fit} of {MONTHS.length} months</span>
  </div>
  <svg width={w} height={H} tabindex="0" class="block cursor-pointer touch-pan-y select-none" role="application" aria-label="Calendar heatmap (arrow keys change month)" onkeydown={key} onpointermove={move} onpointerdown={down} onpointerup={up} onpointerleave={() => (hi = null)}>
    {#each heads as i}<text x={pos(i)[0]} y="11" class="fill-ink-3 font-mono text-[10px]">{day(ts[i], false).split(" ")[0]}</text>{/each}
    {#each [0, 2, 4, 6] as r}<text x={L - 6} y={T + r * (cell + G) + cell / 2 + 3.5} text-anchor="end" class="fill-ink-3 font-mono text-[10px]">{WD[r]}</text>{/each}
    {#each idx as i (i)}
      {@const c = m.ch[i]}
      {@const [cx, cy] = pos(i)}
      {@const empty = i === 0 || !(c > 0)}
      <rect x={cx} y={cy} width={cell} height={cell} rx="2" class={empty ? "fill-raised" : ""} fill={empty ? null : m.color} opacity={empty ? (i < a || i > b ? 0.5 : 1) : (0.2 + 0.8 * Math.sqrt(c / max)) * (i < a || i > b ? 0.4 : 1)} stroke={hi === i ? "#e7e7e7" : inSel(i) ? "#5b9cf6" : "none"} stroke-width={inSel(i) ? 2 : 1} />
    {/each}
    {#if (a > 0 || b < ts.length - 1) && b >= i0 && a <= i1}{@const [x0] = pos(Math.max(a, i0))}{@const [x1] = pos(Math.min(b, i1))}<rect x={x0 - 1.5} y={T - 1.5} width={x1 - x0 + cell + 3} height={7 * (cell + G)} fill="none" class="stroke-ink-3" stroke-dasharray="3 3" />{/if}
  </svg>
  {#if hi !== null}
    {@const [cx, cy] = pos(hi)}
    <div class="pointer-events-none absolute z-10 rounded-[3px] border border-line-strong bg-raised/95 px-2 py-1 text-[11px] shadow-lg" style="left:{Math.min(cx + cell + 6, w - 140)}px;top:{cy + 30}px">
      <div class="font-mono text-ink-3">{day(ts[hi])}</div><div class="num"><span style="color:{m.color}">{m.label}</span> {hi > 0 && hi <= m.first ? "no data" : sgn(m.ch[hi])}</div>
    </div>
  {/if}
  <div class="mt-2 flex items-center gap-1 text-[10px] text-ink-3">less {#each [0.2, 0.45, 0.7, 1] as o}<span class="size-2.5 rounded-[2px]" style="background:{m.color};opacity:{o}"></span>{/each} more <span class="ml-auto">click = week - press and drag = span</span></div>
</div>
