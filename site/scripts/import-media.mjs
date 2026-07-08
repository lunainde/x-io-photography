#!/usr/bin/env node
// One-time/repeatable bulk importer: walks media-import/<category>/*, uploads
// each unique image to Sanity once, and tags it with every category folder
// it was found in (same file dropped in multiple folders -> one document
// with multiple categories, not multiple documents).
//
// Usage (from site/):
//   npm run import-media
//   npm run import-media -- ../media-import   (custom source folder)

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@sanity/client";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";

// Keep in sync with src/lib/categories.ts.
const CATEGORIES = [
  "home",
  "architecture",
  "black-white",
  "color",
  "food",
  "places",
  "berlin",
];

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !dataset || !token) {
  console.error(
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN in site/.env.local"
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
});

const importDir = process.argv[2] || "../media-import";
const rootDir = join(process.cwd(), importDir);

function humanize(filename) {
  return basename(filename, extname(filename))
    .replace(/[-_]+/g, " ")
    .trim();
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const byHash = new Map(); // hash -> { path, filename, categories: Set }

for (const category of CATEGORIES) {
  const dir = join(rootDir, category);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    continue; // folder doesn't exist yet, skip
  }
  for (const entry of entries) {
    const ext = extname(entry).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;
    const fullPath = join(dir, entry);
    if (!statSync(fullPath).isFile()) continue;

    const hash = hashFile(fullPath);
    if (!byHash.has(hash)) {
      byHash.set(hash, { path: fullPath, filename: entry, categories: new Set() });
    }
    byHash.get(hash).categories.add(category);
  }
}

if (byHash.size === 0) {
  console.log(`No images found under ${rootDir}. Expected subfolders: ${CATEGORIES.join(", ")}`);
  process.exit(0);
}

console.log(`Found ${byHash.size} unique image(s) across category folders in ${rootDir}\n`);

let i = 0;
for (const [hash, info] of byHash) {
  i++;
  const docId = `mediaItem-${hash.slice(0, 16)}`;
  const categories = Array.from(info.categories);
  const title = humanize(info.filename);

  console.log(`[${i}/${byHash.size}] ${info.filename} -> ${categories.join(", ")}`);

  const asset = await client.assets.upload("image", readFileSync(info.path), {
    filename: info.filename,
  });

  await client.createOrReplace({
    _id: docId,
    _type: "mediaItem",
    title,
    mediaType: "image",
    categories,
    alt: title,
    order: i,
    image: {
      _type: "image",
      asset: { _type: "reference", _ref: asset._id },
    },
  });
}

console.log("\nDone. Check the Studio (/studio) to review titles, alt text, and order.");
