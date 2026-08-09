# Bluesky Post Log

Tracks concrete posts for `@codexcryptica.bsky.social` — what's been published and what's drafted but not yet sent.

The topic backlog, message-format template, and posting rules live in GitHub issue [#2086](https://github.com/eserlan/Codex-Cryptica/issues/2086) — this file is the actual history, not a duplicate of that plan. Cross-reference queue item numbers where relevant.

## Posted

### 2026-08-08 — World Generator (queue #3)

- **Text:** I wanted a world I could start running tonight, not a setting summary I still had to build out.

  So I built the World Generator in Codex Cryptica. One pass: factions in conflict, named locations, an unsolved mystery, three hooks.

  codexcryptica.com/generators/world

  #TTRPG #Worldbuilding

- **Image:** cropped from `https://assets.codexcryptica.com/announcements/world-generator-desktop-v1.jpg` (from GitHub discussion #2027) with `magick world-gen.jpg -crop 930x626+318+125 +repage -quality 88 world-gen-tight.jpg` — cuts the top nav band and the empty left/right margins so the generator panel and result fill the frame on a phone (930x626, ~159KB)
- **Alt:** The Codex Cryptica Sci-Fi World Generator: an input panel on the left set to Hard Sci-Fi, Scientific Expedition, and Resource Access and Rationing, with the generated world Aurelia-7 beside it showing its summary, trait tags, Core Concept text, and a sidebar with History and Current Conflicts
- **URL:** https://bsky.app/profile/codexcryptica.bsky.social/post/3mslb3bbrxj2j
- **Note:** posted out of backlog order. Backlog item 1 (Related Entity Generation, orig #2) was skipped for now because no screenshot of it exists anywhere in the repo or in any announcement discussion — capturing one needs a dev server, a seeded vault, and a live AI generation call. Item 1 stays at the top of the backlog until an asset exists. Two consequences Espen accepted: this is generation twice in a row (cadence rotation), and the world shown is Aurelia-7, the same name as the previous day's star-system post.

### 2026-08-08 — Star System Generator (queue #1)

- **Text:** I wanted a star system that gives players a reason to go somewhere, not just orbital data.

  So I built the Star System Generator in Codex Cryptica. Every body gets a role: a resource, a station, a conflict, a hook.

  codexcryptica.com/generators/star-system

  #TTRPG #Worldbuilding #SciFi

- **Images:**
  1. `https://assets.codexcryptica.com/announcements/star-system-diagram-aurelia-7.png` — the side-view orbital diagram alone
  2. `https://assets.codexcryptica.com/announcements/star-system-aurelia-7.png` — the full generator result page (diagram + lore + adventure hooks sidebar)
- **Alt (1):** A side-view orbital diagram of the Aurelia-7 star system, showing planets and their AU distances from the star along a horizontal line, color-coded by body type, with moons and stations nested beneath their parent planets
- **Alt (2):** The Star System Generator's full result page for Aurelia-7: the orbital diagram at top, generated lore describing the system below, and a sidebar listing a system-wide conflict and adventure hooks
- **URL:** https://bsky.app/profile/codexcryptica.bsky.social/post/3msjoh2e6sn2i
- **Note:** both images sourced from GitHub discussion #2057 (the original launch announcement for this generator), not freshly captured. First post using the script's multi-image support (extended same-session to allow up to 4 `--image`/`--alt` pairs, matching Bluesky's per-post limit). First attempt (deleted by Espen, was at `.../post/3msjobnnzsz2w`) had the `codexcryptica.com/...` URL rendering as inert plain text — the script computed hashtag facets but never link facets, so bare URLs were never marked up as clickable. Fixed by adding `computeLinkFacets()` (mirrors Bluesky's documented detection approach: match `https?://` or letter-led domain-dot-word patterns, strip trailing sentence punctuation, prepend `https://` to bare domains) — this repost is the first with working links.

### 2026-08-07 — Knowledge Graph (queue #6), redone

- **Text:** I kept losing track of how NPCs, factions, and locations connected to each other.

  So I built a knowledge graph into Codex Cryptica. Mention a name in your notes and it suggests the link - accept it and watch it appear in the graph.

  codexcryptica.com

  #TTRPG #Worldbuilding

- **Image:** `apps/web/static/images/living-lore-graph.png` (compressed to ~145KB JPEG before upload)
- **Alt:** Codex Cryptica's knowledge graph view: an entity explorer sidebar, a connected graph of characters, factions, and locations, and a detail panel showing a character named Master Kardos Varazslovas linked to the Swift Wing Eagles faction
- **URL:** https://bsky.app/profile/codexcryptica.bsky.social/post/3msiz3qbx2e2n
- **Note:** the original attempt at this topic (deleted by Espen) predated the clarified Need/So-I-built/Outcome/Link format — this is the redo, following it. Link is the root domain by explicit override (Espen chose this over a more specific `/features` or blog-post link the skill would otherwise have preferred).

### 2026-08-07 — Welcome / intro (ad hoc, not from queue)

- **Text:** Codex Cryptica is a worldbuilding and campaign tool for TTRPGs. Everything stays local-first in your browser. Knowledge graphs, timelines, NPC/faction generators, AI art. codexcryptica.com #TTRPG #worldbuilding
- **Image:** `apps/web/static/og-image.png`
- **Alt:** Codex Cryptica app screenshot: a private RPG lore vault showing an entity list, a connected lore graph, and a character detail panel for Master Kardos
- **URL:** https://bsky.app/profile/codexcryptica.bsky.social/post/3msin6hhb5r2s
- **Note:** first real post on the account; generic intro rather than a single feature/use-case, so doesn't map to a queue item.

## Backlog (from issue #2086, reordered)

The remaining topics from #2086, resequenced to satisfy its own cadence rule ("rotate between generation, organization, visualization, and play so consecutive posts don't feel like repetitions of the same pitch") — the issue's numeric order clusters 5+ generator posts in a row before hitting anything else. Generation is spread through in runs of 3, broken up by an organization/visualization/play post every 4th slot; "Generator ecosystem" stays last per its own explicit gating note. Original queue numbers kept for reference.

1. **Related Entity Generation** _(orig #2, generation)_ — Need: NPCs, factions and locations that actually relate to the existing setting. Tags: `#TTRPG #Worldbuilding #RPGDesign`. **Blocked on an image** — no screenshot of this feature exists in `apps/web/static/` or in any announcement discussion. Needs a fresh capture: an entity's connections section plus a generated related entity (dev server + seeded vault + a live AI call). Was skipped on 2026-08-08 for this reason; still next once an asset exists.
2. **Spatial Canvas / Maps** _(orig #10, visualization)_ — Need: a visual workspace for arranging places, ideas and relationships spatially. Tags: `#TTRPG #Worldbuilding`. Candidate assets: `apps/web/static/images/adventure-canvas.png`, `dungeon-canvas.png`, and `https://assets.codexcryptica.com/blog/assets/canvas-announcement.png` (discussion #2039) — none verified against the post's angle yet.
3. **Faction Generator** _(orig #4, generation)_ — Need: factions with motives, conflicts and relationships rather than isolated descriptions. Tags: `#TTRPG #Worldbuilding #RPGDesign`
4. **NPC / Character Generator** _(orig #5, generation)_ — Need: usable characters with hooks and relationships, not just names and appearance. Tags: `#TTRPG #Worldbuilding`
5. **Settlement Generator** _(orig #7, generation)_ — Need: settlements containing reasons for characters to visit and interact with them. Tags: `#TTRPG #Worldbuilding`
6. **Timeline** _(orig #11, organization)_ — Need: to understand how events in a setting affect one another over time. Tags: `#TTRPG #Worldbuilding`
7. **Religion / Pantheon Generation** _(orig #8, generation)_ — Need: religions that influence the world rather than existing as background lore. Tags: `#TTRPG #Worldbuilding #Fantasy`
8. **Adventure / Scenario Generation** _(orig #9, generation)_ — Need: something playable from the worldbuilding already created. Tags: `#TTRPG #RPGDesign`
9. **Context-aware generation** _(orig #13, generation)_ — Need: generated material that knows about the world already created. Tags: `#TTRPG #Worldbuilding`
10. **VTT** _(orig #12, play)_ — Need: to move from building the campaign into actually playing it without leaving the same environment. Tags: `#TTRPG #VTT`. Deliberately placed last before the ecosystem post — "now go play it" as the capstone of the individual-feature run.
11. **Generator ecosystem / breadth** _(orig #14, gated — only after individual generators demonstrated)_ — Show how several generators chain together to build a campaign or setting. Tags: `#TTRPG #Worldbuilding`

## Drafted (not yet posted)

### Genre/theme breadth (ad hoc, not from #2086's numbered queue)

- **Text:** Fantasy-flavored generators do not work if your table is running cyberpunk, cosmic horror, or a western.

  So I built 13 genre hubs into Codex Cryptica. Every generator adapts its NPCs, factions, and naming to whichever setting you pick.

  codexcryptica.com/generators

  #TTRPG #Worldbuilding

- **Image:** `https://assets.codexcryptica.com/announcements/generator-hub-desktop-v1.png` (from GitHub discussion #1987)
- **Alt:** Desktop view of the Codex Cryptica RPG Generator Hub, showing a grid of genre hub cards including Fantasy, Pirate, Cyberpunk, Sci-Fi, Post-Apocalyptic, Modern, Vampire, Cosmic Horror, Western, Steampunk, and Lancer
- **Note:** count of 13 verified against `apps/web/src/params/theme_hub.ts`'s `VALID_HUB_THEMES`. This is thematically close to queue item "Generator ecosystem / breadth" (orig #14) but distinct — that item is about chaining generators together within one setting; this one is about breadth across settings. Consider whether posting this before #14 changes whether #14 still reads as fresh once its turn comes.
