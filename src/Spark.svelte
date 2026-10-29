<script>
  let { v, color } = $props();
  // only the days that have data
  const d = $derived.by(() => { const f = v.filter(Number.isFinite); if (f.length < 2) return ""; const lo = Math.min(...f), hi = Math.max(...f), r = hi - lo || 1; return f.map((y, i) => `${i ? "L" : "M"}${((i / (f.length - 1)) * 100).toFixed(1)},${(28 - ((y - lo) / r) * 26).toFixed(1)}`).join(""); });
</script>
<svg viewBox="0 0 100 30" preserveAspectRatio="none" class="h-full min-h-5 w-full" aria-hidden="true"><path {d} fill="none" stroke={color} stroke-width="1.5" vector-effect="non-scaling-stroke" /></svg>
