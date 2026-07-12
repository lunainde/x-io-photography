#!/usr/bin/env node
// One-time/repeatable bulk importer: walks media-import/<category>/*, uploads
// each photo to Sanity, and tags it with every category folder it was found
// in (same filename dropped in multiple folders -> one document with
// multiple categories, not multiple documents).
//
// Identity is by FILENAME (stable across edits), not file content:
// - New filename                          -> creates a new document
// - Existing filename, unchanged content   -> skipped entirely (title/alt/
//                                             order you edited in Studio are
//                                             left alone)
// - Existing filename, unchanged content,
//   different folder placement            -> only `categories` is patched
// - Existing filename, CHANGED content
//   (e.g. a contrast/crop re-export)       -> re-uploads the asset and
//                                             updates `image` + categories,
//                                             still leaves title/alt/order
//                                             alone
// Renaming a file on re-export is treated as a brand new photo -- keep
// filenames stable across edits to get the "replace" behavior.
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

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const byFilename = new Map(); // filename -> { path, categories: Set }

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

    if (!byFilename.has(entry)) {
      byFilename.set(entry, { path: fullPath, categories: new Set() });
    }
    byFilename.get(entry).categories.add(category);
  }
}

if (byFilename.size === 0) {
  console.log(`No images found under ${rootDir}. Expected subfolders: ${CATEGORIES.join(", ")}`);
  process.exit(0);
}

console.log(`Found ${byFilename.size} image(s) across category folders in ${rootDir}\n`);

const existing = new Map(
  (await client.fetch(`*[_type == "mediaItem"]{_id, categories, importHash}`)).map((d) => [
    d._id,
    { categories: d.categories || [], importHash: d.importHash },
  ])
);

let i = 0;
let created = 0;
let updated = 0;
let retagged = 0;
let skipped = 0;

for (const [filename, info] of byFilename) {
  i++;
  const docId = `mediaItem-${slugify(basename(filename, extname(filename)))}`;
  const categories = Array.from(info.categories).sort();
  const hash = hashFile(info.path);

  const prior = existing.get(docId);

  if (prior && prior.importHash === hash) {
    const sameCategories =
      prior.categories.length === categories.length &&
      [...prior.categories].sort().every((c, idx) => c === categories[idx]);

    if (sameCategories) {
      console.log(`[${i}/${byFilename.size}] ${filename} -> unchanged, skipping`);
      skipped++;
    } else {
      console.log(`[${i}/${byFilename.size}] ${filename} -> categories changed: ${categories.join(", ")}`);
      await client.patch(docId).set({ categories }).commit();
      retagged++;
    }
    continue;
  }

  const asset = await client.assets.upload("image", readFileSync(info.path), { filename });

  if (prior) {
    console.log(`[${i}/${byFilename.size}] ${filename} -> content changed, replacing image`);
    await client
      .patch(docId)
      .set({
        categories,
        importHash: hash,
        image: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
      })
      .commit();
    updated++;
  } else {
    const title = humanize(filename);
    console.log(`[${i}/${byFilename.size}] ${filename} -> new, categories: ${categories.join(", ")}`);
    await client.createIfNotExists({
      _id: docId,
      _type: "mediaItem",
      title,
      mediaType: "image",
      categories,
      alt: title,
      order: i,
      importHash: hash,
      image: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
    });
    created++;
  }
}

console.log(
  `\nDone. ${created} new, ${updated} content-updated, ${retagged} re-tagged, ${skipped} unchanged.`
);
if (created > 0 || updated > 0) {
  console.log("Check the Studio (/studio) to review titles, alt text, and order.");
}
