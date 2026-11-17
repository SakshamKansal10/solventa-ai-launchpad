// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * The homepage's 3D bundle, preloaded from the very first HTML (owner step 2). Its file names
 * are only known after the client build, so this records the CinematicCanvas chunk and its static
 * imports there and hands them to the server build as `virtual:cinematic-preload`; the page
 * calls ReactDOM.preloadModule() for each while rendering on the server, which puts
 * <link rel="modulepreload"> in <head> — the download starts with the HTML, not after
 * hydration. The client build (and `vite dev`) see an empty list.
 */
function cinematicPreload(): Plugin {
  const id = "virtual:cinematic-preload";
  let files: string[] = [];
  return {
    name: "sol-cinematic-preload",
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load: (resolved) =>
      resolved === `\0${id}` ? `export default ${JSON.stringify(files)};` : undefined,
    generateBundle(_options, bundle) {
      if (this.environment?.name !== "client") return;
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        const facade = chunk.facadeModuleId?.replace(/\\/g, "/") ?? "";
        if (!facade.endsWith("/cinematic-home/scene/CinematicCanvas.tsx")) continue;
        files = [chunk.fileName, ...chunk.imports].map((f) => `/${f}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [cinematicPreload()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts
    server: { entry: "server" },
  },

  // Production is deployed on Vercel, not Cloudflare. Nitro's own
  // zero-config auto-detection normally targets whatever platform it's
  // actually building on, but this shared config's default fallback is
  // cloudflare-module, and its docs note that fallback can still win in
  // some build contexts — hard-pinning removes that ambiguity entirely.
  // Does not affect `vite dev` (localhost/ngrok): this preset only
  // applies to `vite build`.
  //
  // The one exception: the E2E harness builds a local Node server from this
  // same code (E2E_BUILD=1) so browser tests run against a real production
  // bundle. That build never runs on Vercel and never sets this variable there.
  nitro:
    process.env.E2E_BUILD === "1"
      ? { preset: "node-server", output: { dir: ".e2e-tmp/output" } }
      : // A roadmap build (skeleton + week 1) or a consultation can take a minute when the model
        // retries; never let the platform default cut one off halfway (go-live step 3). The
        // wrapper spreads these options into nitro unchanged; only its type is narrower.
        // Region (owner, 2026-11-17, Job I): the functions ran in Vercel's default iad1
        // (Washington) while Supabase is in Mumbai (ap-south-1) — every database round trip
        // crossed the world (~300 ms), so each page's server call took 0.7–2.3 s. bom1 is
        // Mumbai: the same city as the database. (Written to the function's .vc-config.json.)
        ({
          preset: "vercel",
          vercel: { functions: { maxDuration: 300, regions: ["bom1"] } },
        } as { preset: string }),

  vite: {
    // iOS 15 and later (owner, 2026-11-17): Vite 8's default (Safari 16.4) left class static
    // blocks in the bundle — a syntax error that stops every script on iOS 15.0–16.3, including
    // email links opened in the Gmail app. Built-ins newer than iOS 15 are polyfilled inline
    // (src/components/LoadFallback.tsx); scripts/check-ios15.mjs guards the output.
    build: { target: ["es2021", "safari15", "chrome100", "firefox100", "edge100"] },
    server: {
      allowedHosts: ["lagged-catching-prayer.ngrok-free.dev"],
      // Playwright writes traces/screenshots inside the project; without this
      // the dev server treats every artifact as a source change and hot-reloads
      // the page in the middle of an E2E run.
      watch: { ignored: ["**/e2e-results/**", "**/e2e-report/**", "**/.e2e-tmp/**"] },
    },
  },
});
