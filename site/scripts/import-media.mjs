#!/usr/bin/env node
// One-time/repeatable bulk importer: walks media-import/<category>/*, uploads
// each unique image to Sanity once, and tags it with every category folder
// it was found in (same file dropped in multiple folders -> one document
// with multiple categories, not multiple documents).
//
// Safe to re-run: documents already imported (same file content, deterministic
// hash-based _id) are skipped entirely -- their asset is not re-uploaded, and
// any title/alt text/order you've hand-edited in Studio since is left alone.
// Only files not yet in Sanity get created.
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

const existing = new Map(
  (await client.fetch(`*[_type == "mediaItem"]{_id, categories}`)).map((d) => [
    d._id,
    d.categories || [],
  ])
);

let i = 0;
let imported = 0;
let retagged = 0;
let skipped = 0;
for (const [hash, info] of byHash) {
  i++;
  const docId = `mediaItem-${hash.slice(0, 16)}`;
  const categories = Array.from(info.categories).sort();

  if (existing.has(docId)) {
    const current = [...existing.get(docId)].sort();
    const unchanged =
      current.length === categories.length &&
      current.every((c, idx) => c === categories[idx]);

    if (unchanged) {
      console.log(`[${i}/${byHash.size}] ${info.filename} -> already imported, skipping`);
      skipped++;
    } else {
      console.log(
        `[${i}/${byHash.size}] ${info.filename} -> categories changed, updating to: ${categories.join(", ")}`
      );
      await client.patch(docId).set({ categories }).commit();
      retagged++;
    }
    continue;
  }

  const title = humanize(info.filename);
  console.log(`[${i}/${byHash.size}] ${info.filename} -> ${categories.join(", ")}`);

  const asset = await client.assets.upload("image", readFileSync(info.path), {
    filename: info.filename,
  });

  await client.createIfNotExists({
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
  imported++;
}

console.log(
  `\nDone. ${imported} new, ${retagged} re-tagged, ${skipped} already there (untouched).`
);
if (imported > 0) {
  console.log("Check the Studio (/studio) to review titles, alt text, and order for the new ones.");
}
