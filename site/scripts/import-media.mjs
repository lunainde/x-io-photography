#!/usr/bin/env node
// Full-replace bulk importer: WIPES every existing mediaItem document in
// Sanity, then re-creates one per photo/video found under
// media-import/<category>/*, tagged with every category folder it appears in
// (same filename in multiple folders -> one multi-category document, not
// multiple documents).
//
// This is destructive by design: media-import/ is treated as the single
// source of truth. Anything currently in Sanity that isn't in your local
// folders right now gets deleted. Re-run any time your local selection
// changes (added, removed, or edited photos) to bring Sanity back in sync.
//
// Usage (from site/):
//   npm run import-media
//   npm run import-media -- ../media-import   (custom source folder)

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@sanity/client";
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
const VIDEO_EXTENSIONS = new Set([".mov", ".mp4", ".webm", ".m4v"]);

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

const byFilename = new Map(); // filename -> { path, mediaType, categories: Set }

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
    const mediaType = IMAGE_EXTENSIONS.has(ext)
      ? "image"
      : VIDEO_EXTENSIONS.has(ext)
        ? "video"
        : null;
    if (!mediaType) continue;
    const fullPath = join(dir, entry);
    if (!statSync(fullPath).isFile()) continue;

    if (!byFilename.has(entry)) {
      byFilename.set(entry, { path: fullPath, mediaType, categories: new Set() });
    }
    byFilename.get(entry).categories.add(category);
  }
}

if (byFilename.size === 0) {
  console.log(`No media found under ${rootDir}. Expected subfolders: ${CATEGORIES.join(", ")}`);
  process.exit(0);
}

const existingIds = await client.fetch(`*[_type == "mediaItem"]._id`);
if (existingIds.length > 0) {
  console.log(`Deleting ${existingIds.length} existing media item(s)...`);
  const tx = client.transaction();
  existingIds.forEach((id) => tx.delete(id));
  await tx.commit();
}

console.log(`Importing ${byFilename.size} media item(s) from ${rootDir}\n`);

let i = 0;
for (const [filename, info] of byFilename) {
  i++;
  const docId = `mediaItem-${slugify(basename(filename, extname(filename)))}`;
  const categories = Array.from(info.categories);
  const title = humanize(filename);

  console.log(
    `[${i}/${byFilename.size}] (${info.mediaType}) ${filename} -> ${categories.join(", ")}`
  );

  const asset = await client.assets.upload(
    info.mediaType === "video" ? "file" : "image",
    readFileSync(info.path),
    { filename }
  );

  await client.create({
    _id: docId,
    _type: "mediaItem",
    title,
    mediaType: info.mediaType,
    categories,
    alt: title,
    order: i,
    ...(info.mediaType === "video"
      ? { video: { _type: "file", asset: { _type: "reference", _ref: asset._id } } }
      : { image: { _type: "image", asset: { _type: "reference", _ref: asset._id } } }),
  });
}

console.log(`\nDone. Library replaced: ${existingIds.length} removed, ${byFilename.size} imported.`);
