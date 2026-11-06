// Resizes and converts the source images used by the landing page into public/landing/.
// Usage: node scripts/prepare-landing-images.mjs [sourceFolder]
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const sourceDir = process.argv[2] ?? "C:/Users/buckn/Downloads/YG support images";
const outDir = path.resolve("public", "landing");

const jobs = [
  { src: "beach-water.jpg", out: "beach-water.jpg", width: 2560, format: "jpeg", quality: 80 },
  ...["plane", "cab", "coach", "small-plane", "hotel", "beach"].map((name) => ({
    src: `${name}.png`,
    out: `${name}.webp`,
    width: 1200,
    format: "webp",
    quality: 82,
  })),
];

const missing = jobs.filter((j) => !existsSync(path.join(sourceDir, j.src)));
if (missing.length > 0) {
  console.error(`Missing source files in ${sourceDir}: ${missing.map((j) => j.src).join(", ")}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

for (const job of jobs) {
  const outPath = path.join(outDir, job.out);
  const pipeline = sharp(path.join(sourceDir, job.src)).resize({
    width: job.width,
    withoutEnlargement: true,
  });
  const info = await (job.format === "jpeg"
    ? pipeline.jpeg({ quality: job.quality, mozjpeg: true })
    : pipeline.webp({ quality: job.quality })
  ).toFile(outPath);
  const kb = (statSync(outPath).size / 1024).toFixed(1);
  console.log(`${job.out}: ${info.width}x${info.height}, ${kb} KB`);
}
