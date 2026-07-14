#!/usr/bin/env node
// AI metadata pipeline: recursively scans media-import/<category>/* for
// photos and videos, asks Gemini to generate alt text / caption / author for
// each one, renames the file to a URL-friendly
// "<category>-<alt-text>-by-<author>.<ext>", and writes a
// media-metadata.ndjson sidecar file that `npm run import-media` reads to
// populate the Sanity alt/caption/author fields instead of auto-deriving
// them from the filename.
//
// Run this BEFORE `npm run import-media`, from the same folder (site/).
//
// The same photo copied into multiple category folders (the existing
// multi-category workflow -- see README) is detected by content hash, not
// filename, so it's only sent to Gemini once and every copy is renamed to
// the same final filename (required for import-media.mjs's own
// filename-based multi-category grouping to keep working).
//
// Resumable: files already present in media-metadata.ndjson (matched by
// content hash) are skipped -- safe to re-run after an interruption or after
// adding a few more files without re-spending API quota on ones already
// processed.
//
// Usage (from site/):
//   npm run generate-metadata
//   npm run generate-metadata -- ../media-import   (custom source folder)

import { config } from "dotenv";
config({ path: ".env.local" });

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join } from "node:path";
import { CATEGORIES, classifyMediaType, mimeTypeForExt, slugify } from "./media-shared.mjs";

// Free tier is 10 requests/minute -> one request every 6s keeps a safe margin.
const RATE_LIMIT_DELAY_MS = 6000;
const MODEL_NAME = "gemini-2.0-flash";

const PROMPT = `Analyze this photo or video and return a JSON object with these exact keys:
- "altText": a concise accessibility description, max 10 words
- "caption": a short, creative title for the piece
- "author": always the literal string "X-iO"
Return ONLY the JSON object -- no markdown code fences, no extra text.`;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in site/.env.local");
  process.exit(1);
}

const fileManager = new GoogleAIFileManager(apiKey);
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: { responseMimeType: "application/json" },
});

const importDir = process.argv[2] || "../media-import";
const rootDir = join(process.cwd(), importDir);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(walk(fullPath));
    } else if (entry.isFile()) {
      out.push({ name: entry.name, path: fullPath });
    }
  }
  return out;
}

function parseJsonResponse(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
  const data = JSON.parse(cleaned);
  if (!data.altText || !data.caption) {
    throw new Error(`Response missing altText/caption: ${text}`);
  }
  return {
    altText: String(data.altText).trim(),
    caption: String(data.caption).trim(),
    author: String(data.author || "X-iO").trim(),
  };
}

async function analyzeFile(path, mimeType, displayName) {
  const buffer = readFileSync(path);
  const uploadResult = await fileManager.uploadFile(buffer, { mimeType, displayName });
  let file = uploadResult.file;
  while (file.state === FileState.PROCESSING) {
    await sleep(5000);
    file = await fileManager.getFile(file.name);
  }
  if (file.state === FileState.FAILED) {
    throw new Error("Gemini file processing failed");
  }

  const result = await model.generateContent([
    { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
    { text: PROMPT },
  ]);

  const parsed = parseJsonResponse(result.response.text());

  // Best-effort cleanup; files auto-expire after 48h regardless.
  fileManager.deleteFile(file.name).catch(() => {});

  return parsed;
}

function uniqueFilename(base, ext, used) {
  let candidate = `${base}${ext}`;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${n}${ext}`;
    n++;
  }
  used.add(candidate);
  return candidate;
}

// -- Scan --------------------------------------------------------------

const filesByHash = new Map(); // hash -> { ext, mediaType, mimeType, categories:Set, occurrences:[{category,path,filename}] }

for (const category of CATEGORIES) {
  for (const file of walk(join(rootDir, category))) {
    const ext = extname(file.name).toLowerCase();
    const mediaType = classifyMediaType(ext);
    if (!mediaType) continue;

    const buffer = readFileSync(file.path);
    const hash = createHash("sha256").update(buffer).digest("hex");

    if (!filesByHash.has(hash)) {
      filesByHash.set(hash, {
        ext,
        mediaType,
        mimeType: mimeTypeForExt(ext),
        categories: new Set(),
        occurrences: [],
      });
    }
    const group = filesByHash.get(hash);
    group.categories.add(category);
    group.occurrences.push({ category, path: file.path, filename: file.name });
  }
}

if (filesByHash.size === 0) {
  console.log(`No media found under ${rootDir}. Expected subfolders: ${CATEGORIES.join(", ")}`);
  process.exit(0);
}

// -- Load existing metadata (resumability) ------------------------------

const metadataPath = join(rootDir, "media-metadata.ndjson");
const existingByHash = new Map();
const usedFilenames = new Set();
if (existsSync(metadataPath)) {
  for (const line of readFileSync(metadataPath, "utf8").split("\n").filter(Boolean)) {
    const record = JSON.parse(line);
    existingByHash.set(record.hash, record);
    usedFilenames.add(record.filename);
  }
}

// -- Analyze, rename, collect -------------------------------------------

const hashGroups = Array.from(filesByHash.entries());
const results = [];
const failures = [];
let analyzed = 0;

for (let idx = 0; idx < hashGroups.length; idx++) {
  const [hash, group] = hashGroups[idx];
  const categories = Array.from(group.categories).sort(
    (a, b) => CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b)
  );
  // "home" is the hero background feed, not really a subject category --
  // prefer a more descriptive category for the filename when there is one.
  const primaryCategory = categories.find((c) => c !== "home") ?? categories[0];
  const firstOccurrence = group.occurrences[0];

  let record = existingByHash.get(hash);
  if (!record) {
    console.log(
      `[${idx + 1}/${hashGroups.length}] Analyzing ${firstOccurrence.filename} (${group.mediaType})...`
    );
    try {
      const ai = await analyzeFile(firstOccurrence.path, group.mimeType, firstOccurrence.filename);
      const base = `${primaryCategory}-${slugify(ai.altText)}-by-${slugify(ai.author)}`;
      const filename = uniqueFilename(base, group.ext, usedFilenames);
      record = {
        hash,
        filename,
        mediaType: group.mediaType,
        alt: ai.altText,
        caption: ai.caption,
        author: ai.author,
      };
      analyzed++;
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      failures.push({ file: firstOccurrence.filename, error: err.message });
      continue;
    } finally {
      if (idx < hashGroups.length - 1) await sleep(RATE_LIMIT_DELAY_MS);
    }
  } else {
    console.log(`[${idx + 1}/${hashGroups.length}] Skipping ${record.filename} (already processed)`);
  }

  for (const occ of group.occurrences) {
    if (occ.filename !== record.filename) {
      const newPath = join(dirname(occ.path), record.filename);
      renameSync(occ.path, newPath);
      console.log(`  renamed ${occ.filename} -> ${record.filename} (${occ.category})`);
    }
  }

  results.push(record);
}

writeFileSync(
  metadataPath,
  results.map((r) => JSON.stringify(r)).join("\n") + (results.length ? "\n" : "")
);

console.log(
  `\nDone. ${analyzed} new file(s) analyzed, ${results.length - analyzed} already cached, ${failures.length} failed.`
);
console.log(`Metadata written to ${metadataPath}`);
if (failures.length) {
  console.log("\nFailed (left unrenamed -- fix and re-run to retry):");
  for (const f of failures) console.log(`  - ${f.file}: ${f.error}`);
}
