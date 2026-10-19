import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [svelte({ onwarn: () => {} }),
    tailwindcss()],
  build: { target: "es2022", minify: "esbuild", cssMinify: true, modulePreload: false },
});
