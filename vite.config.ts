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
  nitro: { preset: "vercel" },

  vite: {
    server: {
      allowedHosts: ["lagged-catching-prayer.ngrok-free.dev"],
    },
  },
});
