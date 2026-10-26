// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { loadEnv } from "vite";

import { injectLandingSeo } from "./src/lib/landingSeo";
import { landingSeoPlugin } from "./scripts/landing-seo-plugin";

// Netlify sets NETLIFY=true during its builds. Keep the client output in
// dist/client there too, so the service worker settings below stay valid.
const netlifyNitro = process.env["NETLIFY"]
  ? {
      preset: "cloudflare-module",
      output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
    }
  : undefined;

const publicUrl =
  process.env["VITE_PUBLIC_APP_URL"] ??
  loadEnv("production", process.cwd(), "VITE_")["VITE_PUBLIC_APP_URL"];
const publicOutputDir = process.env["NETLIFY"] ? "dist/client" : ".output/public";

export default defineConfig({
  ...(netlifyNitro ? { nitro: netlifyNitro } : {}),
  tanstackStart: {
    server: { entry: "server" },
    // Client-rendered app with a prerendered shell, used as the offline fallback.
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/_shell",
        onSuccess: async ({ html }: { html: string }) => {
          await writeFile(
            path.resolve(publicOutputDir, "_shell.html"),
            injectLandingSeo(html, publicUrl),
            "utf8",
          );
        },
      },
    },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        // Client output only; the server bundle must never be precached.
        outDir: "dist/client",
        manifestFilename: "manifest.webmanifest",
        includeAssets: ["icons/*.png", "icons/*.svg"],
        manifest: {
          name: "Yard",
          short_name: "Yard",
          description: "Rent and tenant management for backyard-room landlords.",
          lang: "en-ZA",
          display: "standalone",
          start_url: "/home",
          scope: "/",
          background_color: "#FAFAF7",
          theme_color: "#FAFAF7",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/icons/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globDirectory: "dist/client",
          // The shell is prerendered after this plugin runs, so list it explicitly.
          additionalManifestEntries: [{ url: "/_shell.html", revision: String(Date.now()) }],
          globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          // Only same-origin page navigations are handled: network first, falling
          // back to the precached app shell when offline. Supabase and auth
          // requests are never cached.
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                url.origin === self.location.origin &&
                !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "yard-pages",
                networkTimeoutSeconds: 4,
                precacheFallback: { fallbackURL: "/_shell.html" },
              },
            },
          ],
        },
      }),
      landingSeoPlugin(publicUrl, publicOutputDir),
    ],
  },
});
