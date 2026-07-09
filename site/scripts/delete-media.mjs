#!/usr/bin/env node
// Bulk-remove mediaItem documents for one category. If a document is tagged
// with other categories too, only the "home" (or whichever) tag is removed
// and the document is kept -- it still needs to show on its other galleries.
//
// Usage (from site/):
//   npm run delete-media -- home

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !dataset || !token) {
  console.error(
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN in site/.env.local"
  );
  process.exit(1);
}

const category = process.argv[2];
if (!category) {
  console.error("Usage: npm run delete-media -- <category-slug>");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
});

const docs = await client.fetch(
  `*[_type == "mediaItem" && $category in categories]{_id, title, categories}`,
  { category }
);

if (docs.length === 0) {
  console.log(`No mediaItem documents tagged "${category}".`);
  process.exit(0);
}

console.log(`Found ${docs.length} document(s) tagged "${category}":\n`);

const tx = client.transaction();
for (const doc of docs) {
  if (doc.categories.length <= 1) {
    tx.delete(doc._id);
    console.log(`  delete  ${doc.title || doc._id}`);
  } else {
    const remaining = doc.categories.filter((c) => c !== category);
    tx.patch(doc._id, (p) => p.set({ categories: remaining }));
    console.log(`  untag   ${doc.title || doc._id} -> ${remaining.join(", ")}`);
  }
}

await tx.commit();
console.log("\nDone.");
