#!/bin/bash
# Runs the alt-text/caption backfill once a day, within Gemini free-tier limits.
# Installed as a launchd job (see scripts/com.x-io.backfill-metadata.plist).
# Safe to re-run any time: backfill-metadata.mjs only touches documents still
# missing real alt/caption, so a missed or repeated day just picks up where
# the last successful run left off.

set -euo pipefail

export PATH="/Users/dvh/.nvm/versions/node/v22.23.1/bin:/usr/local/bin:/usr/bin:/bin"

cd "/Users/dvh/projects/x-io-photography/site"

echo "=== $(date) ==="
npm run backfill-metadata -- --limit=18
