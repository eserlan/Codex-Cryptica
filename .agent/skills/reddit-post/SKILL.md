---
name: reddit-post
description: Drafts and polishes authentic Reddit posts about Codex Cryptica — devlogs, release notes, feature updates, technical write-ups, and lessons-learned posts. Subreddit-aware (r/codexcryptica, r/rpg, r/worldbuilding, r/SvelteJS), anti-hype, grounded in actual repo material, and rule-aware about self-promotion. Use this skill whenever the user mentions writing, drafting, polishing, or "making less marketing-ish" any Reddit post, comment, devlog, release announcement, or community update related to Codex Cryptica — even when they don't explicitly name a target subreddit.
---

# Reddit Post Generation & Polishing Skill

Use this skill when preparing, writing, formatting, or refining Reddit posts about Codex Cryptica — release notes, devlogs, architecture write-ups, design experiments, or lessons learned.

The goal is not marketing copy. The goal is posts that feel like they were written by a real builder sharing real progress, that respect each subreddit's culture and self-promotion rules, and that don't fabricate features or implementation details.

---

## Step 1 — Pre-flight Checklist (run before drafting)

Before writing anything, confirm these. If two or more are missing or unclear, **ask the user** instead of guessing.

1. **Target subreddit.** Which sub is this for? Each has different rules and tolerance for self-promo. If unspecified, ask.
2. **Source material.** Is there a changelog, release note, spec file, screenshot, code excerpt, or repo reference grounding the post? Without this, the post will either be vague or invented. Ask for context.
3. **The one concrete thing.** What is the single most useful change, lesson, or question driving the post? If there isn't one, the post probably shouldn't exist (see "When NOT to Post" below).
4. **Account standing.** For r/rpg and r/worldbuilding especially: has the user recently participated in the sub in non-promotional ways? If not, flag that the post may be removed regardless of how well-written it is, and suggest the sub's weekly self-promotion thread or showcase thread as an alternative.
5. **Affiliation disclosure.** Confirm the post will disclose that Codex Cryptica is the user's own project. This is mandatory for every sub except r/codexcryptica.

---

## Step 2 — Pick an Output Mode

Adapt output to what the user actually asked for. Don't return the full four-section package for a small polish request.

### Mode A — Full draft (new post from scratch)

Use when the user says "draft a post about X," "write a release post," "turn this changelog into a Reddit post," etc.

Output:

1. **Title options** — 3 to 5 subreddit-appropriate titles, mixing "I built/changed/learned" framing with at least one problem-first framing.
2. **Recommended post** — the full body.
3. **Optional first comment** — links, changelog, screenshots, repo references that would clutter the main post.
4. **Notes** — subreddit-specific risks, disclosure placement, or rule-of-thumb timing.

### Mode B — Polish (user provided existing draft)

Use when the user pastes their own draft and asks to clean it up, tighten it, or make it less marketing-ish.

Output:

1. **Polished version** — full revised post.
2. **Diff summary** — 3 to 6 bullets describing what changed and why (cut hype phrase X, restructured opener, moved link to first comment, added disclosure, etc.).

No title options unless the user's original title also needs work.

### Mode C — Quick (single targeted edit)

Use when the user asks for a single edit like "rewrite this paragraph" or "give me a better closing question."

Output: just the requested fragment. No structure, no notes.

---

## Step 3 — Source Grounding (hard rule)

**Do not invent features, implementation details, version numbers, or claims that aren't present in the provided context.**

When repo files, changelogs, release notes, spec files, or code excerpts are available, treat them as the source of truth. If the user asks for a post about a feature and hasn't given context for it, ask for the changelog or commit reference before drafting.

Specifically:

- Don't claim a feature exists in a release unless the changelog or release notes confirm it.
- Don't describe an implementation approach (e.g., "uses OPFS for persistence") unless that approach is documented in the repo or provided by the user.
- Don't invent version numbers. If the user doesn't supply one, use a placeholder like `vX.Y.Z` and flag it in the notes.
- Don't invent screenshots, demos, or links. If the post references them, the user must supply or confirm them.

Verifiable feature surface area for Codex Cryptica (use these as safe examples when illustrating; check the repo for current state before specific claims):

- SvelteKit + Tailwind frontend
- Local-first via OPFS / File System Access API
- Cytoscape.js graph engine for the node view
- Tiptap rich text editor
- Bidirectional text-to-graph sync
- Lore Oracle (Google Gemini, BYOK or shared Lite tier)
- Offline capability

If the user references a feature outside this list (VTT, maps, timelines, dice roller, etc.), ask whether it's actually shipped before writing about it.

---

## Core Style Rules

- **Lead with value.** Open with what changed and why it matters before explaining how it works.
- **Builder voice, not brand voice.** Prefer "I built," "I changed," "I learned," "this now lets you…" over launch language.
- **Disclosure upfront.** Mention that Codex Cryptica is the author's own project in the opening or first comment of any post outside r/codexcryptica. Burying affiliation reads as astroturfing.
- **Scannable but not over-formatted.** Short paragraphs, light bullets, occasional bold lead-ins. Avoid horizontal rules unless the post is genuinely long. No emoji unless the user or sub specifically supports it.
- **Concrete over abstract.** A specific example or screenshot beats a paragraph of adjectives every time.
- **One question at the end.** A genuine question that invites discussion. Not a CTA, not "what do you think?" — something the reader could actually answer.
- **Links: one or two in the post body, max.** Everything else goes in the first comment.

### Phrases to avoid

Banned by default: _game-changing, revolutionary, next-gen, ultimate, seamlessly, unlocks, harness, leverage, empower, supercharge, level up, in the realm of, dive into, journey, robust, cutting-edge, transform._

### Cadence to avoid

LLM-generated posts often share a recognizable rhythm: paragraphs of similar length, every section opening with a transition word, a closing paragraph that restates the post. Break the cadence — vary paragraph lengths, let some sentences run short, and don't write a conclusion that summarizes what was just said.

---

## Title Guidance

Avoid default launch-style titles:

- ❌ `[Update] v0.21.0 is LIVE!`
- ❌ `Codex Cryptica — The Ultimate Worldbuilding Tool`

Prefer titles that sound native to Reddit. Mix patterns rather than defaulting to one:

**"I built / I changed / I learned" (familiar but solid):**

- `I rebuilt the campaign graph UI around focus and context`
- `What I learned building a local-first worldbuilding tool in Svelte`

**Problem-first (often stronger):**

- `My graph view kept feeling cluttered until I removed the auto-layout`
- `OPFS persistence broke every time I refactored — here's what finally worked`

**Devlog framing (good for r/codexcryptica and r/SvelteJS):**

- `Devlog: cleaner player view, Oracle sidebar, and graph polish`
- `A small devlog on making lore notes feel runnable at the table`

---

## Post Structure Template

### Opening (2 to 4 sentences)

Direct hook. What changed, who it's for, why it matters. Disclosure of affiliation belongs here for posts outside r/codexcryptica.

### What changed

Bulleted or short-section form. For each change, cover:

- What it does (one line)
- Why it matters (one line)
- An interesting implementation detail (only if relevant to the sub)

### Under the hood (optional)

For r/SvelteJS, expand this section — it's the whole point. For r/rpg and r/worldbuilding, keep it to one or two lines or move it to the first comment.

Relevant topics: Svelte 5 runes (`$state`, `$derived`, `$effect`), Svelte stores, local-first data flow, OPFS, IndexedDB / Dexie, graph state management, Cytoscape integration, Tiptap extensions, performance work, privacy-first architecture, optional user-controlled AI.

### Closing

End with one real question. Examples that work:

- For tool builders: `How do you balance tactical features with keeping a GM tool lightweight?`
- For worldbuilders: `Would you rather have deeper graph exploration, better maps, or stronger timeline tools next?`
- For Svelte folks: `How are others handling local-first persistence with OPFS vs IndexedDB?`
- For GMs: `Does an integrated map layer actually solve session friction, or do you prefer keeping notes and maps separate?`

---

## Subreddit-Specific Guidance

### r/codexcryptica (project's own sub)

Direct release/devlog framing is welcome. Mention version numbers, screenshots, GitHub releases, changelogs, roadmap items freely. Disclosure not required (it's the project sub).

If the sub is small or being seeded, lean more demo-heavy and roadmap-focused: posts should give visitors a reason to subscribe, not just announce.

Structure: what shipped → why it matters → screenshots/links → what's next → question.

### r/rpg

**Strict self-promotion rules.** The 9:1 rule applies (roughly nine non-promotional contributions for every promotional one), and mods remove product posts from accounts without standing. Before drafting, confirm:

- The account has recent, real participation in r/rpg.
- The post leads with a GM problem, not a product.
- If account standing is thin, route the post to the sub's weekly self-promotion thread instead of a standalone post.

Focus on: prep friction, session flow, lore recall during play, tactical clarity, reducing tool-switching, running lore-heavy campaigns. One link maximum, near the end. Disclosure mandatory in the opening.

### r/worldbuilding

Even more cautious than r/rpg about product posts. Lead with **process, creative workflow, or lessons learned** — never with the product. The product can appear as the context for the lesson, not the subject of the post.

Topics that land: organizing lore at scale, connecting places/factions/events/characters, graph-based thinking for worldbuilding, structural patterns for campaign-ready worlds, creative workflow tradeoffs.

Avoid entirely: "try my tool," "check out my app," feature lists, multiple links, product-first framing.

Disclosure mandatory and ideally in the first two sentences. If the user has no participation history in r/worldbuilding, suggest posting to r/codexcryptica or r/rpg instead, or to the worldbuilding sub's monthly showcase if one exists.

### r/SvelteJS

Lead with the technical problem and the implementation. The product is context, not subject.

Focus on: architecture decisions, Svelte-specific patterns (especially Svelte 5 runes if applicable — check which version `apps/web` is on before writing), state management approaches, browser storage tradeoffs (OPFS vs IndexedDB vs localStorage), Cytoscape integration patterns, Tiptap extension authoring, performance work, real tradeoffs and what didn't work.

Code snippets welcome. Mention Codex Cryptica as project context. Disclosure mandatory but can be brief ("for context, I'm building [Codex Cryptica], a local-first RPG campaign manager — here's the Svelte-specific problem I hit…").

---

## When NOT to Post

Skip the Reddit post entirely if any of these apply:

- **Patch release with no user-visible changes.** A bugfix-only `v0.21.1` doesn't need a thread. Save it for the next meaningful release.
- **No screenshot, demo, or code snippet.** Visual or technical evidence carries more than prose for these communities.
- **No concrete question for the community.** If the post doesn't invite discussion, it's an announcement, and announcements without standing get downvoted.
- **No account standing in the target sub.** For r/rpg and r/worldbuilding especially, posting cold from a thin account will likely be removed regardless of content quality.
- **The "change" is really a marketing milestone.** Reaching 100 stars, hitting a domain, getting a logo — these are not posts these subs want.

In any of these cases, suggest the alternative: post to r/codexcryptica, batch the update into a later combined release post, or post a comment in an existing relevant thread instead.

---

## Safety Checks Before Final Output

Before returning a draft, verify:

- Does this sound like a real person posting, not an announcement?
- Is the value clear in the first 2 to 3 sentences?
- Is disclosure of affiliation present (or explicitly noted as not needed for r/codexcryptica)?
- Are links used sparingly (≤2 in body)?
- Is the closing a genuine question, not a CTA?
- Would the post still be useful if the reader never clicked a link?
- Are all technical claims grounded in provided changelogs, specs, code, or repo material?
- Has the post been adapted to the target subreddit, not just dropped into a generic template?
- Have any banned phrases or LLM-cadence patterns slipped in?

If any answer is "no" or "unsure," revise before returning.

---

## Activation Triggers

Use this skill when the prompt contains text like:

- "Draft a release post for v..."
- "Turn this changelog into a Reddit announcement"
- "Polish this for r/codexcryptica"
- "Write a devlog for r/SvelteJS"
- "Make this less marketing-ish" / "make this sound less like an ad"
- "Write an update post about [feature]"
- "Create a Reddit post from these release notes"
- "Make this suitable for r/rpg" / "for r/worldbuilding"
- "Turn these feature notes into a Reddit post"
- "Write a post for the Codex Cryptica subreddit"
- Any mention of drafting, polishing, or rewriting Reddit-bound content related to Codex Cryptica
