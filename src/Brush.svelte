<script>
  // range brush: select, pan, resize edges
  import { ts, day } from "./lib.js";
  let { v, color, a = $bindable(), b = $bindable(), min = 2, compact = false, notes = [] } = $props();
  let w = $state(600), drag = null;
  const H = $derived(compact ? 30 : 46);
  const n = ts.length - 1;
  const x = (i) => (i / n) * w;
  const idx = (px) => Math.max(0, Math.min(n, Math.round((px / w) * n)));
  const uid = Math.random().toString(36).slice(2, 7);
  const pts = $derived.by(() => { const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1; return v.map((y, i) => `${x(i).toFixed(1)},${(H - 2 - ((y - lo) / r) * (H - 6)).toFixed(1)}`); });
  const line = $derived("M" + pts.join("L"));
  const area = $derived.by(() => { const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1; return "M0," + H + v.map((y, i) => `L${x(i).toFixed(1)},${(H - 2 - ((y - lo) / r) * (H - 6)).toFixed(1)}`).join("") + `L${w},${H}Z`; });
  function down(e) {
    const r = e.currentTarget.getBoundingClientRect(), px = e.clientX - r.left, i = idx(px);
    const near = (j) => Math.abs(x(j) - px) < (e.pointerType === "touch" ? 16 : 8);
    drag = near(a) ? { m: "a" } : near(b) ? { m: "b" } : i > a && i < b && b - a < n ? { m: "pan", o: i, a0: a, b0: b } : { m: "new", o: i };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!drag) return;
    const i = idx(e.clientX - e.currentTarget.getBoundingClientRect().left);
    if (drag.m === "a") a = Math.min(i, b - min);
    else if (drag.m === "b") b = Math.max(i, a + min);
    else if (drag.m === "pan") { const d = Math.max(-drag.a0, Math.min(n - drag.b0, i - drag.o)); a = drag.a0 + d; b = drag.b0 + d; }
    else { let lo = Math.min(i, drag.o), hi = Math.max(i, drag.o); if (hi - lo >= min) { a = lo; b = hi; } }
  }
  function key(e) {
    const s = e.shiftKey ? 7 : 1;
    if (e.key === "ArrowLeft" && a > 0) { const d = Math.min(s, a); a -= d; b -= d; }
    else if (e.key === "ArrowRight" && b < n) { const d = Math.min(s, n - b); a += d; b += d; }
    else return;
    e.preventDefault();
  }
</script>
<div bind:clientWidth={w} class="relative">
  <svg width={w} height={H} class="block cursor-crosshair touch-none select-none" role="slider" tabindex="0" aria-label="Date range (arrow keys to pan)" aria-valuemin="0" aria-valuemax={n} aria-valuenow={a} aria-valuetext="{day(ts[a])} to {day(ts[b])}" onpointerdown={down} onpointermove={move} onpointerup={() => (drag = null)} onkeydown={key}>
    <!-- unselected vs selected visuals -->
    <defs>
      <clipPath id="brIn{uid}"><rect x={x(a)} width={Math.max(0, x(b) - x(a))} height={H} /></clipPath>
      <clipPath id="brOut{uid}"><rect width={x(a)} height={H} /><rect x={x(b)} width={Math.max(0, w - x(b))} height={H} /></clipPath>
      <pattern id="brHatch{uid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="stroke-ink opacity-[.09] hc:opacity-0" stroke-width="1.5" /></pattern>
    </defs>
    <g clip-path="url(#brOut{uid})">
      <rect width={w} height={H} class="fill-transparent hc:fill-[#2a2a2a]" />
      <path d={area} class="fill-ink-3 opacity-25 hc:fill-[#4a4a4a] hc:opacity-100" />
      <path d={line} fill="none" class="stroke-ink-3 hc:stroke-[#c8c8c8]" stroke-width="1" />
      <rect width={w} height={H} fill="url(#brHatch{uid})" />
    </g>
    <g clip-path="url(#brIn{uid})">
      <rect width={w} height={H} fill={color} class="opacity-10 hc:opacity-20" />
      <path d={area} fill={color} class="opacity-60 hc:opacity-100" />
      <path d={line} fill="none" stroke={color} stroke-width="1.5" />
    </g>
    {#each notes as n}<line x1={x(n.i)} x2={x(n.i)} y2={H} stroke-dasharray="2 2" class="pointer-events-none stroke-[#e06c6c] opacity-60 hc:stroke-[#ff8f8f] hc:opacity-100"><title>{n.name}</title></line>{/each}
    <rect x={x(a)} width={x(b) - x(a)} height={H - 1} y="0.5" fill="none" class="stroke-ink-2 hc:stroke-ink hc:[stroke-width:2]" />
    <rect x={x(a) - 2} width="4" y={H * 0.2} height={H * 0.6} rx="1" class="fill-ink cursor-ew-resize hc:stroke-base hc:[stroke-width:1.5] hc:[transform:scaleX(1.6)] hc:[transform-box:fill-box] hc:[transform-origin:center]" />
    <rect x={x(b) - 2} width="4" y={H * 0.2} height={H * 0.6} rx="1" class="fill-ink cursor-ew-resize hc:stroke-base hc:[stroke-width:1.5] hc:[transform:scaleX(1.6)] hc:[transform-box:fill-box] hc:[transform-origin:center]" />
  </svg>
  <div class="mt-0.5 flex justify-center font-mono text-[10px] sm:justify-between text-ink-3"><span class="hidden sm:inline">{day(ts[0], false)}</span><span class="text-ink-2">{day(ts[a], false)} – {day(ts[b])} - {b - a}d</span><span class="hidden sm:inline">{day(ts[n], false)}</span></div>
</div>
