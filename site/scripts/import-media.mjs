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
// If media-import/media-metadata.ndjson exists (see `npm run
// generate-metadata`), alt/caption/author are read from it instead of being
// auto-derived from the filename.
//
// Usage (from site/):
//   npm run import-media
//   npm run import-media -- ../media-import   (custom source folder)

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@sanity/client";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { CATEGORIES, classifyMediaType, humanize, slugify } from "./media-shared.mjs";

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

// Optional AI-generated metadata (alt/caption/author), keyed by filename.
// See generate-metadata.mjs -- it writes this file next to the category
// folders after renaming files to include their alt text.
const metadataPath = join(rootDir, "media-metadata.ndjson");
const metadataByFilename = new Map();
if (existsSync(metadataPath)) {
  const lines = readFileSync(metadataPath, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    const record = JSON.parse(line);
    metadataByFilename.set(record.filename, record);
  }
  console.log(`Loaded AI metadata for ${metadataByFilename.size} file(s) from media-metadata.ndjson\n`);
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
    const mediaType = classifyMediaType(ext);
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
  const meta = metadataByFilename.get(filename);
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
    alt: meta?.alt || title,
    ...(meta?.caption ? { caption: meta.caption } : {}),
    ...(meta?.author ? { author: meta.author } : {}),
    order: i,
    ...(info.mediaType === "video"
      ? { video: { _type: "file", asset: { _type: "reference", _ref: asset._id } } }
      : { image: { _type: "image", asset: { _type: "reference", _ref: asset._id } } }),
  });
}

console.log(`\nDone. Library replaced: ${existingIds.length} removed, ${byFilename.size} imported.`);
