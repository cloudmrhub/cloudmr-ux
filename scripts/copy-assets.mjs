/**
 * Cross-platform copy of static assets into dist/ (replaces Unix-only `find | while read`).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");

const exts = new Set([".scss", ".css"]);
const basenames = new Set(["NiivuePatcher.js", "util.js"]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function shouldCopy(rel) {
  const base = path.basename(rel);
  if (basenames.has(base)) return true;
  const ext = path.extname(rel);
  return exts.has(ext);
}

const files = walk(srcDir).filter((f) => shouldCopy(path.relative(srcDir, f)));
for (const file of files) {
  const rel = path.relative(srcDir, file);
  const dest = path.join(distDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
}

console.log(`copy-assets: copied ${files.length} file(s) to dist/`);
