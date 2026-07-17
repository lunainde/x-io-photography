// Shared Gemini alt-text + caption generation, used by both import-media.mjs
// (new uploads) and backfill-metadata.mjs (existing Sanity documents), so
// there's exactly one code path to validate/fix instead of two copies
// drifting apart.
//
// Takes a Sanity image asset URL (works for both a just-uploaded asset and
// an existing one) and fetches a downsized version straight from Sanity's
// own image pipeline before sending it to Gemini -- smaller image, fewer
// input tokens, no local file needed either way.

const GEMINI_MODEL = "gemini-2.0-flash";
export const GEMINI_DELAY_MS = 6000;

const GEMINI_PROMPT =
  "You are labeling a photo for a photography portfolio website. " +
  'Respond only with JSON: {"alt": string, "caption": string}. ' +
  '"alt" is a concise, plain-language description of the visual content, ' +
  'under 125 characters, for accessibility/SEO. No "photo of"/"image of" phrasing. ' +
  '"caption" is a short, evocative creative title for the piece (a few words, ' +
  "not a literal description), under 60 characters.";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateAltAndCaption(imageUrl) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY in site/.env.local");
  }

  const downsizedUrl = `${imageUrl}?w=1024&q=80&fm=jpg`;
  const imageRes = await fetch(downsizedUrl);
  if (!imageRes.ok) {
    throw new Error(`Failed to fetch image from Sanity CDN: ${imageRes.status}`);
  }
  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: GEMINI_PROMPT },
              { inline_data: { mime_type: "image/jpeg", data: imageBuffer.toString("base64") } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              alt: { type: "STRING" },
              caption: { type: "STRING" },
            },
            required: ["alt", "caption"],
          },
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  const parsed = JSON.parse(text);
  if (!parsed.alt || !parsed.caption) throw new Error(`Gemini response missing alt/caption: ${text}`);
  return parsed;
}
