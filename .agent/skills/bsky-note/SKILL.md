---
name: bsky-note
description: Works through the Codex Cryptica Bluesky posting queue (GitHub issue #2086) — turns the next queued feature/use-case into a short, image-backed, "I needed X so I built Y" post in Espen's authentic solo-dev voice, then posts it (with explicit confirmation) or queues it for later. Feature-focused, not a devlog. Use whenever the user says something like "note that for Bluesky", "post that", "bsky it", "what should our next post be", "queue that for social", or points at a feature worth showcasing.
---

# Bluesky Micro-Post Skill

This is the lightweight, ad-hoc sibling to `cc-announcer`. Where `cc-announcer` drafts long-form Reddit release posts from grounded source material, this skill turns a real product feature or use case into one short, image-backed post — usually within a minute of the moment that prompted it.

**This account posts about features and use cases, not process.** No "fixed a bug today," no "here's what I worked on," no dev-diary narration, no generic company announcements. Every post shows or explains something Codex Cryptica actually does.

## When to use this vs. cc-announcer

- **This skill**: one short post (well under 300 characters) plus one image, showcasing a real feature or use case, drafted and confirmed in under a minute.
- **cc-announcer**: long-form Reddit posts (devlogs, release notes, architecture write-ups), sourced from a changelog/spec/screenshot, with title options and subreddit-specific rules.

If the user asks for something longer, more structured, Reddit-specific, or explicitly about the development process itself, use `cc-announcer` instead.

## Step 1 — Check the posting queue first

The topic backlog and the exact message-format/posting rules live in **GitHub issue #2086** ("Social: Bluesky posting queue") on `eserlan/Codex-Cryptica` — read it fresh with `gh issue view 2086` if the rules themselves are in question, since it gets edited.

The actual working queue — what's posted, what's drafted, and what's next in what order — lives in **`.social/bluesky-posts.md`**, committed to the repo (not gitignored), so it stays in sync across every local checkout via `git pull`. Its "Backlog" section resequences #2086's topics to satisfy #2086's own cadence-rotation rule (numeric order clusters too many same-type posts in a row); its "Posted" and "Drafted" sections are the actual history. Treat this file's backlog order as authoritative for "what's next," not #2086's raw numbering.

Default to the next item at the top of the Backlog section, unless the user names a specific topic instead. After publishing, both: (1) leave a short comment on #2086 (`gh issue comment 2086 --body "Posted item N (<name>): <post URL>"`, using the item's original #2086 number), and (2) move its entry from "Backlog" to "Posted" in `.social/bluesky-posts.md` with the full text/image/alt/URL. The GitHub comment gives visibility outside this tool; the local file is the fuller structured record this skill actually reads back.

If the user asks for something not on the queue but still a real feature, that's fine too — just don't invent a capability the product doesn't have. Check `apps/web/src/lib/config/help-content.ts` or the `/features` marketing page if unsure what's real and how it's described elsewhere.

## Step 2 — Every post needs an image (hard rule)

The posting script refuses to post without `--image` and `--alt` — there is no text-only path. Source the image, in order of preference:

1. An existing marketing/product asset that shows the feature being described (`apps/web/static/`, or an R2/CDN URL like `assets.codexcryptica.com/...` — the script accepts either a local path or an https URL directly).
2. A screenshot the user shared earlier in this session (an image-cache path), if it's actually relevant to the feature.
3. Ask the user for one — never substitute an unrelated image just to satisfy the requirement.

**Visual guide (per #2086):**

- Crop aggressively around the thing being demonstrated — the featured capability should be immediately legible on a phone screen.
- Avoid large empty areas that shrink the actual UI in-feed.
- Include enough surrounding UI for context, but no more than needed.
- If the source image is over Bluesky's 1MB limit, compress it first (e.g. `magick <in> -resize 1600x1600\> -quality 85 <out>.jpg`) — don't skip the image because of size.

Video and animated GIFs aren't supported by the posting script yet (Bluesky's video pipeline is a separate, heavier integration) — stick to png/jpg/webp.

Write alt text that accurately describes what's in the image, not the post's marketing copy restated.

## Step 3 — Draft it using the required message shape

Every post follows this four-part arc (per #2086) — don't skip parts or reorder them:

1. **Need / problem** — open with the campaign or worldbuilding itch, not the feature name.
2. **So I built...** — introduce the CC feature as the direct response to that need.
3. **Outcome / use** — what it actually lets a GM or worldbuilder do.
4. **Direct link** — the specific CC feature/page (not just `codexcryptica.com`), e.g. `codexcryptica.com/generators/star-system`. This is a hard rule: every post needs a direct link. The post must still be interesting without clicking it — the link is a quiet next step, not the whole point.

Example shape (from #2086):

> I needed a way to see how everything in a campaign connects — characters, factions, locations, all of it.
>
> So I built the knowledge graph in Codex Cryptica. Click any entity and you can follow its connections through the setting.
>
> codexcryptica.com/[relevant page]
>
> #TTRPG #Worldbuilding

Keep it to 1, at most 2, short draft options — this is meant to be fast, not a Reddit-style five-title menu.

**Voice rules (condensed from `cc-announcer`'s Core Style Rules — read that skill's full rules if unsure):**

- Write as one GM/worldbuilder talking to another, first-person, conversational — not marketing copy. ("I needed a way to..." not "We're thrilled to unveil...")
- No emojis, no em dashes. Plain punctuation only.
- No buzzwords or hype (game-changing, seamlessly, level up, robust, cutting-edge, etc.) and no release-note phrasing.
- Concrete over abstract — a specific example beats a vibe.
- One clear idea/use case per post.
- **Hashtags**: default `#TTRPG #Worldbuilding` (this exact casing), plus one contextual tag where useful (e.g. `#SciFi`, `#RPGDesign`, `#Fantasy`, `#VTT` — see the per-item suggested tags in issue #2086). Roughly 1-3 total. The posting script auto-detects `#word` tokens and turns them into real clickable tags — don't turn ordinary keywords into hashtag soup in the body text.
- Target 200-250 characters for the text itself (the link sits outside that budget in practice, but the total post — text + link — still must fit Bluesky's 300-grapheme hard limit, which the posting script enforces).

## Step 4 — Confirm before publishing (hard rule)

Posting is a public, irreversible action taken on the user's behalf — never invoke the posting script without the user explicitly approving the exact text and image first. Show the draft (text + link + tags, and what image you intend to use), then wait for a clear go-ahead ("post it", "yes", "send") before running anything.

If the user instead says "queue it" / "save it for later" / "not now", add it to `.social/bluesky-posts.md` under "Drafted (not yet posted)", matching the format of existing entries (text, image, alt, and queue item reference if applicable). Do not post drafted entries automatically — this is explicitly the "not right now" path. When one is later approved and published, move it from "Drafted" to "Posted" and fill in the date/URL.

## Step 5 — Publish

Once approved, run:

```bash
bun scripts/post-to-bluesky.mjs --image <path-or-url> --alt "<description>" "<approved text with link and tags>"
```

Consider a `--dry-run` pass first to confirm character count, tag count, and image validity before the real post.

Report the resulting post URL back to the user, then log it per Step 1 (comment on #2086 if this came from the queue, and add/move the entry in `.social/bluesky-posts.md`). If the script errors (missing credentials, oversized image, unsupported file type, network), surface the exact error — don't retry silently, swap the image, or reword the post without asking.

## Cadence (per #2086)

- Aim for roughly one post per day when there's a worthwhile feature/use case to show. Do not post filler simply to meet the cadence.
- Rotate between different kinds of CC value (generation, organization, visualization, play) so consecutive posts don't feel like repetitions of the same pitch.
- When the queue runs low, add another concrete CC feature/use case to issue #2086 rather than switching to generic promotional or development content.
