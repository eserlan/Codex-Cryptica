---
name: add-blog-post
description: Write and land a Codex Cryptica blog post (apps/web/src/lib/content/blog/*.md) through the blog release pipeline. Covers the `blog` branch route (not staging), frontmatter, house style, R2-only images with commented placeholders, the pre-merge release check, quality gates, and post-merge verification.
---

# Add a Blog Post

Blog posts are dated, narrative guides (feature walkthroughs, announcements, essays). Evergreen questions people search for belong in `/answers` instead (use `add-answer`).

## The route (read this first)

Blog posts do **not** ship through `staging`. The `blog` branch is a permanent branch off `main` that carries only blog content. Merging a PR into `blog` runs `.github/workflows/deploy-blog-content.yml`, which publishes to the `blog-content` branch and then deploys production from `main` with the posts overlaid. There is no staging release and no promotion. Full details: [docs/BLOG_DEPLOYMENT.md](../../../docs/BLOG_DEPLOYMENT.md).

1. Branch from `origin/blog`, never `staging` (`git worktree add -b docs/<slug>-blog <dir> origin/blog`).
2. Add `apps/web/src/lib/content/blog/<slug>.md`. Touch nothing else.
3. Open a normal ready-for-review PR with **base `blog`**. Confirm `changedFiles` is the post only (a branch cut from `staging` drags unreleased commits into the diff).
4. Merging goes live. Do not merge without the user's say-so.

## Before writing

- **Is the feature on `main`?** The deploy is built from `main`. If the feature only exists on `staging`, the post would describe something visitors cannot use. Check with `git merge-base --is-ancestor <feature-commit> origin/main`, or wait for the next promotion.
- **Does the topic already have an owner?** Check `apps/web/src/lib/content/discovery/` (`findIntentOwner`) and existing posts in `apps/web/src/lib/content/blog/`. Extend or link rather than duplicate (Constitution XIII). Link relevant `/answers/<slug>` and `/for/<slug>` pages instead of restating them.
- **Source facts from the repo**, not memory: the feature's help file in `apps/web/src/lib/content/help/`, its `specs/<id>/spec.md`, and the code. Do not describe unshipped behaviour.

## Frontmatter

Match an existing post such as `custom-stat-sheet-templates.md`:

```yaml
---
id: <slug>
slug: <slug>
title: "..."
description: "One sentence, plain language."
keywords: ["...", "..."]
publishedAt: 2026-10-18T10:00:00Z
image: "https://assets.codexcryptica.com/images/blog/<slug>/<slug>-hero.png"
imageAlt: "Describes what the image shows"
---
```

`id` equals `slug`. `updatedAt` is only for later edits. `id`, `slug`, `title`, `description` and `publishedAt` are required: `scripts/publish-blog-content.mjs` throws on a post missing any of them, and the CDN publish fails. Commented-out YAML lines (the image placeholders) are fine.

## Style rules

Same house rules as answer pages (see `add-answer`):

- British English (`organise`, `centre`, `behaviour`, `travelling`).
- No em dashes or en dashes, no emojis, no AI buzzwords (`seamless`, `robust`, `unlock`, `leverage`, `delve` and the rest of that list). Use commas, colons, full stops and ordinary hyphens.
- Plain, concrete language for Game Masters. Say what the feature does and how to use it, in the order a GM meets it.
- Say what is private. If the feature is GM-only or sends anything to an AI service, state it plainly.
- Link internal pages with relative paths (`/answers/...`, `/generators`).

## Images

- **Never commit images.** They live only in Cloudflare R2 (`codex-cryptica-statics`, served from `https://assets.codexcryptica.com/`) under `images/blog/<slug>/`. Upload steps are in [docs/ART_DIRECTION_EDITORIAL_IMAGES.md](../../../docs/ART_DIRECTION_EDITORIAL_IMAGES.md); delete local copies afterwards.
- Product screenshots are the norm for feature posts. Write specific alt text that says what is on screen.
- **No screenshots yet?** Do not link files that are not in R2 (visitors would see broken images). Add each image as a commented-out Markdown image with its alt text, and comment the frontmatter `image` and `imageAlt` the same way:

  ```md
  <!-- SCREENSHOT TODO: what to capture
       Upload to R2 as images/blog/<slug>/<name>.png, then uncomment.
  ![Alt text](https://assets.codexcryptica.com/images/blog/<slug>/<name>.png) -->
  ```

  Adding images later is then upload, uncomment, push.

## Quality gates

Run in the worktree (symlink `node_modules` from the main checkout if needed, and remove the links before committing):

- `bun scripts/lint-changed.mjs` (Prettier)
- `bunx vitest run src/lib/content/blog-content.test.ts src/lib/content/loader.test.ts` from `apps/web`
- `bunx fallow audit --format json --quiet --explain --gate-marker agent` (verdict must be `pass`)
- `codex-review` on the file: check facts against the help file and spec, frontmatter, style rules and links

`test:changed` reports no affected tests for a markdown-only change, so run the blog tests directly.

## Releasing (what merging does)

Merging into `blog` triggers **Deploy Blog Content**, which runs two independent jobs:

- **`publish-cdn`**: runs `scripts/publish-blog-content.mjs`, which wipes and regenerates `blog/` (every post plus `index.json`) and force-pushes it to the `blog-content` branch for the in-app viewer. Because it regenerates from source, deleting a post file removes it from the CDN too.
- **`deploy-production`**: checks out `main`, overlays `apps/web/src/lib/content/blog/` (and `apps/web/static/images/`, unused because images live in R2) from `origin/blog`, runs `bun run build`, and deploys `apps/web/build` to Cloudflare Pages on branch `main`. Posts are prerendered to static HTML from the overlay, and `/sitemap.xml` is generated at build from the blog directory, so a new post needs no manual sitemap step.

Only blog files are overlaid. Anything else the post links to (answers, `/for` pages, generators, app features) must already be on `main`, or the live link or claim is wrong.

### Verify

1. `gh run list --repo eserlan/Codex-Cryptica --workflow "Deploy Blog Content" --limit 3`, then `gh run watch <id>`. Both jobs must be green. They run in parallel and failing one does not stop the other.
2. Open `https://codexcryptica.com/blog/<slug>`: renders, no broken images, internal links resolve. Check `https://codexcryptica.com/blog` lists it.
3. If the runs are green but the post is missing, it usually means the PR merged into the wrong base, or the file is not in `apps/web/src/lib/content/blog/`.

### Previewing

There is no preview of an unmerged PR. The manual run (`gh workflow run "Deploy Blog Content" -f target_branch=blog-preview`, default `blog-preview`) builds `main` with whatever is currently on `origin/blog` and deploys it to a Cloudflare preview branch instead of production. It skips `publish-cdn`. Use it to test the pipeline or a change to the workflow itself, not a draft post. Check a draft locally instead: run the dev server and open `/blog/<slug>` (the dev server needs the post in the working tree).

### Tell search engines (manual)

IndexNow is not triggered by the blog deploy. After the post is live, run **Notify Search Indexes (IndexNow)** with the post URL:

```sh
gh workflow run "Notify Search Indexes (IndexNow)" --repo eserlan/Codex-Cryptica \
  -f cluster="" -f urls="https://codexcryptica.com/blog/<slug>" -f dry_run=true
```

Set `cluster` empty: its default is `heist`, which would also submit the heist routes. Do a `dry_run=true` run first, confirm the summary lists only your URL, then repeat with `dry_run=false` (needs the user's go-ahead, since it sends the URL to external services).

### Roll back

Revert the merge with a PR whose base is `blog` (or delete the post file in a new PR). Merging it reruns the same workflow, and the regenerated `blog-content` and rebuilt site drop the post. There is no other undo, and a bad deploy stays live until the revert finishes, so keep the first merge small.

### Afterwards

- Optional promotion: `bsky-note` for a short post, `cc-announcer` for Reddit or a devlog. Both need the live URL.
- Back-merge `blog` into `main` and `staging` when convenient, per `docs/BLOG_DEPLOYMENT.md`, so the branches stay in sync.

## Do not

- Target `staging` or `main` with a blog PR.
- Commit image files or link R2 URLs that do not exist.
- Add a changelog entry or touch app code in the same PR.
- Merge, run IndexNow for real, or otherwise publish without the user's approval.
