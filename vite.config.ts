// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
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
      : { preset: "vercel" },

  vite: {
    server: {
      allowedHosts: ["lagged-catching-prayer.ngrok-free.dev"],
      // Playwright writes traces/screenshots inside the project; without this
      // the dev server treats every artifact as a source change and hot-reloads
      // the page in the middle of an E2E run.
      watch: { ignored: ["**/e2e-results/**", "**/e2e-report/**", "**/.e2e-tmp/**"] },
    },
  },
});
