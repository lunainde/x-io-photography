# X-iO — Photography & Film, Berlin

The X-iO photography/video portfolio site. Built with Next.js and Sanity CMS.

The actual app lives in **[`site/`](site/)** — all commands below are run from
inside that folder.

## Running it locally

```bash
cd site
npm install
npm run dev
```

Then open **http://localhost:3000**.

## Managing images and videos

Content is managed in **Sanity Studio**, embedded right in the app at
**http://localhost:3000/studio** (sign in with the account used to create the
Sanity project). No separate tool or login needed.

### Add, edit, or delete a single photo/video

1. Open `/studio`.
2. Click **Media item** in the left sidebar to see everything currently live.
3. To add: click **+** (top right), fill in:
   - **Title** — internal label only, not shown on the site
   - **Categories** — pick one or more: home, architecture, black & white,
     color, food, places, berlin. A photo can belong to several at once (e.g.
     a Berlin shot that's also color and architecture) — just check all that
     apply.
   - **Media type** — image or video
   - **Image**/**Video file** — upload it
   - **Alt text** — required, describes the photo for accessibility/SEO
   - **Caption** — optional short creative title
   - **Author** — optional, defaults to "X-iO"
   - **Order** — optional number; lower shows first within a category
   - Click **Publish** (top right) — drafts don't show on the live site.
4. To edit or delete: click any existing item in the list, change fields (or
   use the **⋯** menu → **Delete**), then Publish.

Changes appear on the live site within about a minute.

### Adding a lot of photos at once (bulk import)

For dozens/hundreds of images, use the bulk-import script instead of adding
them one by one:

1. Create a `media-import/` folder next to `site/` (i.e. at the same level as
   this README), with one subfolder per category:
   ```
   media-import/
     home/
     architecture/
     black-white/
     color/
     food/
     places/
     berlin/
   ```
2. Drop files into the matching folder(s) — photos (`.jpg`, `.jpeg`, `.png`,
   `.webp`, `.gif`) and videos (`.mov`, `.mp4`, `.webm`, `.m4v`) can be mixed
   freely. **If a file belongs to more than one category, copy the same file
   into each relevant folder** — the script detects it's the same file and
   tags it with all of them instead of creating duplicates.
3. In `site/.env.local`, add a write-access token (Sanity project → API →
   Tokens → Add token → **Editor** permission):
   ```
   SANITY_API_TOKEN=sk...
   ```
4. From `site/`, run:
   ```bash
   npm run import-media
   ```
5. Check `/studio` afterward to review/adjust titles, alt text, and ordering.

`media-import/` is git-ignored — it's just a local staging folder, Sanity is
the actual storage.

### Auto-generating alt text, captions, and author (AI)

Optional step, run **before** `npm run import-media`: instead of writing alt
text by hand for every file, have Gemini look at each photo/video and
generate it.

1. Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/apikey)
   and add it to `site/.env.local`:
   ```
   GEMINI_API_KEY=...
   ```
2. From `site/`, run:
   ```bash
   npm run generate-metadata
   ```
   For every file under `media-import/`, this asks Gemini for alt text, a
   caption, and an author, then renames the file to
   `<category>-<alt-text>-by-<author>.<ext>` (URL-friendly) and writes
   `media-import/media-metadata.ndjson`.
3. Run `npm run import-media` as usual — it reads that file automatically and
   fills in the `alt`, `caption`, and `author` fields instead of
   auto-deriving them from the filename.

**Updating one collection at a time** (to stay within the API rate/quota
limit instead of processing everything): pass `--category`, once per
category, to only send that category's *new* files to Gemini:
```bash
npm run generate-metadata -- --category black-white
npm run generate-metadata -- --category black-white --category color
```
Categories left out are untouched and can be picked up in a later run. A
photo copied into more than one category folder still gets renamed
consistently everywhere the moment any one of its categories is included in
a run — its other copies just aren't re-sent to Gemini.

Notes:
- **Rate limit**: paced at one request per 6 seconds to stay under the
  Gemini free tier's 10 requests/minute. For a few hundred files, expect it
  to take a while — that's expected.
- **Resumable**: files are matched by content hash, so if the script is
  interrupted or you add a few more files later, re-running it only
  processes what's new — already-processed files are skipped, not
  re-billed against your quota.
- **Multi-category files**: the same photo copied into several category
  folders is recognized as one file (by content, not filename) and only
  sent to Gemini once; every copy is renamed to the same final filename so
  `import-media`'s multi-category tagging keeps working.
- If a file fails (bad response, network error, etc.), it's left untouched
  and reported at the end — just re-run the script to retry it.

## Project structure

```
site/     the whole Next.js app — see site/README.md for setup,
          deployment, and architecture details
```

## Deploying

See [`site/README.md`](site/README.md) for connecting a Sanity project and
deploying to a custom domain.
