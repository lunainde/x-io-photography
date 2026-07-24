import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/sanity/writeClient";
// Reuses the exact same Gemini/geocoding logic the CLI import scripts use --
// see scripts/gemini-metadata.mjs and scripts/geocode.mjs for the shared
// implementation (one place to fix if the model gets deprecated again, or
// the geocoding language/precision needs to change).
import { generateAltAndCaption } from "../../../../scripts/gemini-metadata.mjs";
import { reverseGeocodeCity } from "../../../../scripts/geocode.mjs";
import { humanize, parseFilename } from "../../../../scripts/filename.mjs";

interface GeneratedDoc {
  mediaType?: string;
  title?: string;
  author?: string;
  categories?: string[];
  imageUrl?: string;
  originalFilename?: string;
  gpsLat?: number;
  gpsLng?: number;
}

// Not a hard security boundary (a determined caller can spoof Origin), but
// blocks casual cross-origin abuse of a free-tier Gemini quota that's
// currently capped at ~20 requests/day for this project.
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!writeClient) {
    return NextResponse.json(
      { error: "Sanity write client not configured (missing SANITY_API_TOKEN)." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const id: string | undefined = body?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const doc: GeneratedDoc | null = await writeClient.fetch(
    `*[_id == $id][0]{
      mediaType,
      title,
      author,
      categories,
      "imageUrl": image.asset->url,
      "originalFilename": image.asset->originalFilename,
      "gpsLat": image.asset->metadata.location.lat,
      "gpsLng": image.asset->metadata.location.lng
    }`,
    { id },
  );

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (doc.mediaType !== "image" || !doc.imageUrl) {
    return NextResponse.json(
      { error: "Only image documents with an uploaded image are supported." },
      { status: 400 },
    );
  }

  const patch: Record<string, string> = {};
  const parsed = doc.originalFilename ? parseFilename(doc.originalFilename) : null;
  const primaryCategory = doc.categories?.[0];

  // Title/author: only fill in what's actually empty -- these are "sensible
  // defaults", not regenerated output, so a manual edit should never get
  // silently clobbered by a second click.
  if (!doc.title) {
    patch.title = parsed
      ? `${humanize(primaryCategory ?? "photo")} ${parsed.number}`
      : humanize(doc.originalFilename ?? "Untitled");
  }
  if (!doc.author) {
    patch.author = parsed?.author || "X-iO";
  }

  const warnings: string[] = [];

  // Alt/caption: always (re)generate -- clicking the action is the explicit
  // "regenerate" gesture if the author isn't happy with a first attempt.
  try {
    const { alt, caption } = await generateAltAndCaption(doc.imageUrl);
    patch.alt = alt;
    patch.caption = caption;
  } catch (err) {
    warnings.push(`Alt/caption: ${err instanceof Error ? err.message : "Gemini request failed"}`);
  }

  // Location: GPS EXIF (captured automatically by Sanity's own asset
  // pipeline, see the image field's metadata option) is objectively more
  // correct than any previous guess, so this also always overwrites --
  // but only when a GPS fix actually exists; no fix means no change, ever.
  if (typeof doc.gpsLat === "number" && typeof doc.gpsLng === "number") {
    try {
      const location = await reverseGeocodeCity(doc.gpsLat, doc.gpsLng);
      if (location) patch.location = location;
    } catch (err) {
      warnings.push(`Location: ${err instanceof Error ? err.message : "Geocoding failed"}`);
    }
  }

  if (Object.keys(patch).length > 0) {
    await writeClient.patch(id).set(patch).commit();
  }

  return NextResponse.json({
    patched: patch,
    warnings,
    hasGps: typeof doc.gpsLat === "number",
  });
}
