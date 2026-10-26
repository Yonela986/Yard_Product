import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_DIR = path.resolve("src");
const failures = [];
const sourceExtensions = new Set([".ts", ".tsx", ".css", ".html"]);

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(filePath);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      const text = await readFile(filePath, "utf8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, index) => {
        const location = `${path.relative(process.cwd(), filePath)}:${index + 1}`;
        if (/\p{Extended_Pictographic}/u.test(line)) {
          failures.push(`${location}: emoji character`);
        }
        if (/(?:linear|radial|conic)-gradient\s*\(/i.test(line)) {
          failures.push(`${location}: gradient`);
        }
        for (const match of line.matchAll(/box-shadow\s*:\s*([^;]+)/gi)) {
          const blurValues = [...match[1].matchAll(/(?:^|\s)(\d+(?:\.\d+)?)px/g)].map((item) =>
            Number(item[1]),
          );
          if (blurValues.some((value) => value > 4)) {
            failures.push(`${location}: box-shadow blur larger than 4px`);
          }
        }
      });
    }
  }
}

await visit(SOURCE_DIR);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Copy and visual-style checks passed.");
}
