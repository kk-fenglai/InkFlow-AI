// Rasterize brand SVGs into the PNG icons the PWA manifest + Play Store need.
// Usage: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
const iconSvg = join(root, "assets", "icon.svg");
const maskableSvg = join(root, "assets", "icon-maskable.svg");

const jobs = [
  { src: iconSvg, size: 192, out: "icon-192.png" },
  { src: iconSvg, size: 512, out: "icon-512.png" },
  { src: iconSvg, size: 180, out: "apple-touch-icon.png" },
  { src: iconSvg, size: 512, out: "icon-store-512.png" }, // Play Store listing icon
  { src: maskableSvg, size: 512, out: "icon-maskable-512.png" },
  { src: maskableSvg, size: 192, out: "icon-maskable-192.png" },
];

await mkdir(outDir, { recursive: true });

for (const { src, size, out } of jobs) {
  await sharp(src, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, out));
  console.log(`✓ ${out} (${size}×${size})`);
}

console.log("Done. Icons written to public/icons/");
