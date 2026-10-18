---
name: add-blog-post
description: Write and land a Codex Cryptica blog post (apps/web/src/lib/content/blog/*.md) through the blog release pipeline. Covers the `blog` branch route (not staging), frontmatter, house style, R2-only images with commented placeholders, the pre-merge release check, quality gates, and post-merge verification.
---

# Add a Blog Post

Blog posts are dated, narrative guides (feature walkthroughs, announcements, essays). Evergreen questions people search for belong in `/answers` instead (use `add-answer`).

## The route (read this first)

Blog posts do **not** ship through `staging`. The `blog` branch is a permanent branch off `main` that carries only blog content. Merging a PR into `blog` runs `.github/workflows/deploy-blog-content.yml`, which publishes to the `blog-content` branch and then deploys production from `main` with the posts overlaid. There is no release step and no promotion. Full details: [docs/BLOG_DEPLOYMENT.md](../../../docs/BLOG_DEPLOYMENT.md).

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

`id` equals `slug`. `updatedAt` is only for later edits.

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

## After merge

- Watch the **Deploy Blog Content** run (`gh run list --workflow "Deploy Blog Content"`). Both `publish-cdn` and `deploy-production` must succeed.
- Open `https://codexcryptica.com/blog/<slug>` and confirm it renders, with no broken images.
- Optional promotion: `bsky-note` for a short post, `cc-announcer` for Reddit or a devlog.
- Back-merge `blog` into `main` and `staging` when convenient, so the branches stay in sync.

## Do not

- Target `staging` or `main` with a blog PR.
- Commit image files or link R2 URLs that do not exist.
- Add a changelog entry or touch app code in the same PR.
- Merge or publish without the user's approval.
