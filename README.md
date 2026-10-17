# EverythingMoe stats

Svelte 5 + Tailwind 4 + Vite.

Stats are fetched **at build time only** (`scripts/fetch-stats.mjs`, run as `prebuild`):
per-day `cache/statshistory/YYYYMMDD.json`.

```sh
npm ci && npm run build
npm run dev
```

Keys: `1–8` jump to section, `j`/`k` next/prev, `m` cycle metric, `h` high contrast, `f` float the range bar.

# License 

GPLv3
