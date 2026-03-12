// @ts-check
import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { paramsWriterIntegration } from "./src/integrations/params-writer";

// https://astro.build/config
export default defineConfig({
  integrations: [svelte(), paramsWriterIntegration()],
  vite: {
    plugins: [tailwindcss()],
  },
});
