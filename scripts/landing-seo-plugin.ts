import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

import { injectLandingSeo, landingSeo } from "../src/lib/landingSeo";

const ROBOTS_PATHS = [
  "/t/",
  "/sign-in",
  "/onboarding",
  "/home",
  "/rooms",
  "/money",
  "/settings",
  "/payments",
  "/tenants",
  "/remind",
];

function robotsText(sitemap: string | null): string {
  return [
    "User-agent: *",
    "Allow: /",
    ...ROBOTS_PATHS.map((pathname) => `Disallow: ${pathname}`),
    ...(sitemap ? [`Sitemap: ${sitemap}`] : []),
    "",
  ].join("\n");
}

export function landingSeoPlugin(appUrl: string | undefined, publicOutputDir: string): Plugin {
  const resolvedPublicOutputDir = path.resolve(publicOutputDir);
  return {
    name: "yard-landing-seo",
    enforce: "post",
    transformIndexHtml(html) {
      return injectLandingSeo(html, appUrl);
    },
    async writeBundle(outputOptions) {
      const outputDir = path.resolve(outputOptions.dir ?? publicOutputDir);
      if (outputDir !== resolvedPublicOutputDir) return;
      const sitemap = landingSeo(appUrl)?.canonical;
      await writeFile(
        path.join(outputDir, "robots.txt"),
        robotsText(sitemap ? `${sitemap}/sitemap.xml` : null),
        "utf8",
      );
      if (sitemap) {
        await writeFile(
          path.join(outputDir, "sitemap.xml"),
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${sitemap}/</loc></url></urlset>`,
          "utf8",
        );
      }
    },
  };
}
