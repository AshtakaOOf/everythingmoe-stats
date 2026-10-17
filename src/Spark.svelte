<script>
  let { v, color } = $props();
  const d = $derived.by(() => { const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1; return v.map((y, i) => `${i ? "L" : "M"}${((i / (v.length - 1)) * 100).toFixed(1)},${(28 - ((y - lo) / r) * 26).toFixed(1)}`).join(""); });
</script>
<svg viewBox="0 0 100 30" preserveAspectRatio="none" class="h-full min-h-5 w-full" aria-hidden="true"><path {d} fill="none" stroke={color} stroke-width="1.5" vector-effect="non-scaling-stroke" /></svg>
