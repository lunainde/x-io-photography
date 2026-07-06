# X-iO — Photography Portfolio

Next.js implementation of the X-iO design (see `../chats/` and `../project/` at
the repo root for the original Claude Design handoff this was built from).

## Stack

- **Next.js 16** (App Router) — one real route per filter (`/`, `/architecture`,
  `/black-white`, `/color`, `/food`, `/places`, `/berlin`), Anton + Source Code
  Pro via `next/font`.
- **Framer Motion** — fade transition between routes.
- **Sanity** — headless CMS for images/videos, with an embedded Studio at
  `/studio`. Until it's configured, every page falls back to the original
  striped placeholder tiles instead of failing.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Setting up content (Sanity)

The site works out of the box with placeholder tiles. To manage real photos
and videos:

1. Create a free project at [sanity.io](https://www.sanity.io/manage) (or run
   `npx sanity@latest init` from this directory and choose "create new
   project").
2. Note the **Project ID** and **dataset name** (usually `production`) it
   gives you.
3. Create `.env.local` in this directory:

   ```bash
   NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
   NEXT_PUBLIC_SANITY_DATASET=production
   ```

4. Restart `npm run dev`, then open http://localhost:3000/studio and sign in
   with the same account. You'll see one document type, **Media item**, with
   fields for category (home / architecture / black & white / color / food /
   places / berlin), image or video upload, alt text, and a sort order.
5. Add a few items to the **home** category — that's the curated set that
   drives the animated hero. Add items to the other categories to fill out
   each gallery page.

Deploy the Studio itself (so editors don't need a local dev server) with:

```bash
npx sanity deploy
```

or just use the `/studio` route on your deployed Vercel site — it works the
same way once the env vars above are set there too.

### Adding a new page/category later

Add the slug to `src/lib/categories.ts` (label, route, hover color), add the
option to the `category` field in `src/sanity/schemaTypes/mediaItem.ts`, and
create `src/app/<slug>/page.tsx` following the existing category pages as a
template.

## Deploying

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Import it on [vercel.com/new](https://vercel.com/new), with **Root
   Directory** set to `site/` (since this app lives in a subdirectory).
3. Add the two `NEXT_PUBLIC_SANITY_*` environment variables from above in the
   Vercel project settings.
4. Deploy, then attach your domain under Project → Settings → Domains.
