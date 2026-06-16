/**
 * Push .env.vercel vars to Vercel production only.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.vercel");

if (!existsSync(envFile)) {
  console.error("Missing .env.vercel");
  process.exit(1);
}

const vars = new Map();
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 1) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  if (val) vars.set(key, val);
}

for (const [key, value] of vars) {
  const result = spawnSync("npx", ["vercel", "env", "add", key, "production", "--force"], {
    input: value,
    cwd: root,
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
    encoding: "utf8",
  });
  if (result.status === 0) {
    console.log(`✓ ${key}`);
  } else {
    console.error(`✗ ${key}:`, (result.stderr || result.stdout || "").trim().split("\n")[0]);
  }
}
