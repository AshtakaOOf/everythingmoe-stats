<script>
  import icons from "./icons.js";
  let { name, size = 16, class: cls = "" } = $props();
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="shrink-0 {cls}">{@html icons[name]}</svg>
