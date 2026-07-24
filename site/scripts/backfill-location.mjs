#!/usr/bin/env node
// Backfills the `location` field on mediaItem documents that already exist
// in Sanity (uploaded before location capture was added to import-media.mjs).
// Doesn't touch Sanity's stored asset -- reads GPS straight from the local
// source file in media-import/, matched to each document by the same
// content-hash docId scheme import-media.mjs uses (mediaItem-<hash16>), then
// reverse-geocodes to a city name via geocode.mjs.
//
// Only processes documents missing `location` (safe to re-run after a
// partial run, same idempotent pattern as backfill-metadata.mjs). Photos
// with no GPS EXIF, or where reverse geocoding can't resolve a city, are
// left for manual entry in the Studio -- this script only ever fills in
// what it can determine automatically.
//
// Usage (from site/):
//   npm run backfill-location
//   npm run backfill-location -- --limit=50
//   npm run backfill-location -- --force   (reprocess even documents that
//     already have a location -- e.g. after a geocoding-behavior fix)

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@sanity/client";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { locationForFile, sleep, NOMINATIM_DELAY_MS } from "./geocode.mjs";

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
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN in site/.env.local",
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

let limitArg = null;
let force = false;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--limit=")) limitArg = Number(arg.slice("--limit=".length));
  else if (arg === "--force") force = true;
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

// --- Build hash -> local file path map, same scan import-media.mjs does ---

const rootDir = join(process.cwd(), "../media-import");
const pathByHash16 = new Map();

for (const category of CATEGORIES) {
  const dir = join(rootDir, category);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    continue;
  }
  for (const entry of entries) {
    if (!IMAGE_EXTENSIONS.has(extname(entry).toLowerCase())) continue;
    const fullPath = join(dir, entry);
    if (!statSync(fullPath).isFile()) continue;
    const hash16 = hashFile(fullPath).slice(0, 16);
    if (!pathByHash16.has(hash16)) pathByHash16.set(hash16, fullPath);
  }
}

console.log(`Indexed ${pathByHash16.size} local file(s) by content hash.\n`);

// --- Find documents missing location -----------------------------------

let docs = await client.fetch(
  `*[_type == "mediaItem" && mediaType == "image"${force ? "" : " && !defined(location)"}]{ _id, title }`,
);

if (docs.length === 0) {
  console.log("No matching documents need a location backfill.");
  process.exit(0);
}

if (limitArg) docs = docs.slice(0, limitArg);

console.log(`Backfilling location on ${docs.length} document(s)...\n`);

let i = 0;
for (const doc of docs) {
  i++;
  console.log(`[${i}/${docs.length}] ${doc.title} (${doc._id})`);

  const hash16 = doc._id.replace(/^mediaItem-/, "");
  const localPath = pathByHash16.get(hash16);
  if (!localPath) {
    console.warn("  No matching local file found, skipping.");
    continue;
  }

  try {
    const location = await locationForFile(localPath);
    if (location) {
      await client.patch(doc._id).set({ location }).commit();
      console.log(`  location: ${location}`);
    } else {
      console.log("  No GPS EXIF data on this file -- needs manual entry.");
    }
  } catch (err) {
    console.warn(`  Failed, leaving document unchanged: ${err.message}`);
  }

  if (i < docs.length) await sleep(NOMINATIM_DELAY_MS);
}

console.log("\nDone. Check the Studio (/studio) to review locations.");
