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
2. Drop photos into the matching folder(s). **If a photo belongs to more than
   one category, copy the same file into each relevant folder** — the script
   detects it's the same photo and tags it with all of them instead of
   creating duplicates.
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

## Project structure

```
site/     the whole Next.js app — see site/README.md for setup,
          deployment, and architecture details
```

## Deploying

See [`site/README.md`](site/README.md) for connecting a Sanity project and
deploying to a custom domain.
