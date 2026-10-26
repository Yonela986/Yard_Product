import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const OUTPUT_CANDIDATES = ["dist/client", ".output/public"];
const LANDING_BUDGET_BYTES = 15 * 1024;

async function findOutputDirectory() {
  for (const candidate of OUTPUT_CANDIDATES) {
    try {
      if ((await stat(path.join(candidate, "assets"))).isDirectory()) return candidate;
    } catch {
      // Try the next configured build location.
    }
  }
  throw new Error("Build output not found. Run npm run build first.");
}

const outputDir = await findOutputDirectory();
const assetsDir = path.join(outputDir, "assets");
const files = await readdir(assetsDir);
const landingFile = files.find((file) => /^Landing-[\w-]+\.js$/i.test(file));
if (!landingFile) throw new Error("The lazy landing-page JavaScript chunk was not found.");

const landingPath = path.join(assetsDir, landingFile);
const landingCode = await readFile(landingPath);
const landingGzipBytes = gzipSync(landingCode).byteLength;
const landingSource = await readFile(path.resolve("src/pages/Landing.tsx"), "utf8");
if (
  /from\s+["'][^"']*\/features\/(?:reports|payments|messaging|tenant-page|utilities|charges)\//.test(
    landingSource,
  )
) {
  throw new Error("Landing page imports landlord-only feature code.");
}

console.log(`Landing page chunk: ${(landingGzipBytes / 1024).toFixed(2)} KB gzip (${landingFile})`);
if (landingGzipBytes > LANDING_BUDGET_BYTES) {
  throw new Error(
    `Landing page chunk exceeds the ${(LANDING_BUDGET_BYTES / 1024).toFixed(0)} KB gzip budget.`,
  );
}
console.log("Landing performance budget passed.");
