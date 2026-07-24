// GPS extraction (from local file EXIF) + reverse geocoding to a city name,
// shared by import-media.mjs (new uploads) and backfill-location.mjs
// (documents already in Sanity). City-only granularity by design -- see
// chat with the client on why (accuracy at neighborhood level is patchy for
// indoor/weak-fix photos, and city+country is redundant for a Berlin-heavy
// catalog).

import exifr from "exifr";

// OpenStreetMap's Nominatim usage policy caps free reverse-geocoding at 1
// request/second and requires an identifying User-Agent -- both enforced
// here so a batch run doesn't get the IP blocked.
export const NOMINATIM_DELAY_MS = 1100;
const NOMINATIM_USER_AGENT = "x-io-photography-import/1.0 (contact: dvh)";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function extractGps(filePath) {
  try {
    const gps = await exifr.gps(filePath);
    if (!gps || typeof gps.latitude !== "number" || typeof gps.longitude !== "number") {
      return null;
    }
    return gps;
  } catch {
    return null; // no EXIF, corrupt data, unsupported format, etc.
  }
}

export async function reverseGeocodeCity(latitude, longitude) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1&accept-language=en`;

  const res = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Nominatim error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const a = data.address || {};
  return a.city || a.town || a.village || a.municipality || a.county || null;
}

// Convenience: GPS -> city name in one call, null if either step comes up
// empty (no EXIF GPS, or geocoding couldn't resolve a city-level name).
export async function locationForFile(filePath) {
  const gps = await extractGps(filePath);
  if (!gps) return null;
  return reverseGeocodeCity(gps.latitude, gps.longitude);
}
