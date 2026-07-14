// Constants and helpers shared by the media-import pipeline scripts
// (generate-metadata.mjs and import-media.mjs), so folder/extension rules
// never drift between them.

import { basename, extname } from "node:path";

// Keep in sync with src/lib/categories.ts.
export const CATEGORIES = [
  "home",
  "architecture",
  "black-white",
  "color",
  "food",
  "places",
  "berlin",
];

export const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
export const VIDEO_EXTENSIONS = new Set([".mov", ".mp4", ".webm", ".m4v"]);

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
};

export function classifyMediaType(ext) {
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return null;
}

export function mimeTypeForExt(ext) {
  return MIME_TYPES[ext] ?? null;
}

export function humanize(filename) {
  return basename(filename, extname(filename))
    .replace(/[-_]+/g, " ")
    .trim();
}

export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
