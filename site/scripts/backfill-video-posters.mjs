#!/usr/bin/env node
// Backfills videoPoster on video mediaItem documents that already exist in
// Sanity but have no poster set -- e.g. videos re-uploaded by import-media.mjs
// (which never sets a poster of its own) after a --replace wiped out one that
// was previously set by hand in Studio. No local files needed: the video is
// fetched from Sanity's own CDN, a still frame is extracted via ffmpeg, and
// the resulting image is uploaded and patched onto the document as its
// videoPoster. Only that one field is touched.
//
// Requires ffmpeg on PATH (e.g. `brew install ffmpeg` on macOS).
//
// By default only processes videos missing a poster, so it's safe to re-run
// after an interruption -- already-fixed ones are skipped. Pass --force to
// regenerate regardless (e.g. to replace a bad auto-extracted frame).
//
// Usage (from site/):
//   npm run backfill-video-posters -- --title="home 1000"   (single doc, for testing)
//   npm run backfill-video-posters -- --id=mediaItem-xxxxxxxxxxxxxxxx
//   npm run backfill-video-posters -- --category=home         (one collection at a time)
//   npm run backfill-video-posters -- --category=home --force

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@sanity/client";
import { ffmpegAvailable, extractPosterFromUrl } from "./video-poster.mjs";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !dataset || !token) {
  console.error(
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN in site/.env.local"
  );
  process.exit(1);
}
if (!ffmpegAvailable()) {
  console.error(
    "ffmpeg not found on PATH. Install it (e.g. `brew install ffmpeg` on macOS) and try again."
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

const filters = [`_type == "mediaItem"`, `mediaType == "video"`];
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
  filters.push(`!defined(videoPoster.asset)`);
}

const query = `*[${filters.join(" && ")}] | order(order asc) {
  _id, title, "videoUrl": video.asset->url
}`;

let docs = await client.fetch(query, params);

if (docs.length === 0) {
  console.log("No matching videos need a poster (or none found).");
  process.exit(0);
}

if (limitArg) docs = docs.slice(0, limitArg);

console.log(`Backfilling posters for ${docs.length} video(s)...\n`);

let i = 0;
for (const doc of docs) {
  i++;
  console.log(`[${i}/${docs.length}] ${doc.title} (${doc._id})`);

  if (!doc.videoUrl) {
    console.warn("  No video asset on this document, skipping.");
    continue;
  }

  try {
    const posterBuffer = await extractPosterFromUrl(doc.videoUrl);
    const posterAsset = await client.assets.upload("image", posterBuffer, {
      filename: `${doc._id}-poster.jpg`,
    });
    await client.patch(doc._id).set({
      videoPoster: {
        _type: "image",
        asset: { _type: "reference", _ref: posterAsset._id },
      },
    }).commit();
    console.log(`  poster set (asset ${posterAsset._id})`);
  } catch (err) {
    console.warn(`  Failed, leaving document unchanged: ${err.message}`);
  }
}

console.log("\nDone. Check the Studio (/studio) to review the generated posters.");
