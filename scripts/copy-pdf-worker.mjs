/**
 * Copies the pdf.js worker out of node_modules into public/pdf/ so the browser
 * loads it same-origin instead of from unpkg. Running this on every build keeps
 * the worker version locked to the installed pdfjs-dist — a mismatch between
 * the two makes pdf.js refuse to render.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
const source = join(pdfjsRoot, "build", "pdf.worker.min.mjs");
const targetDir = join(process.cwd(), "public", "pdf");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, join(targetDir, "pdf.worker.min.mjs"));

console.log(
  `pdf.js worker ${require("pdfjs-dist/package.json").version} -> public/pdf/pdf.worker.min.mjs`,
);
