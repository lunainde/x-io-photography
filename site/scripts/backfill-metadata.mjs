#!/usr/bin/env node
// Backfills alt text + caption on mediaItem documents that ALREADY exist in
// Sanity (no local files needed -- images are fetched from Sanity's own CDN,
// downsized, and sent to Gemini via scripts/gemini-metadata.mjs, the same
// shared logic used by import-media.mjs for new uploads). Only patches the
// `alt` and `caption` fields; nothing else on the document is touched.
//
// By default only processes documents still missing real data
// (no caption yet, or alt still equal to the fallback title) -- so it's
// safe to re-run after a partial/quota-limited run without wasting calls
// on ones that already succeeded. Pass --force to reprocess regardless.
//
// Usage (from site/):
//   npm run backfill-metadata -- --title="architecture 1086"   (single doc,
//     for testing before running a whole collection)
//   npm run backfill-metadata -- --id=mediaItem-xxxxxxxxxxxxxxxx
//   npm run backfill-metadata -- --category=architecture         (one
//     collection at a time)
//   npm run backfill-metadata -- --category=architecture --limit=10
//   npm run backfill-metadata -- --category=architecture --force

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@sanity/client";
import { generateAltAndCaption, sleep, GEMINI_DELAY_MS } from "./gemini-metadata.mjs";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !dataset || !token) {
  console.error(
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN in site/.env.local"
  );
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in site/.env.local");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
});

let idArg = null;
let titleArg = null;
let categoryArg = null;
let limitArg = null;
let force = false;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--id=")) idArg = arg.slice("--id=".length);
  else if (arg.startsWith("--title=")) titleArg = arg.slice("--title=".length);
  else if (arg.startsWith("--category=")) categoryArg = arg.slice("--category=".length);
  else if (arg.startsWith("--limit=")) limitArg = Number(arg.slice("--limit=".length));
  else if (arg === "--force") force = true;
}

if (!idArg && !titleArg && !categoryArg) {
  console.error(
    "Pass one of --id=, --title=, or --category= to scope which document(s) to backfill."
  );
  process.exit(1);
}

// --- Build query ------------------------------------------------------------

const filters = [`_type == "mediaItem"`, `mediaType == "image"`];
const params = {};
if (idArg) {
  filters.push(`_id == $id`);
  params.id = idArg;
}
if (titleArg) {
  filters.push(`title == $title`);
  params.title = titleArg;
}
if (categoryArg) {
  filters.push(`$category in categories`);
  params.category = categoryArg;
}
if (!force) {
  filters.push(`(!defined(caption) || !defined(alt) || alt == title)`);
}

const query = `*[${filters.join(" && ")}] | order(order asc) {
  _id, title, alt, caption, "imageUrl": image.asset->url
}`;

let docs = await client.fetch(query, params);

if (docs.length === 0) {
  console.log("No matching documents need backfilling (or none found).");
  process.exit(0);
}

if (limitArg) docs = docs.slice(0, limitArg);

console.log(`Backfilling ${docs.length} document(s)...\n`);

let i = 0;
for (const doc of docs) {
  i++;
  console.log(`[${i}/${docs.length}] ${doc.title} (${doc._id})`);

  if (!doc.imageUrl) {
    console.warn("  No image asset on this document, skipping.");
    continue;
  }

  try {
    const { alt, caption } = await generateAltAndCaption(doc.imageUrl);
    await client.patch(doc._id).set({ alt, caption }).commit();
    console.log(`  alt: ${alt}`);
    console.log(`  caption: ${caption}`);
  } catch (err) {
    console.warn(`  Failed, leaving document unchanged: ${err.message}`);
  }

  if (i < docs.length) await sleep(GEMINI_DELAY_MS);
}

console.log("\nDone. Check the Studio (/studio) to review alt text and captions.");
