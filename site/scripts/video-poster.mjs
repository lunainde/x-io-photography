// Extracts a still frame from a video (local file or remote URL) via
// ffmpeg, for use as a mediaItem's videoPoster when one wasn't set by hand
// in Studio. import-media.mjs doesn't otherwise have any way to produce a
// poster image, since a "video" Sanity file asset has no notion of frames.
//
// Requires ffmpeg on PATH (e.g. `brew install ffmpeg` on macOS). If it's not
// installed, ffmpegAvailable() returns false and callers should skip poster
// generation rather than fail the whole upload/backfill -- same
// fail-soft pattern as the Gemini calls elsewhere in these scripts.

import { execSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

let cachedAvailable;
export function ffmpegAvailable() {
  if (cachedAvailable === undefined) {
    try {
      execSync("ffmpeg -version", { stdio: "ignore" });
      cachedAvailable = true;
    } catch {
      cachedAvailable = false;
    }
  }
  return cachedAvailable;
}

// 0.5s in rather than frame 0 -- some encoders write a black/blank first
// frame. Videos shorter than that just get ffmpeg's own nearest-frame
// fallback rather than an error.
const SEEK_TIME = "00:00:00.5";

export function extractPosterFromFile(videoPath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let stderr = "";
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-ss", SEEK_TIME,
      "-i", videoPath,
      "-frames:v", "1",
      "-f", "image2",
      "-vcodec", "mjpeg",
      "pipe:1",
    ]);
    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code !== 0 || chunks.length === 0) {
        reject(new Error(`ffmpeg exited ${code}: ${stderr.trim().slice(-300)}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

export async function extractPosterFromUrl(videoUrl) {
  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch video: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  // ffmpeg needs a real seekable file, not a piped stream, to honor -ss
  // reliably -- write to a scratch temp file and clean it up afterward.
  const dir = mkdtempSync(join(tmpdir(), "video-poster-"));
  const ext = extname(new URL(videoUrl).pathname) || ".mp4";
  const tempPath = join(dir, `input${ext}`);
  writeFileSync(tempPath, buffer);
  try {
    return await extractPosterFromFile(tempPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
