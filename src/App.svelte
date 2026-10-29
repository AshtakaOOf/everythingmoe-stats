<script>
  import { onMount } from "svelte";
  import Chart from "./Chart.svelte";
  import Spark from "./Spark.svelte";
  import Brush from "./Brush.svelte";
  import Icon from "./Icon.svelte";
  import Logo from "./Logo.svelte";
  import RatioRow from "./RatioRow.svelte";
  import Heatmap from "./Heatmap.svelte";
  import { metrics, growing, ts, dates, builtAt, live, fmt, sgn, compact, day, month, rolling, months, milestone, WD, DAY, annotations } from "./lib.js";

  const N = ts.length, last = N - 1;
  const SECTIONS = [["overview", "Overview", "dashboard-outline"], ["trend", "Trend", "show-chart"], ["growth", "Growth", "trending-up"], ["calendar", "Calendar", "calendar-month-outline"], ["monthly", "Monthly", "table-chart-outline"], ["top", "Top days", "star-outline"], ["milestones", "Milestones", "flag-outline"], ["data", "Data", "database-outline"]];
  const RANGES = [["7D", 7], ["30D", 30], ["90D", 90], ["All", Infinity]];
  let ratioHover = $state(null), pinned = $state(false);
  $effect(() => { document.documentElement.classList.toggle("pinned", pinned); });
  function togglePin() { pinned = !pinned; try { localStorage.setItem("pinRange", pinned ? "1" : "0"); } catch {} }
  let a = $state(0), b = $state(last), key = $state("users"), active = $state("overview"), showAvg = $state(true), hc = $state(false);
  const preset = $derived(b === last ? RANGES.find((r) => a === Math.max(0, last - r[1]))?.[0] : null);
  // shared range setter
  function select(p, q) { p = Math.max(0, Math.round(p)); q = Math.min(last, Math.round(q)); if (q - p < 2) { if (p === 0) q = Math.min(last, 2); else p = Math.max(0, q - 2); } a = p; b = q; }
  const monthIdx = (t) => { const k = new Date(t).toISOString().slice(0, 7); return [dates.findIndex((d) => d.startsWith(k)), dates.findLastIndex((d) => d.startsWith(k))]; };
  // month row drag selection
  let mDrag = $state(null);
  function mSpan(p, q) { const [a0, b0] = monthIdx(mon[p].t), [a1, b1] = monthIdx(mon[q].t); select(Math.min(a0, a1), Math.max(b0, b1)); }
  const setRange = (d) => { a = Math.max(0, last - d); b = last; };
  const m = $derived(metrics.find((x) => x.key === key));
  const avg7 = $derived(rolling(m.ch));
  const span = $derived(Math.max(1, (ts[b] - ts[a]) / DAY));
  // growth normalization modes
  const NORMS = [["raw", "Raw", "percent", "Percent change of the raw totals"], ["user", "Per user", "person-outline", "Percent change of each metric divided by users that day"], ["abs", "Added", "add", "Absolute amount added since range start"]];
  let norm = $state("raw");
  function setNorm(v) { norm = v; try { localStorage.setItem("norm", v); } catch {} }
  const U = metrics.find((x) => x.key === "users").v;
  const nv = (x) => (norm === "user" ? x.v.map((y, i) => y / U[i]) : x.v);
  // metrics added later (threads) start at their first day
  const s0 = (x) => Math.max(a, x.first);
  const pct = (v, s = a) => (v[s] ? ((v[b] - v[s]) / v[s]) * 100 : NaN);
  const rel = $derived(growing.filter((g) => norm !== "user" || g.key !== "users").map((g) => { const v = nv(g), s = s0(g), v0 = v[s]; return { label: g.label + (norm === "user" ? " / user" : ""), color: g.color, icon: g.icon, v: v.map((x, i) => (i < s ? NaN : norm === "abs" ? x - v0 : v0 ? ((x - v0) / v0) * 100 : NaN)), f: norm === "abs" ? (n) => sgn(n) : (n) => sgn(n, 1) + "%" }; }));
  const RATIOS = [["Comments / user", "comments", "users", 2], ["Reviews / user", "reviews", "users", 3], ["Threads / 1k users", "thread", "users", 1, 1e3], ["Comments / entry", "comments", "entries", 2], ["Reviews / entry", "reviews", "entries", 2]];
  const mIcon = Object.fromEntries(metrics.map((x) => [x.key, [x.icon, x.color]]));
  const get = (k) => metrics.find((x) => x.key === k);
  const mon = months();
  const monMax = Object.fromEntries(metrics.map((x) => [x.key, Math.max(1, ...mon.filter((o) => o.n[x.key]).map((o) => Math.abs(o.sums[x.key] / o.n[x.key])))]));
  const top = $derived(Array.from({ length: N - 1 }, (_, i) => i + 1).filter((i) => m.ch[i] > 0).sort((p, q) => m.ch[q] - m.ch[p]).slice(0, 8));
  const med = $derived.by(() => { const s = m.ch.slice(1).filter(Number.isFinite).sort((p, q) => p - q); return s[s.length >> 1] || 1; });
  const wd = $derived.by(() => { const s = Array(7).fill(0), c = Array(7).fill(0); for (let i = Math.max(1, a); i <= b; i++) { if (!Number.isFinite(m.ch[i])) continue; const k = (new Date(ts[i] - DAY).getUTCDay() + 6) % 7; s[k] += m.ch[i]; c[k]++; } return s.map((x, i) => (c[i] ? x / c[i] : NaN)); });
  const wdMax = $derived(Math.max(0, ...wd.filter(Number.isFinite)));
  let sortDesc = $state(true);
  const tableRows = $derived.by(() => { const r = Array.from({ length: b - a + 1 }, (_, i) => a + i); return sortDesc ? r.reverse() : r; });
  const liveAt = live?.time ? new Date(live.time * 1000).toISOString().slice(11, 16) + " UTC" : null;
  const DATA = "https://everythingmoe.com/data";

  function csv() {
    const head = ["date", ...metrics.map((x) => x.key)].join(",");
    const body = tableRows.slice().sort((p, q) => p - q).map((i) => [dates[i], ...metrics.map((x) => (Number.isFinite(x.v[i]) ? x.v[i] : ""))].join(",")).join("\n");
    const u = URL.createObjectURL(new Blob([head + "\n" + body], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: u, download: `everythingmoe-stats_${dates[a]}_${dates[b]}.csv` }).click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  let showNotes = $state(true);
  const notes = $derived(showNotes ? annotations : []);
  function toggleNotes() { showNotes = !showNotes; try { localStorage.setItem("annotations", showNotes ? "1" : "0"); } catch {} }
  function toggleHc() { hc = !hc; document.documentElement.classList.toggle("hc", hc); try { localStorage.setItem("hc", hc ? "1" : "0"); } catch {} }
  // lock scroll-spy during programmatic jumps
  let lock = false;
  function go(id) { active = id; lock = true; document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); history.replaceState(null, "", "#" + id); }
  function spy() {
    if (lock) return;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) { active = SECTIONS.at(-1)[0]; return; }
    let cur = SECTIONS[0][0];
    for (const [id] of SECTIONS) if (document.getElementById(id).getBoundingClientRect().top <= (pinned ? 210 : 130)) cur = id;
    active = cur;
  }
  const nav = (e, id) => { e.preventDefault(); go(id); };

  onMount(() => {
    hc = document.documentElement.classList.contains("hc");
    try { pinned = localStorage.getItem("pinRange") === "1"; const n = localStorage.getItem("norm"); if (NORMS.some((o) => o[0] === n)) norm = n; showNotes = localStorage.getItem("annotations") !== "0"; } catch {}
    const mq = matchMedia("(prefers-contrast: more)");
    const onMq = () => { if (localStorage.getItem("hc") === null) { hc = mq.matches; document.documentElement.classList.toggle("hc", hc); } };
    mq.addEventListener("change", onMq);
    const unlock = () => (lock = false);
    const onKey = (e) => {
      if (/^(Arrow|Page|Home|End| )/.test(e.key)) unlock();
      if (e.target.closest?.("input,textarea,select,[role=slider]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = SECTIONS.findIndex((s) => s[0] === active);
      if (/^[1-8]$/.test(e.key)) go(SECTIONS[+e.key - 1][0]);
      else if (e.key === "j") go(SECTIONS[Math.min(i + 1, 7)][0]);
      else if (e.key === "k") go(SECTIONS[Math.max(i - 1, 0)][0]);
      else if (e.key === "m") key = growing[(growing.indexOf(m) + 1) % growing.length]?.key ?? "users";
      else if (e.key === "h") toggleHc();
      else if (e.key === "f") togglePin();
      else if (e.key === "a" && annotations.length) toggleNotes();
    };
    addEventListener("keydown", onKey);
    addEventListener("pointerup", () => (mDrag = null));
    for (const ev of ["wheel", "touchstart", "pointerdown"]) addEventListener(ev, unlock, { passive: true });
    addEventListener("scroll", spy, { passive: true });
    spy();
    return () => { removeEventListener("keydown", onKey); removeEventListener("scroll", spy); mq.removeEventListener("change", onMq); };
  });
</script>

{#snippet head(n, icon, title, sub, tip, right)}
  <header class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-3 sm:px-4 py-3">
    <h2 class="flex min-w-0 items-center gap-2 text-[13px] font-medium text-ink" title={tip}>
      <Icon name={icon} size={15} class="text-ink-3" />
      <span class="font-mono text-[10px] font-normal text-ink-3">{String(n).padStart(2, "0")}</span>
      {title}{#if sub}<span class="font-normal text-ink-3">– {sub}</span>{/if}
    </h2>
    {@render right?.()}
  </header>
{/snippet}
{#snippet pills(opts, cur, set)}
  <div class="inline-flex max-w-full flex-wrap rounded-[3px] border border-line bg-sunken p-0.5 text-[11px]" role="group">
    {#each opts as o}<button class="rounded-[2px] px-2 py-0.5 {cur === o[0] ? 'bg-raised text-ink' : 'text-ink-3 hover:text-ink-2'}" aria-pressed={cur === o[0]} onclick={() => set(o[0])}><span class="inline-flex items-center gap-1">{#if mIcon[o[0]]}<span style="color:{mIcon[o[0]][1]}"><Icon name={mIcon[o[0]][0]} size={13} /></span>{/if}{o[1]}</span></button>{/each}
  </div>
{/snippet}

<header class="sticky top-0 z-30 border-b border-line bg-base/95 backdrop-blur-md">
  <div class="mx-auto flex h-12 max-w-[1440px] items-center gap-2.5 px-3 sm:px-6">
    <a href="#overview" onclick={(e) => nav(e, "overview")} class="flex shrink-0 items-center gap-2.5"><Logo /><span class="text-[13px] font-semibold tracking-tight">EverythingMoe</span></a>
    <span class="hidden text-ink-3 min-[400px]:inline">/</span><span class="hidden truncate text-[13px] text-ink-2 min-[400px]:inline">Stats history</span>
    <span class="hidden truncate text-[12px] text-ink-3 md:inline" title="Live totals checked {liveAt ?? 'at build'}">– data up to {day(ts[last])}, going back to {day(ts[0])}</span>
    <div class="ml-auto flex items-center gap-2">
      <button onclick={togglePin} aria-pressed={pinned} title={pinned ? "Dock range bar back into Overview (f)" : "Pin range bar under the header (f)"} class="inline-flex size-8 items-center justify-center rounded-[3px] border {pinned ? 'border-ink-2 text-ink' : 'border-line-strong text-ink-2 hover:text-ink'}"><Icon name={pinned ? "push-pin" : "push-pin-outline"} /></button>
      {#if annotations.length}<button onclick={toggleNotes} aria-pressed={showNotes} title={showNotes ? "Hide chart annotations (a)" : "Show chart annotations (a)"} class="inline-flex size-8 items-center justify-center rounded-[3px] border {showNotes ? 'border-[#e06c6c]/60 bg-[#e06c6c]/10 text-[#e88a8a] hc:border-[#ff8f8f] hc:text-[#ff8f8f]' : 'border-line-strong text-ink-2 hover:text-ink'}"><Icon name={showNotes ? "chat-info" : "chat-info-outline"} /></button>{/if}
      <button onclick={toggleHc} aria-pressed={hc} title="High contrast (h)" class="inline-flex size-8 items-center justify-center rounded-[3px] border {hc ? 'border-ink-2 text-ink' : 'border-line-strong text-ink-2 hover:text-ink'}"><Icon name="contrast" /></button>
    </div>
  </div>
    <nav class="no-scrollbar mx-auto flex h-9 max-w-[1440px] gap-0.5 overflow-x-auto border-t border-line px-2 sm:px-5 lg:hidden" aria-label="Sections">
      {#each SECTIONS as [id, l, ic]}<a href="#{id}" onclick={(e) => nav(e, id)} title={l} class="flex shrink-0 items-center gap-1 my-1 rounded-[3px] px-2 py-1 text-[12px] {active === id ? 'bg-raised text-ink' : 'text-ink-3'}"><Icon name={ic} size={15} /><span>{l}</span></a>{/each}
    </nav>
</header>

<div class="mx-auto flex max-w-[1440px] gap-5 px-0 sm:px-6">
  <!-- side section nav -->
  <aside class="sticky hidden {pinned ? "top-[108px] h-[calc(100vh-108px)]" : "top-12 h-[calc(100vh-3rem)]"} w-48 shrink-0 flex-col py-6 lg:flex">
    <div class="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Sections</div>
    {#each SECTIONS as [id, l, ic], i}
      <a href="#{id}" onclick={(e) => nav(e, id)} aria-current={active === id ? "true" : undefined} class="flex items-center gap-2.5 border-l-2 py-1.5 pl-3 pr-2 text-[13px] {active === id ? 'border-[#5b9cf6] bg-panel text-ink' : 'border-transparent text-ink-2 hover:bg-panel/60 hover:text-ink'}">
        <Icon name={ic} size={16} class={active === id ? "text-[#5b9cf6]" : "text-ink-3"} /><span class="flex-1">{l}</span><kbd class="font-mono text-[10px] text-ink-3">{i + 1}</kbd>
      </a>
    {/each}
    <div class="mt-auto flex gap-2 px-3 text-[10px] leading-relaxed text-ink-3"><Icon name="keyboard-outline" size={14} /><div><kbd class="text-ink-2">1–8</kbd> jump – <kbd class="text-ink-2">j k</kbd> next/prev<br /><kbd class="text-ink-2">m</kbd> metric – <kbd class="text-ink-2">h</kbd> contrast<br /><kbd class="text-ink-2">f</kbd> float range{#if annotations.length}{" – "}<kbd class="text-ink-2">a</kbd> notes{/if}</div></div>
  </aside>

  <main class="min-w-0 flex-1 space-y-4 pb-10 {pinned ? "pt-[116px] sm:pt-[84px]" : "pt-4 sm:pt-6"}">
    <section id="overview" class="panel overflow-hidden">
      <div class="flex items-baseline justify-center gap-2 border-b border-line bg-raised px-3 sm:px-4 py-1.5 text-center" title="Totals at the end of the selected range; change over the range.">
        <h2 class="text-[18px] text-ink">Overview</h2><span class="text-[13px] text-ink-3">as of {day(ts[b], false)}</span>
      </div>
      <p class="px-3 sm:px-4 py-1.5 text-center text-[12px] leading-snug text-ink-2">Daily history of <a href="https://everythingmoe.com" class="text-ink underline decoration-line-strong underline-offset-2">EverythingMoe</a>'s public site stats – how its users, comments, reviews, forum threads, listed entries and categories grow over time. Pick a card to focus the charts; drag on any chart to set the date range.</p>
      <div class="-mr-px grid grid-cols-2 sm:grid-cols-3 {metrics.length > 5 ? "xl:grid-cols-6" : "lg:grid-cols-5"}">
        {#each metrics as x}
          {@const s = s0(x)}
          {@const d = x.v[b] - x.v[s]}
          {@const lv = live?.v[metrics.indexOf(x)]}
          <button onclick={() => (key = x.key)} aria-pressed={key === x.key} title="{x.desc} - click to focus charts" class="group relative flex min-w-0 flex-col border-r border-t border-line px-3 py-2 text-left transition-colors {x.constant ? `justify-center ${metrics.length % 2 ? "col-span-2 sm:col-span-1" : ""}` : ''} {key === x.key ? 'bg-raised' : 'hover:bg-[#242424] hc:hover:bg-raised'}">
            {#if key === x.key}<span class="absolute inset-x-0 top-0 h-[2px]" style="background:{x.color}"></span>{/if}
            <div class="flex items-center gap-2 text-[13px] text-ink-2"><span style="color:{x.color}"><Icon name={x.icon} size={16} /></span>{x.label}</div>
            <div class="num mt-0.5 text-[22px] leading-tight">{fmt(x.v[b])}</div>
            {#if x.constant}<div class="mt-1 text-[12px] text-ink-3">steady</div>
            {:else}{@const off = norm === "user" && x.key === "users"}{@const pv = nv(x)}{@const late = s > a}<div class="num mt-1 truncate whitespace-nowrap text-[12px] {off ? 'text-ink-3' : (norm === "user" ? pct(pv, s) : d) > 0 ? 'text-pos' : (norm === "user" ? pct(pv, s) : d) < 0 ? 'text-neg' : 'text-ink-3'}" title={off ? "Users per user is always 1" : NORMS.find((o) => o[0] === norm)[3] + (late ? ` (tracked since ${x.since})` : "")}>{#if s > b}no data before {x.since}{:else if norm === "abs"}{sgn(d)} added{:else if off}{sgn(d)} - n/a{:else if norm === "user"}{fmt(pv[b], 3)}/user - {sgn(pct(pv, s), 1)}%{:else}{sgn(d)} - {sgn(pct(x.v, s), 1)}%{/if}</div>
              <div class="num truncate whitespace-nowrap text-[11px] text-ink-3">{lv != null && b === last ? `now ${fmt(lv)}` : s > b ? "—" : `${sgn(d / Math.max(1, (ts[b] - ts[s]) / DAY), 1)}/day`}{#if late && s <= b} - since {x.since}{/if}</div>
              <div class="mt-1 h-5 opacity-80 group-hover:opacity-100"><Spark v={x.v.slice(a, b + 1)} color={x.color} /></div>{/if}
          </button>
        {/each}
      </div>
      {#if !pinned}<div class="border-t border-line px-3 sm:px-4 py-2" aria-label="Date range">{@render rangeBar()}</div>{/if}
    </section>

    <section id="trend" class="panel">
      {@render head(2, "show-chart", "Trend", m.label, "Total at each snapshot; bars = day-over-day change.", trendRight)}
      {#snippet trendRight()}<div class="flex flex-wrap items-center gap-2">{@render pills(metrics.map((x) => [x.key, x.label]), key, (v) => (key = v))}<label class="flex items-center gap-1.5 text-[11px] text-ink-2"><input type="checkbox" bind:checked={showAvg} class="accent-[#5b9cf6]" />7d avg</label></div>{/snippet}
      <div class="p-3 sm:p-4">
        <Chart {a} {b} {notes} onselect={select} from={m.first} since={m.since} h={300} series={[{ v: m.v, color: m.color, label: m.label }]} bars={{ v: m.ch, color: m.color, f: (n) => sgn(n) }} />
        {#if showAvg && !m.constant}
          <div class="mt-3 border-t border-line pt-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">Daily Δ – 7-day avg</div>
          <Chart {a} {b} {notes} onselect={select} from={m.first} since={m.since} h={100} zero series={[{ v: m.ch, color: m.color, thin: true, label: "Δ", f: (n) => sgn(n) }, { v: avg7, color: "var(--color-ink)", dash: true, label: "7d avg", f: (n) => sgn(n, 1) }]} />
        {/if}
      </div>
    </section>

    <div class="grid gap-4 xl:grid-cols-3">
      <section id="growth" class="panel xl:col-span-2">
        {@render head(3, "trending-up", "Growth", "since range start", "Change since the start of the selected range. Raw % exaggerates metrics that started small; Per user divides by users each day; Added shows absolute amounts.", growthRight)}
        {#snippet growthRight()}<div class="ml-auto shrink-0">{@render normPills()}</div>{/snippet}
        <div class="no-scrollbar flex h-8 items-center gap-3 overflow-x-auto whitespace-nowrap border-b border-line px-3 text-[11px] sm:px-4" aria-label="Legend">{#each growing as g}{@const off = norm === "user" && g.key === "users"}<span class="flex shrink-0 items-center gap-1.5 {off ? 'text-ink-3 opacity-50' : 'text-ink-2'}" title={off ? "Users per user is always 1 – hidden" : null}><span style="color:{g.color}"><Icon name={g.icon} size={14} /></span>{g.label}{norm === "user" && !off ? " / user" : ""}{#if g.first > a}<span class="text-ink-3" title="No {g.label.toLowerCase()} data before {g.since}; growth starts there">(since {g.since})</span>{/if}</span>{/each}</div>
        <div class="p-3 sm:p-4"><Chart {a} {b} {notes} onselect={select} h={312} unit={norm === "abs" ? "" : "%"} endLabels series={rel} /></div>
      </section>
      <section class="panel" aria-label="Ratios">
        {@render head(3, "trending-up", "Ratios", "engagement", "Derived from totals, selected range.")}
        <div class="divide-y divide-line px-3 sm:px-4 py-1">
          {#each RATIOS as [l, n, d, dg, k = 1]}<RatioRow {norm} label={l} v={get(n).v.map((x, i) => (x * k) / get(d).v[i])} color={get(n).color} digits={dg} since={get(n).since} {a} {b} bind:hover={ratioHover} onselect={select} />{/each}
        </div>
      </section>
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <section id="calendar" class="panel xl:col-span-2">
        {@render head(4, "calendar-month-outline", "Calendar", m.label, "Daily change per snapshot date. Click a day to select its week, drag to select a span.", calRight)}
        {#snippet calRight()}{@render pills(growing.map((x) => [x.key, x.label]), key, (v) => (key = v))}{/snippet}
        <div class="flex-1 p-3 sm:p-4"><Heatmap {m} {a} {b} onselect={select} /></div>
      </section>
      <section class="panel" aria-label="Weekdays">
        {@render head(4, "calendar-month-outline", "Weekdays", "avg Δ", "Average daily change by UTC weekday, selected range.")}
        <div class="flex flex-1 flex-col justify-between gap-1.5 p-3 sm:p-4">
          {#each wd as v, i}
            {@const mx = wdMax}
            <div class="flex flex-1 items-center gap-3 text-[13px]" title="{WD[i]}: {fmt(v, 1)} {m.label.toLowerCase()} per day on average">
              <span class="w-9 font-mono text-[12px] {v === mx ? 'text-ink' : 'text-ink-3'}">{WD[i]}</span>
              <div class="h-full max-h-7 min-h-3 flex-1 rounded-[3px] bg-sunken"><div class="h-full rounded-[3px]" style="width:{(Math.max(0, v || 0) / (mx || 1)) * 100}%;background:{m.color};opacity:{v === mx ? 1 : 0.6}"></div></div>
              <span class="num w-12 text-right {v === mx ? 'font-semibold text-ink' : 'text-ink-2'}">{fmt(v, 1)}</span>
            </div>
          {/each}
        </div>
      </section>
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <section id="monthly" class="panel xl:col-span-2">
        {@render head(5, "table-chart-outline", "Monthly", "net change", "Net change per calendar month (UTC). Bar = average per day vs best month.")}
        <div class="overflow-x-auto">
          <table class="w-full text-[12px]">
            <thead><tr class="border-b border-line text-left font-mono text-[10px] uppercase tracking-wider text-ink-3"><th class="px-3 sm:px-4 py-2 font-normal">Month</th>{#each growing as x}<th class="px-3 py-2 text-right font-normal {growing.length > 4 ? '' : 'sm:px-4'}" title={x.desc} style="color:{x.color}"><span class="inline-flex items-center gap-1"><Icon name={x.icon} size={13} />{x.label}</span></th>{/each}</tr></thead>
            <tbody>
              {#each mon as o, mi}
                <tr class="cursor-pointer border-b border-line/60 last:border-0 hover:bg-raised/50 {mDrag && mi >= Math.min(...mDrag) && mi <= Math.max(...mDrag) ? 'bg-[#5b9cf6]/15' : monthIdx(o.t)[0] >= a && monthIdx(o.t)[1] <= b && b - a < last ? 'bg-raised' : ''} select-none" title="Click a month, or press and slide over months" onpointerdown={(e) => { if (e.button) return; e.preventDefault(); mDrag = [mi, mi]; mSpan(mi, mi); }} onpointerenter={() => { if (mDrag) { mDrag = [mDrag[0], mi]; mSpan(mDrag[0], mi); } }}>
                  <td class="whitespace-nowrap px-3 sm:px-4 py-2 text-ink-2">{month(o.t)} <span class="text-[10px] text-ink-3">{o.days}d</span></td>
                  {#each growing as x}<td class="px-3 py-2 {growing.length > 4 ? '' : 'sm:px-4'}"><div class="flex items-center justify-end gap-2"><div class="hidden h-1 {growing.length > 4 ? 'w-10 2xl:w-16' : 'w-16'} rounded-[2px] bg-sunken sm:block"><div class="h-1 rounded-[2px]" style="width:{(Math.max(0, o.n[x.key] ? o.sums[x.key] / o.n[x.key] : 0) / monMax[x.key]) * 100}%;background:{x.color}"></div></div><span class="num">{sgn(o.sums[x.key])}</span></div></td>{/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
      <section id="top" class="panel">
        {@render head(6, "star-outline", "Top days", m.label, "Largest single-day increases (full history). Click to zoom there. × = vs median day.")}
        <div class="divide-y divide-line">
          {#each top as i, r}
            <button class="flex w-full items-center gap-3 px-3 sm:px-4 py-2 text-left text-[12px] hover:bg-raised/50" onclick={() => select(i - 7, i + 7)} title="Select 2 weeks around this day">
              <span class="w-4 font-mono text-[10px] text-ink-3">{r + 1}</span><span class="flex-1 text-ink-2">{day(ts[i])}</span>
              <span class="text-[10px] text-ink-3">{(m.ch[i] / med).toFixed(1)}×</span><span class="num w-12 text-right font-medium" style="color:{m.color}">{sgn(m.ch[i])}</span>
            </button>
          {/each}
        </div>
      </section>
    </div>

    <section id="milestones" class="panel">
      {@render head(7, "flag-outline", "Milestones", "30-day pace", "Next round number and its estimated date at the last-30-day pace.")}
      <div class="grid gap-px bg-line sm:grid-cols-2 {growing.length > 4 ? "xl:grid-cols-5" : "lg:grid-cols-4"}">
        {#each growing as x}
          {@const s = milestone(x)}
          {@const from = s.prevAt ? ts.indexOf(s.prevAt) : x.first}
          <button class="{growing.length % 2 && x === growing.at(-1) ? (growing.length > 4 ? 'sm:max-xl:col-span-2' : 'sm:max-lg:col-span-2') : ''} bg-panel p-3 sm:p-4 text-left hover:bg-[#242424] hc:hover:bg-raised" title="Select from when {compact(s.prev)} was reached until now" onclick={() => select(from, last)}>
            <div class="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-2"><span style="color:{x.color}"><Icon name={x.icon} size={14} /></span>{x.label}<span class="num ml-auto normal-case tracking-normal text-ink-3">{s.mult.toFixed(2)}×</span></div>
            <div class="num mt-2 text-[15px]">{compact(s.v1)} <span class="text-ink-3">→ {compact(s.next)}</span></div>
            <div class="my-2 h-1.5 rounded-[2px] bg-sunken"><div class="h-1.5 rounded-[2px]" style="width:{s.prog * 100}%;background:{x.color}"></div></div>
            <div class="num flex justify-between text-[11px]"><span class="text-ink-2">{s.eta ? `~${day(s.eta)}` : "—"}</span><span class="text-ink-3">{s.days ?? "?"}d – {s.pace.toFixed(1)}/day</span></div>
          </button>
        {/each}
      </div>
    </section>

    <section id="data" class="panel">
      {@render head(8, "database-outline", "Data", `${b - a + 1} rows`, "Raw daily snapshots for the selected range.", dataRight)}
      {#snippet dataRight()}<button class="inline-flex items-center gap-1 rounded-[3px] border border-line-strong px-2 py-1 text-[11px] text-ink-2 hover:text-ink" onclick={csv}><Icon name="download" size={13} />CSV</button>{/snippet}
      <details class="group">
        <summary class="px-3 sm:px-4 py-2.5 text-[12px] text-ink-2 hover:text-ink"><span class="inline-block transition group-open:rotate-90">▸</span> Show table</summary>
        <div class="max-h-[60vh] overflow-auto border-t border-line">
          <table class="w-full text-[12px]">
            <thead class="sticky top-0 bg-panel"><tr class="text-left font-mono text-[10px] uppercase tracking-wider text-ink-3"><th class="px-3 sm:px-4 py-2 font-normal"><button onclick={() => (sortDesc = !sortDesc)}>Date {sortDesc ? "↓" : "↑"}</button></th>{#each metrics as x}<th class="px-3 sm:px-4 py-2 text-right font-normal" title={x.desc}><span class="inline-flex items-center gap-1"><span style="color:{x.color}"><Icon name={x.icon} size={13} /></span>{x.label}</span></th>{/each}</tr></thead>
            <tbody>
              {#each tableRows as i}
                <tr class="border-t border-line/50 hover:bg-raised/50"><td class="num px-3 sm:px-4 py-1 font-mono text-ink-2">{dates[i]}</td>{#each metrics as x}<td class="num px-3 sm:px-4 py-1 text-right">{fmt(x.v[i])}{#if x.ch[i]}<span class="ml-1 text-[10px] {x.ch[i] > 0 ? 'text-pos' : 'text-neg'}">{sgn(x.ch[i])}</span>{/if}</td>{/each}</tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
    </section>

    <footer class="flex px-3 sm:px-0 flex-col gap-2 border-t border-line pt-6 text-xs text-ink-3 md:flex-row md:items-start md:justify-between">
      <div class="space-y-1">
        <div class="font-mono text-[10px] uppercase tracking-wider">Data from everythingmoe.com – fetched {builtAt.slice(0, 10)}</div>
        <ul class="space-y-0.5">
          <li><a class="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink" href="{DATA}/cache/statshistory/{dates[last].replaceAll('-', '')}.json">cache/statshistory/{dates[last].replaceAll('-', '')}.json</a></li>
          <li><a class="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink" href="{DATA}/cache/site-stats.json">cache/site-stats.json</a></li>
          <li><a class="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink" href="{DATA}/cache/statshistory/annotation.json">cache/statshistory/annotation.json</a></li>
        </ul>
      </div>
      <p class="shrink-0">{N} snapshots – {day(ts[0])} – {day(ts[last])} – unofficial</p>
    </footer>
  </main>
</div>


{#snippet normPills()}
  <div class="inline-flex flex-nowrap rounded-[3px] border border-line bg-sunken p-0.5 text-[11px]" role="radiogroup" aria-label="Growth normalization">
    {#each NORMS as [k, l, ic, t]}<button role="radio" aria-checked={norm === k} tabindex={norm === k ? 0 : -1} title={t} class="rounded-[2px] px-2 py-0.5 {norm === k ? 'bg-raised text-ink hc:outline hc:outline-1 hc:outline-ink-2' : 'text-ink-3 hover:text-ink-2'}" onclick={() => setNorm(k)} onkeydown={(e) => { const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return; e.preventDefault(); const n = NORMS[(NORMS.findIndex((o) => o[0] === norm) + d + 3) % 3][0]; setNorm(n); e.currentTarget.parentElement.querySelector(`[data-k=${n}]`)?.focus(); }} data-k={k}><span class="inline-flex items-center gap-1 whitespace-nowrap"><Icon name={ic} size={13} />{l}</span></button>{/each}
  </div>
{/snippet}
{#snippet rangeBar()}
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3" title="Drag to select a range, drag the window to pan, arrow keys to move">
    {@render pills(RANGES.map((r) => [r[0], r[0]]), preset, (v) => setRange(RANGES.find((r) => r[0] === v)[1]))}
    <div class="min-w-0 w-full flex-1"><Brush v={m.v} color={m.color} {notes} bind:a bind:b compact /></div>
  </div>
{/snippet}
{#if pinned}
<div class="pinned-bar fixed inset-x-0 top-[var(--hdr)] z-20 border-b border-line bg-base/95 shadow-[0_2px_6px_#0008] backdrop-blur-md">
  <div class="mx-auto max-w-[1440px] px-3 py-2 sm:px-6">{@render rangeBar()}</div>
</div>
{/if}
<style>.no-scrollbar { scrollbar-width: none; }</style>
