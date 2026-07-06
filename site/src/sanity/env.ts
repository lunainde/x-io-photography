// These are intentionally allowed to be undefined: until a Sanity project is
// wired up (see /site/README.md), the app falls back to placeholder tiles
// instead of crashing.
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const isSanityConfigured = Boolean(projectId && dataset);
