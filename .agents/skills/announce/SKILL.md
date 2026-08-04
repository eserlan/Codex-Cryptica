---
name: announce
description: >
  Drafts and publishes community announcements for Codex Cryptica across GitHub
  Discussions, Reddit (r/codexcryptica, r/rpg, r/worldbuilding, r/SvelteJS), and
  Discord. Handles image sourcing (attached screenshots, AI-generated visuals, or
  existing repo assets), uploads to Cloudflare R2 for a stable public URL, and
  tailors copy for each venue's culture and formatting expectations.

  Extends the `reddit-post` skill — all voice, grounding, and style rules defined
  there apply here. GitHub Discussions and Discord guidance is additive.

  Activate when the user mentions: writing an announcement, posting to GH
  Discussions, drafting a feature reveal, "make an announcement about X", or
  sharing a canvas/feature update with the community.
metadata:
  type: workflow
  extends: reddit-post
---

# Announcement Skill

Use this when preparing a community-facing announcement for Codex Cryptica —
a new feature reveal, a "what's new" update, a milestone post, or an in-app
canvas showcase. Covers GitHub Discussions as the primary venue, Reddit as a
secondary channel, and Discord for a short pulse notification.

This skill **extends** the `reddit-post` skill. All voice, grounding, source
rules, and style guidance defined there remain authoritative. Read the relevant
sections of that skill before drafting if you haven't already.

---

## Step 1 — Pre-flight Checklist

Before writing anything, confirm:

1. **Target venue(s).** GitHub Discussions? Reddit sub? Discord? All three? If
   unspecified, default to GH Discussions + a short Discord ping and ask if
   Reddit is wanted.
2. **Feature/topic.** What specifically is being announced? Get it to one clear
   sentence before drafting.
3. **Source material.** Changelog entry, spec file, commit log, or user
   description? Don't invent features. Read changelogs and specs if the user
   doesn't provide them.
4. **Image.** One of:
   - User-attached screenshot → use it directly (preferred)
   - Existing repo screenshot in `apps/web/static/` or `scripts/blog-screenshots/`
   - Generate with `generate_image` tool as a last resort — only if no real
     screenshot exists and the user explicitly accepts a generated visual
5. **Version.** What version does this land in? Check
   `apps/web/package.json` or `releases.json` if the user doesn't supply it.

If two or more items are missing and the user hasn't indicated to proceed
anyway, ask before drafting.

---

## Step 2 — Image Handling & CF R2 Upload

A real screenshot always beats generated art for announcement posts. Follow
this priority order:

### 2a — Source the image

1. **User-attached image** — use it as-is.
2. **Existing repo asset** — check `apps/web/static/blog/` and
   `scripts/blog-screenshots/` for existing screenshots.
3. **Generate with `generate_image`** — only if the user explicitly confirms no
   screenshot is available and one should be generated. Prompt should capture
   the feature's key visual: dark UI, the specific interface being announced,
   realistic-looking content (not placeholder text).

### 2b — Upload to Cloudflare R2

Once the image is sourced, upload it to the `codex-cryptica-statics` bucket so
it has a stable public URL for embedding in GH Discussions and Reddit.

```bash
# Copy the image to the static assets directory first
cp <source-path> apps/web/static/blog/assets/<slug>.png

# Upload via wrangler
bunx wrangler r2 object put codex-cryptica-statics/blog/assets/<slug>.png \
  --file apps/web/static/blog/assets/<slug>.png \
  --remote
```

The public URL will be:

```
https://assets.codexcryptica.com/blog/assets/<slug>.png
```

Use this URL in the GH Discussion body and Reddit post. Never link directly to
a local file or GitHub blob URL — those break outside the repo context.

### Naming convention

Use a descriptive, lowercase, hyphenated slug that identifies the feature and
date, e.g.:

- `canvas-announcement-2026-08.png`
- `guided-mode-reveal.png`
- `dungeon-builder-spatial-canvas.png`

---

## Step 3 — Pick an Output Mode

### Mode A — Full multi-venue package

Produce all three in one pass when the user wants broad coverage:

1. **GitHub Discussion post** (primary, full-length)
2. **Reddit post** (venue-adapted, see reddit-post skill for sub-specific rules)
3. **Discord pulse** (3–5 sentences max, link to the GH Discussion)

### Mode B — Single venue

Produce only the requested format. Don't pad with unrequested venues.

### Mode C — Draft only (no upload)

If the user says "draft first" or "show me before uploading", produce the copy
without running the wrangler command. Note the upload step is pending.

---

## Step 4 — GitHub Discussions Format

GitHub Discussions is the primary announcement venue for Codex Cryptica. It
supports full GitHub-flavored Markdown including images, collapsible sections,
tables, and code blocks.

### Structure

```
# [Feature Name] — [One-line hook]

![Alt text](https://assets.codexcryptica.com/blog/assets/<slug>.png)

[2–3 sentence opening. What changed, why it matters. No fluff.]

## What's new

**[Feature 1].** [One sentence what it does. One sentence why it matters.]

**[Feature 2].** ...

**[Feature 3].** ...

## Under the hood (optional)

[For technically interesting changes: architecture decision, pattern used,
tradeoff made. Skip if nothing interesting to say.]

---

*[Closing question — genuine, invites concrete responses. Not a CTA.]*
```

### GH Discussion tone rules

- Same voice as Reddit (first person, Espen's direct casual style, no hype)
- Markdown formatting is fine — use bold lead-ins for feature bullets, H2
  for sections. Don't over-structure a short post.
- The image goes right at the top, before any body text — GitHub renders it
  cleanly and it anchors the post visually.
- Closing question should invite a concrete answer (feature request, workflow
  question, "does this solve your problem?") — not "what do you think?"
- Don't add a "links" section unless there's something genuinely worth linking
  (release notes, blog post, live demo). Keep it clean.
- Category: **Announcements** (or whatever the repo's GH Discussions equivalent
  is — check with `gh api repos/eserlan/Codex-Cryptica/discussions/categories`
  if needed).

### Posting via GitHub API

If the user confirms the draft and wants it posted:

```bash
# List discussion categories first
gh api repos/eserlan/Codex-Cryptica/discussions/categories

# Post the discussion (replace CATEGORY_ID)
gh api repos/eserlan/Codex-Cryptica/discussions \
  --method POST \
  --field title="[title]" \
  --field body="[full markdown body]" \
  --field category_id="[CATEGORY_ID]"
```

---

## Step 5 — Reddit Adaptation

Apply all guidance from the `reddit-post` skill. Key deltas for announcement
posts specifically:

- The GH Discussion URL can appear as the "one link" in the Reddit post body.
- Reddit doesn't render embedded images in text posts on all subs — describe
  what's in the screenshot in 1–2 sentences if it's central to the post.
- For r/codexcryptica: link the GH Discussion + embed image, full structure.
- For r/rpg / r/worldbuilding: lead with the problem the feature solves, not
  the feature itself. Link to GH Discussion in first comment, not the body.
- For r/SvelteJS: lead with the technical implementation detail, product is
  context. Code snippet if relevant.

---

## Step 6 — Discord Pulse

Short, warm, direct. 3–5 sentences. Link to the GH Discussion.

Format:

```
📌 **[Feature Name]**
[1–2 sentences on what's new and why it matters.]
[1 sentence on where to try it or read more.]
[GH Discussion link]
```

Use the `scripts/discord-notify.sh` script for actual delivery if needed, or
just output the copy for the user to paste.

---

## Voice & Style (inherited + reinforced)

All rules from `reddit-post` apply. Key ones to re-anchor for announcements:

- **Solo dev framing.** First person singular. "I shipped", "I added", "I
  rebuilt". Never "we".
- **No hype.** Lead with what changed. Banned: _game-changing, revolutionary,
  next-gen, seamlessly, supercharge, level up, unlock, harness_.
- **Concrete over abstract.** Name the actual feature, the actual interaction,
  the actual use case. Avoid "a better experience" as a description of anything.
- **Short paragraphs.** Vary length. No conclusion paragraph that restates the
  post.
- **One closing question.** Genuine, specific, answerable.

---

## Source Grounding (hard rule, same as reddit-post)

Do not invent features, version numbers, or implementation details.

Before drafting, read:

- `apps/web/src/lib/content/changelog/releases.json` — for version and
  shipped feature list
- Relevant spec files in `specs/` — for accurate feature description
- Recent git log — `git log --oneline origin/staging | grep -i <feature>`
- Any user-provided changelog, PR description, or commit message

If the user asks to announce a feature and provides no source, ask for the
changelog entry or PR link before drafting.

---

## Safety Checks Before Final Output

- [ ] Image uploaded to R2 and URL verified as `assets.codexcryptica.com/...`?
- [ ] All feature claims grounded in changelog, spec, or commit log?
- [ ] First-person singular throughout? No "we"?
- [ ] No banned phrases?
- [ ] GH Discussion: image at top, H2 sections, closing question?
- [ ] Reddit: venue-adapted per reddit-post skill rules?
- [ ] Discord: ≤5 sentences, link included?
- [ ] Does this sound like a real person posting, not an announcement bot?

---

## Activation Triggers

Use this skill when the prompt contains:

- "make an announcement about X"
- "post to GH Discussions"
- "write a GitHub Discussion for..."
- "announce the canvas / [feature]"
- "draft an announcement"
- "post this to the community"
- "write a release announcement"
- "let people know about X"
- Any request to notify the community about a shipped feature, improvement,
  or update across multiple venues
