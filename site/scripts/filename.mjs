// Filename parsing shared by import-media.mjs (bulk CLI import) and the
// Studio "Generate metadata" action (src/app/api/generate-metadata/route.ts)
// -- one place to change if the naming convention ever does.
//
// Expected form: <category>_by_<author>_<number>.<ext>
// e.g. black-white_by_X-iO_1000.JPG
// Filenames that don't follow it (e.g. a phone's IMG_1234.JPG dropped
// straight into Studio) just fail to parse -- callers fall back to a
// sensible default rather than treating that as an error.

import { basename, extname } from "node:path";

export function humanize(text) {
  return text.replace(/[-_]+/g, " ").trim();
}

// "black-white_by_X-iO_1000.JPG" -> { author: "X-iO", number: "1000" }
export function parseFilename(filename) {
  const base = basename(filename, extname(filename));
  const byIdx = base.indexOf("_by_");
  if (byIdx === -1) return null;
  const rest = base.slice(byIdx + "_by_".length);
  const lastUnderscore = rest.lastIndexOf("_");
  if (lastUnderscore === -1) return null;
  const author = rest.slice(0, lastUnderscore);
  const number = rest.slice(lastUnderscore + 1);
  if (!author || !number) return null;
  return { author, number };
}
