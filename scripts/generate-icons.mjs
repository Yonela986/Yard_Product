// Generates PNG app icons from the SVG sources. Run: npm run icons
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve("public/icons");
const icon = await readFile(path.join(dir, "icon.svg"));
const maskable = await readFile(path.join(dir, "icon-maskable.svg"));
const preview = await readFile(path.resolve("public/og-image.svg"));

const outputs = [
  { src: icon, size: 192, name: "icon-192.png" },
  { src: icon, size: 512, name: "icon-512.png" },
  { src: maskable, size: 512, name: "icon-maskable-512.png" },
  { src: icon, size: 180, name: "apple-touch-icon-180.png" },
];

for (const { src, size, name } of outputs) {
  await sharp(src, { density: 300 }).resize(size, size).png().toFile(path.join(dir, name));
  console.log(`wrote public/icons/${name}`);
}

await sharp(preview).resize(1200, 630).png().toFile(path.resolve("public/og-image.png"));
console.log("wrote public/og-image.png");
