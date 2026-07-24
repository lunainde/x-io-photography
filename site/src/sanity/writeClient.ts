import { createClient, type SanityClient } from "next-sanity";
import { apiVersion, dataset, isSanityConfigured, projectId } from "./env";

// Server-only: holds the write token, so this must never be imported from a
// client component. Used by API routes that need to patch documents (e.g.
// the Studio "Generate metadata" action) -- the frontend's own `client` in
// client.ts is read-only and has no token.
const token = process.env.SANITY_API_TOKEN;

export const writeClient: SanityClient | null =
  isSanityConfigured && token
    ? createClient({
        projectId,
        dataset,
        apiVersion,
        token,
        useCdn: false,
      })
    : null;
