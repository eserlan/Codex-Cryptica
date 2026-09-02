# R2 Asset Database

Snapshot of everything in the `codex-cryptica-statics` R2 bucket (served at `https://assets.codexcryptica.com/<key>`), captured 2026-08-16 via the Cloudflare API. **This is a point-in-time snapshot, not a live view** — re-run the listing (see bottom) before trusting exact counts/sizes for anything more than a few weeks old.

Rules for what goes in R2 vs. `apps/web/static/` live in [`docs/deployment/assets.md`](./assets.md).

## Summary

| Group                                                                                            | Files           | Size     | What it's for                                                                        |
| ------------------------------------------------------------------------------------------------ | --------------- | -------- | ------------------------------------------------------------------------------------ |
| [`announcements/`](#announcements--bluesky--github-discussion-launch-images)                     | 24              | 13.3 MB  | Bluesky / GitHub Discussions launch images                                           |
| [`blog/assets/`](#blog--legacy-single-blog-asset)                                                | 1               | 1.2 MB   | Legacy single blog asset (Spatial Canvas bsky post)                                  |
| [`directory/listings/`](#directory--public-generator-directory-listing-metadata-json-not-images) | 4               | ~3 KB    | Public generator directory metadata (JSON)                                           |
| [`discussions/alien-race/`](#discussions--github-discussions-announcement-images)                | 1               | 0.2 MB   | Alien Race generator discussion image                                                |
| [`images/`](#images--blog-post-inline-images--old-help-doc-screenshots)                          | 50              | ~18 MB   | Blog post inline images + old help-doc screenshots                                   |
| [`og/`](#og--for-landing-page-169-opengraph-cards)                                               | 17              | ~15.4 MB | Dedicated 16:9 social share / OpenGraph cards for `/for` landing pages               |
| [`screenshots/`](#screenshots--generators--tools-page-cards-and-ogimage)                         | 37              | ~6.3 MB  | `/generators` + `/tools` page cards, og:image                                        |
| [`silhouettes/`](#silhouettes--curated-vector-silhouettes-for-entities-and-generators)           | 28              | ~15 KB   | Curated vector SVG silhouettes for entity types, categories, and wanted poster gen   |
| [`vault-samples/images/`](#vault-samples--demoquick-start-vault-portrait-art)                    | 36              | 58.7 MB  | Portrait art for the 9 demo/quick-start vaults                                       |
| [`published/{vault-uuid}/`](#collapsed-groups-user-data--bundled-packs)                          | 531 (11 vaults) | ~52 MB   | **User data**, not ours — assets from real vaults published for guest/player viewing |
| [`starter-tile-decks/kenney-scribble-dungeons/`](#collapsed-groups-user-data--bundled-packs)     | 159             | 0.17 MB  | Bundled third-party VTT map tile pack (Kenney)                                       |

Total: 884 objects, ~162 MB. The tables below cover everything **except** `published/` and `starter-tile-decks/`, which are listed as one row per vault/pack in the [Collapsed groups](#collapsed-groups-user-data--bundled-packs) section at the bottom since their contents are user-generated or third-party, not assets we authored.

## `announcements/` — Bluesky / GitHub discussion launch images

| Key                                                                                                                                                 | Size    | Type       | Modified   | Purpose                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------- |
| [`announcements/adventure-dead-mans-tontine.jpg`](https://assets.codexcryptica.com/announcements/adventure-dead-mans-tontine.jpg)                   | 828 KB  | image/jpeg | 2026-09-02 | Pirate adventure example (The Dead Man's Tontine) showcase / discussion #2664 image               |
| [`announcements/artifact-vaelgrasp-ruin.jpg`](https://assets.codexcryptica.com/announcements/artifact-vaelgrasp-ruin.jpg)                           | 792 KB  | image/jpeg | 2026-09-02 | Classic Fantasy artifact example (Vaelgrasp, the Regent's Ruin) showcase / discussion #2660 image |
| [`announcements/cosmic-horror-hub-desktop-v1.png`](https://assets.codexcryptica.com/announcements/cosmic-horror-hub-desktop-v1.png)                 | 238 KB  | image/png  | 2026-08-01 | Cosmic Horror Hub discussion post                                                                 |
| [`announcements/council-vote-costly-best-solution-v1.jpg`](https://assets.codexcryptica.com/announcements/council-vote-costly-best-solution-v1.jpg) | 129 KB  | image/jpeg | 2026-08-04 | Council Vote generator launch (bsky/discussion)                                                   |
| [`announcements/council-vote-hero-v1.jpg`](https://assets.codexcryptica.com/announcements/council-vote-hero-v1.jpg)                                 | 143 KB  | image/jpeg | 2026-08-04 | Council Vote generator launch (bsky/discussion)                                                   |
| [`announcements/council-vote-smallest-coalition-v1.jpg`](https://assets.codexcryptica.com/announcements/council-vote-smallest-coalition-v1.jpg)     | 134 KB  | image/jpeg | 2026-08-04 | Council Vote generator launch (bsky/discussion)                                                   |
| [`announcements/creature-void-siphon.jpg`](https://assets.codexcryptica.com/announcements/creature-void-siphon.jpg)                                 | 678 KB  | image/jpeg | 2026-09-02 | Cosmic Horror creature example (The Void-Siphon) showcase / discussion #2658 image                |
| [`announcements/dungeon-silo-zero-seven.jpg`](https://assets.codexcryptica.com/announcements/dungeon-silo-zero-seven.jpg)                           | 911 KB  | image/jpeg | 2026-09-02 | Post-Apocalyptic dungeon example (Silo Zero-Seven) showcase / discussion #2662 image              |
| [`announcements/faction-generator-iron-syndicate-v1.png`](https://assets.codexcryptica.com/announcements/faction-generator-iron-syndicate-v1.png)   | 553 KB  | image/png  | 2026-08-14 | Faction Generator bsky post (2026-08-15)                                                          |
| [`announcements/faction-withered-hand.jpg`](https://assets.codexcryptica.com/announcements/faction-withered-hand.jpg)                               | 881 KB  | image/jpeg | 2026-09-02 | Dark Fantasy faction example (The Withered Hand) showcase / discussion #2666 image                |
| [`announcements/generator-hub-desktop-v1.png`](https://assets.codexcryptica.com/announcements/generator-hub-desktop-v1.png)                         | 120 KB  | image/png  | 2026-08-01 | Generator hub discussion post                                                                     |
| [`announcements/secret-society-form-v1.jpg`](https://assets.codexcryptica.com/announcements/secret-society-form-v1.jpg)                             | 147 KB  | image/jpeg | 2026-08-09 | Secret Society generator launch                                                                   |
| [`announcements/secret-society-hero-v1.jpg`](https://assets.codexcryptica.com/announcements/secret-society-hero-v1.jpg)                             | 146 KB  | image/jpeg | 2026-08-09 | Secret Society generator launch                                                                   |
| [`announcements/secret-society-hero-v2.png`](https://assets.codexcryptica.com/announcements/secret-society-hero-v2.png)                             | 1517 KB | image/png  | 2026-08-09 | Secret Society generator launch (alt hero)                                                        |
| [`announcements/secret-society-hero-v3.png`](https://assets.codexcryptica.com/announcements/secret-society-hero-v3.png)                             | 981 KB  | image/png  | 2026-08-09 | Secret Society generator launch (alt hero)                                                        |
| [`announcements/secret-society-hooks-v1.jpg`](https://assets.codexcryptica.com/announcements/secret-society-hooks-v1.jpg)                           | 131 KB  | image/jpeg | 2026-08-09 | Secret Society generator launch                                                                   |
| [`announcements/ship-cinder-wren.jpg`](https://assets.codexcryptica.com/announcements/ship-cinder-wren.jpg)                                         | 881 KB  | image/jpeg | 2026-08-31 | Space Western ship example (`/examples/the-cinder-wren-space-western-ship`) card                  |
| [`announcements/star-system-aurelia-7.png`](https://assets.codexcryptica.com/announcements/star-system-aurelia-7.png)                               | 525 KB  | image/png  | 2026-08-06 | Star System Generator bsky post (full result page)                                                |
| [`announcements/star-system-diagram-aurelia-7.png`](https://assets.codexcryptica.com/announcements/star-system-diagram-aurelia-7.png)               | 55 KB   | image/png  | 2026-08-06 | Star System Generator bsky post (orbital diagram)                                                 |
| [`announcements/star-system-hero.png`](https://assets.codexcryptica.com/announcements/star-system-hero.png)                                         | 358 KB  | image/png  | 2026-08-06 | Star System Generator discussion post                                                             |
| [`announcements/the-cinder-wren-space-western-ship.jpg`](https://assets.codexcryptica.com/announcements/the-cinder-wren-space-western-ship.jpg)     | 881 KB  | image/jpeg | 2026-08-31 | Space Western ship example showcase / bsky card                                                   |
| [`announcements/villain-lady-vivienne-morvath.jpg`](https://assets.codexcryptica.com/announcements/villain-lady-vivienne-morvath.jpg)               | 824 KB  | image/jpeg | 2026-09-02 | Gothic Horror villain example (Lady Vivienne Morvath) showcase / discussion #2656 image           |
| [`announcements/world-generator-desktop-v1.jpg`](https://assets.codexcryptica.com/announcements/world-generator-desktop-v1.jpg)                     | 126 KB  | image/jpeg | 2026-08-03 | World Generator bsky post (2026-08-08)                                                            |

## `blog/` — legacy single blog asset

| Key                                                                                                           | Size    | Type      | Modified   | Purpose                               |
| ------------------------------------------------------------------------------------------------------------- | ------- | --------- | ---------- | ------------------------------------- |
| [`blog/assets/canvas-announcement.png`](https://assets.codexcryptica.com/blog/assets/canvas-announcement.png) | 1229 KB | image/png | 2026-08-04 | Spatial Canvas bsky post (2026-08-14) |

## `directory/` — public generator directory listing metadata (JSON, not images)

| Key                                                                                                                                                             | Size | Type | Modified   | Purpose                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---------- | ----------------------------------------------------------------- |
| [`directory/listings/09e611df-99b7-484e-a0c8-11aaf8ab712c.json`](https://assets.codexcryptica.com/directory/listings/09e611df-99b7-484e-a0c8-11aaf8ab712c.json) | 1 KB | —    | 2026-07-24 | Public generator directory listing (one JSON per published entry) |
| [`directory/listings/15ac9a9f-6de0-4c0d-bf9a-edc2851dd98a.json`](https://assets.codexcryptica.com/directory/listings/15ac9a9f-6de0-4c0d-bf9a-edc2851dd98a.json) | 1 KB | —    | 2026-07-02 | Public generator directory listing (one JSON per published entry) |
| [`directory/listings/c3f9dd7d-ad1c-45b5-aadd-059b262aed9c.json`](https://assets.codexcryptica.com/directory/listings/c3f9dd7d-ad1c-45b5-aadd-059b262aed9c.json) | 1 KB | —    | 2026-07-03 | Public generator directory listing (one JSON per published entry) |
| [`directory/listings/ca09a3e0-0121-42a5-aa8d-83735a924888.json`](https://assets.codexcryptica.com/directory/listings/ca09a3e0-0121-42a5-aa8d-83735a924888.json) | 1 KB | —    | 2026-07-02 | Public generator directory listing (one JSON per published entry) |

## `discussions/` — GitHub Discussions announcement images

| Key                                                                                                                                                         | Size   | Type      | Modified   | Purpose                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------- | ---------- | -------------------------------------- |
| [`discussions/alien-race/alien_generator_results_desktop.png`](https://assets.codexcryptica.com/discussions/alien-race/alien_generator_results_desktop.png) | 220 KB | image/png | 2026-08-13 | Alien Race generator GitHub Discussion |

## `images/` — blog post inline images + old help-doc screenshots

| Key                                                                                                                                                                               | Size    | Type       | Modified   | Purpose                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- | ---------- | ----------------------------------------------------------- |
| [`images/blog/canvas-discovery-workflow.png`](https://assets.codexcryptica.com/images/blog/canvas-discovery-workflow.png)                                                         | 1250 KB | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| [`images/blog/cc-over-obsidian/cc-over-obsidian-hero.jpg`](https://assets.codexcryptica.com/images/blog/cc-over-obsidian/cc-over-obsidian-hero.jpg)                               | 725 KB  | image/jpeg | 2026-04-04 | Blog post inline image — `cc-over-obsidian`                 |
| [`images/blog/cc-over-obsidian/cc-over-obsidian-product-kit.jpg`](https://assets.codexcryptica.com/images/blog/cc-over-obsidian/cc-over-obsidian-product-kit.jpg)                 | 658 KB  | image/jpeg | 2026-04-04 | Blog post inline image — `cc-over-obsidian`                 |
| [`images/blog/custom-stat-sheet-templates/schema-template-library.png`](https://assets.codexcryptica.com/images/blog/custom-stat-sheet-templates/schema-template-library.png)     | 121 KB  | image/png  | 2026-07-31 | Blog post inline image — `custom-stat-sheet-templates`      |
| [`images/blog/custom-stat-sheet-templates/template-manager.png`](https://assets.codexcryptica.com/images/blog/custom-stat-sheet-templates/template-manager.png)                   | 41 KB   | image/png  | 2026-07-31 | Blog post inline image — `custom-stat-sheet-templates`      |
| [`images/blog/entity-labels-example.png`](https://assets.codexcryptica.com/images/blog/entity-labels-example.png)                                                                 | 940 KB  | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| [`images/blog/entity-shelf/shelf-import-outcome.png`](https://assets.codexcryptica.com/images/blog/entity-shelf/shelf-import-outcome.png)                                         | 31 KB   | image/png  | 2026-08-13 | Blog post inline image — `entity-shelf`                     |
| [`images/blog/entity-shelf/shelf-panel.png`](https://assets.codexcryptica.com/images/blog/entity-shelf/shelf-panel.png)                                                           | 28 KB   | image/png  | 2026-08-13 | Blog post inline image — `entity-shelf`                     |
| [`images/blog/filter-discovery-hero.png`](https://assets.codexcryptica.com/images/blog/filter-discovery-hero.png)                                                                 | 924 KB  | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| [`images/blog/filters-and-labels/canvas-discovery-workflow.png`](https://assets.codexcryptica.com/images/blog/filters-and-labels/canvas-discovery-workflow.png)                   | 1250 KB | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| [`images/blog/filters-and-labels/entity-labels-example.png`](https://assets.codexcryptica.com/images/blog/filters-and-labels/entity-labels-example.png)                           | 940 KB  | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| [`images/blog/filters-and-labels/filter-discovery-hero.png`](https://assets.codexcryptica.com/images/blog/filters-and-labels/filter-discovery-hero.png)                           | 924 KB  | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| [`images/blog/filters-and-labels/graph-filter-highlight.png`](https://assets.codexcryptica.com/images/blog/filters-and-labels/graph-filter-highlight.png)                         | 279 KB  | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| [`images/blog/filters-and-labels/oracle-plot-command.png`](https://assets.codexcryptica.com/images/blog/filters-and-labels/oracle-plot-command.png)                               | 802 KB  | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| [`images/blog/filters-and-labels/sidebar-filter-action.png`](https://assets.codexcryptica.com/images/blog/filters-and-labels/sidebar-filter-action.png)                           | 576 KB  | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| [`images/blog/front-page/front-page-hero.png`](https://assets.codexcryptica.com/images/blog/front-page/front-page-hero.png)                                                       | 1003 KB | image/png  | 2026-04-04 | Blog post inline image — `front-page`                       |
| [`images/blog/front-page/front-page-theme.png`](https://assets.codexcryptica.com/images/blog/front-page/front-page-theme.png)                                                     | 58 KB   | image/png  | 2026-04-04 | Blog post inline image — `front-page`                       |
| [`images/blog/graph-filter-highlight.png`](https://assets.codexcryptica.com/images/blog/graph-filter-highlight.png)                                                               | 279 KB  | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| [`images/blog/how-import-works/how-import-works-start.png`](https://assets.codexcryptica.com/images/blog/how-import-works/how-import-works-start.png)                             | 18 KB   | image/png  | 2026-03-30 | Blog post inline image — `how-import-works`                 |
| [`images/blog/how-import-works/import-dropzone.png`](https://assets.codexcryptica.com/images/blog/how-import-works/import-dropzone.png)                                           | 9 KB    | image/png  | 2026-03-30 | Blog post inline image — `how-import-works`                 |
| [`images/blog/how-import-works/import-hero.png`](https://assets.codexcryptica.com/images/blog/how-import-works/import-hero.png)                                                   | 34 KB   | image/png  | 2026-03-30 | Blog post inline image — `how-import-works`                 |
| [`images/blog/how-import-works/import-processing.png`](https://assets.codexcryptica.com/images/blog/how-import-works/import-processing.png)                                       | 12 KB   | image/png  | 2026-03-30 | Blog post inline image — `how-import-works`                 |
| [`images/blog/how-import-works/import-review-queue.png`](https://assets.codexcryptica.com/images/blog/how-import-works/import-review-queue.png)                                   | 38 KB   | image/png  | 2026-03-30 | Blog post inline image — `how-import-works`                 |
| [`images/blog/oracle-capabilities/oracle-capabilities-hero.png`](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-capabilities-hero.png)                   | 25 KB   | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| [`images/blog/oracle-capabilities/oracle-chat-example.png`](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-chat-example.png)                             | 85 KB   | image/png  | 2026-03-29 | Blog post inline image — `oracle-capabilities`              |
| [`images/blog/oracle-capabilities/oracle-command-menu.png`](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-command-menu.png)                             | 39 KB   | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| [`images/blog/oracle-capabilities/oracle-connect-command.png`](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-connect-command.png)                       | 26 KB   | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| [`images/blog/oracle-capabilities/oracle-create-command.png`](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-create-command.png)                         | 15 KB   | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| [`images/blog/oracle-capabilities/oracle-draw-command.png`](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-draw-command.png)                             | 102 KB  | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| [`images/blog/oracle-capabilities/oracle-plot-command.png`](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-plot-command.png)                             | 102 KB  | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| [`images/blog/oracle-capabilities/oracle-roll-command.png`](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-roll-command.png)                             | 17 KB   | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| [`images/blog/oracle-plot-command.png`](https://assets.codexcryptica.com/images/blog/oracle-plot-command.png)                                                                     | 802 KB  | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| [`images/blog/reuse-entities-between-campaigns/shelf-hero.png`](https://assets.codexcryptica.com/images/blog/reuse-entities-between-campaigns/shelf-hero.png)                     | 443 KB  | image/png  | 2026-08-13 | Blog post inline image — `reuse-entities-between-campaigns` |
| [`images/blog/reuse-entities-between-campaigns/shelf-import-outcome.png`](https://assets.codexcryptica.com/images/blog/reuse-entities-between-campaigns/shelf-import-outcome.png) | 130 KB  | image/png  | 2026-08-13 | Blog post inline image — `reuse-entities-between-campaigns` |
| [`images/blog/reuse-entities-between-campaigns/shelf-in-context.png`](https://assets.codexcryptica.com/images/blog/reuse-entities-between-campaigns/shelf-in-context.png)         | 119 KB  | image/png  | 2026-08-13 | Blog post inline image — `reuse-entities-between-campaigns` |
| [`images/blog/reuse-entities-between-campaigns/shelf-send-action.png`](https://assets.codexcryptica.com/images/blog/reuse-entities-between-campaigns/shelf-send-action.png)       | 28 KB   | image/png  | 2026-08-13 | Blog post inline image — `reuse-entities-between-campaigns` |
| [`images/blog/sidebar-filter-action.png`](https://assets.codexcryptica.com/images/blog/sidebar-filter-action.png)                                                                 | 576 KB  | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| [`images/fantasy canvas.png`](https://assets.codexcryptica.com/images/fantasy%20canvas.png)                                                                                       | 802 KB  | image/png  | 2026-03-01 | Legacy ungrouped upload                                     |
| [`images/fantasy graph.png`](https://assets.codexcryptica.com/images/fantasy%20graph.png)                                                                                         | 626 KB  | image/png  | 2026-03-01 | Legacy ungrouped upload                                     |
| [`images/fantasy local area map.png`](https://assets.codexcryptica.com/images/fantasy%20local%20area%20map.png)                                                                   | 1966 KB | image/png  | 2026-03-01 | Legacy ungrouped upload                                     |
| [`images/help-blog/canvas.png`](https://assets.codexcryptica.com/images/help-blog/canvas.png)                                                                                     | 518 KB  | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| [`images/help-blog/connections.png`](https://assets.codexcryptica.com/images/help-blog/connections.png)                                                                           | 71 KB   | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| [`images/help-blog/entity-sidebar.png`](https://assets.codexcryptica.com/images/help-blog/entity-sidebar.png)                                                                     | 278 KB  | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| [`images/help-blog/import.png`](https://assets.codexcryptica.com/images/help-blog/import.png)                                                                                     | 604 KB  | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| [`images/help-blog/map.png`](https://assets.codexcryptica.com/images/help-blog/map.png)                                                                                           | 1527 KB | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| [`images/help-blog/new chronicle.png`](https://assets.codexcryptica.com/images/help-blog/new%20chronicle.png)                                                                     | 43 KB   | image/png  | 2026-03-01 | Old in-app help/blog screenshot                             |
| [`images/help-blog/oracle-draw.png`](https://assets.codexcryptica.com/images/help-blog/oracle-draw.png)                                                                           | 599 KB  | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| [`images/help-blog/sync.png`](https://assets.codexcryptica.com/images/help-blog/sync.png)                                                                                         | 61 KB   | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| [`images/help-blog/welcome.png`](https://assets.codexcryptica.com/images/help-blog/welcome.png)                                                                                   | 420 KB  | image/png  | 2026-03-01 | Old in-app help/blog screenshot                             |
| [`images/help-blog/zen-mode.png`](https://assets.codexcryptica.com/images/help-blog/zen-mode.png)                                                                                 | 705 KB  | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |

## `og/` — `/for` landing page 16:9 OpenGraph cards

| Key                                                                                               | Size    | Type       | Modified   | Purpose                                          |
| ------------------------------------------------------------------------------------------------- | ------- | ---------- | ---------- | ------------------------------------------------ |
| [`og/call-of-cthulhu.jpg`](https://assets.codexcryptica.com/og/call-of-cthulhu.jpg)               | 789 KB  | image/jpeg | 2026-08-27 | Call of Cthulhu system landing page card         |
| [`og/conspiracy.jpg`](https://assets.codexcryptica.com/og/conspiracy.jpg)                         | 852 KB  | image/jpeg | 2026-08-27 | Conspiracy & Intrigue genre landing page card    |
| [`og/cosmic-horror.jpg`](https://assets.codexcryptica.com/og/cosmic-horror.jpg)                   | 820 KB  | image/jpeg | 2026-08-27 | Cosmic Horror genre landing page card            |
| [`og/cyberpunk-red.jpg`](https://assets.codexcryptica.com/og/cyberpunk-red.jpg)                   | 995 KB  | image/jpeg | 2026-08-27 | Cyberpunk RED system landing page card           |
| [`og/delta-green.jpg`](https://assets.codexcryptica.com/og/delta-green.jpg)                       | 876 KB  | image/jpeg | 2026-08-27 | Delta Green system landing page card             |
| [`og/dungeons-and-dragons.jpg`](https://assets.codexcryptica.com/og/dungeons-and-dragons.jpg)     | 898 KB  | image/jpeg | 2026-08-27 | D&D 5e system landing page card                  |
| [`og/dystopian-sci-fi.jpg`](https://assets.codexcryptica.com/og/dystopian-sci-fi.jpg)             | 926 KB  | image/jpeg | 2026-08-27 | Dystopian Sci-Fi genre landing page card         |
| [`og/fantasy-worldbuilding.jpg`](https://assets.codexcryptica.com/og/fantasy-worldbuilding.jpg)   | 1165 KB | image/jpeg | 2026-08-27 | Fantasy Worldbuilding genre landing page card    |
| [`og/gothic-horror.jpg`](https://assets.codexcryptica.com/og/gothic-horror.jpg)                   | 804 KB  | image/jpeg | 2026-08-27 | Gothic Horror genre landing page card            |
| [`og/pathfinder-2e.jpg`](https://assets.codexcryptica.com/og/pathfinder-2e.jpg)                   | 859 KB  | image/jpeg | 2026-08-27 | Pathfinder 2e system landing page card           |
| [`og/sandbox-campaigns.jpg`](https://assets.codexcryptica.com/og/sandbox-campaigns.jpg)           | 947 KB  | image/jpeg | 2026-09-01 | Sandbox Campaigns style landing page card        |
| [`og/scum-and-villainy.jpg`](https://assets.codexcryptica.com/og/scum-and-villainy.jpg)           | 986 KB  | image/jpeg | 2026-09-01 | Scum and Villainy system landing page card       |
| [`og/space-opera.jpg`](https://assets.codexcryptica.com/og/space-opera.jpg)                       | 921 KB  | image/jpeg | 2026-08-27 | Space Opera genre landing page card              |
| [`og/space-western.jpg`](https://assets.codexcryptica.com/og/space-western.jpg)                   | 960 KB  | image/jpeg | 2026-09-01 | Space Western genre landing page card            |
| [`og/traveller.jpg`](https://assets.codexcryptica.com/og/traveller.jpg)                           | 915 KB  | image/jpeg | 2026-08-27 | Traveller system landing page card               |
| [`og/vampire-the-masquerade.jpg`](https://assets.codexcryptica.com/og/vampire-the-masquerade.jpg) | 793 KB  | image/jpeg | 2026-08-27 | Vampire: The Masquerade system landing page card |
| [`og/west-marches.jpg`](https://assets.codexcryptica.com/og/west-marches.jpg)                     | 950 KB  | image/jpeg | 2026-09-01 | West Marches style landing page card             |

## `screenshots/` — `/generators` + `/tools` page cards and og:image

| Key                                                                                                                                         | Size   | Type       | Modified   | Purpose                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | ---------- | ------------------------------------------------- |
| [`screenshots/feature-build.jpg`](https://assets.codexcryptica.com/screenshots/feature-build.jpg)                                           | 87 KB  | image/jpeg | 2026-08-09 | Feature card image (marketing/landing page)       |
| [`screenshots/feature-connect.jpg`](https://assets.codexcryptica.com/screenshots/feature-connect.jpg)                                       | 133 KB | image/jpeg | 2026-08-09 | Feature card image (marketing/landing page)       |
| [`screenshots/feature-run.jpg`](https://assets.codexcryptica.com/screenshots/feature-run.jpg)                                               | 47 KB  | image/jpeg | 2026-08-09 | Feature card image (marketing/landing page)       |
| [`screenshots/feature-unstuck.jpg`](https://assets.codexcryptica.com/screenshots/feature-unstuck.jpg)                                       | 115 KB | image/jpeg | 2026-08-09 | Feature card image (marketing/landing page)       |
| [`screenshots/feature-yours.jpg`](https://assets.codexcryptica.com/screenshots/feature-yours.jpg)                                           | 214 KB | image/jpeg | 2026-08-09 | Feature card image (marketing/landing page)       |
| [`screenshots/generator-adventure-generator.jpg`](https://assets.codexcryptica.com/screenshots/generator-adventure-generator.jpg)           | 198 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-adventure-idea-generator.jpg`](https://assets.codexcryptica.com/screenshots/generator-adventure-idea-generator.jpg) | 198 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-alien-race.jpg`](https://assets.codexcryptica.com/screenshots/generator-alien-race.jpg)                             | 248 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-council-vote.jpg`](https://assets.codexcryptica.com/screenshots/generator-council-vote.jpg)                         | 206 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-dnd-npc.jpg`](https://assets.codexcryptica.com/screenshots/generator-dnd-npc.jpg)                                   | 167 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-dungeon-generator.jpg`](https://assets.codexcryptica.com/screenshots/generator-dungeon-generator.jpg)               | 207 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-faction.jpg`](https://assets.codexcryptica.com/screenshots/generator-faction.jpg)                                   | 166 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-fantasy-names.jpg`](https://assets.codexcryptica.com/screenshots/generator-fantasy-names.jpg)                       | 194 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-god-generator.jpg`](https://assets.codexcryptica.com/screenshots/generator-god-generator.jpg)                       | 160 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-item.jpg`](https://assets.codexcryptica.com/screenshots/generator-item.jpg)                                         | 171 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-kingdom.jpg`](https://assets.codexcryptica.com/screenshots/generator-kingdom.jpg)                                   | 173 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-language-generator.jpg`](https://assets.codexcryptica.com/screenshots/generator-language-generator.jpg)             | 199 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-magic-item.jpg`](https://assets.codexcryptica.com/screenshots/generator-magic-item.jpg)                             | 162 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-names.jpg`](https://assets.codexcryptica.com/screenshots/generator-names.jpg)                                       | 206 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-nation.jpg`](https://assets.codexcryptica.com/screenshots/generator-nation.jpg)                                     | 167 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-news-sheet-generator.jpg`](https://assets.codexcryptica.com/screenshots/generator-news-sheet-generator.jpg)         | 194 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-nomad-clan.jpg`](https://assets.codexcryptica.com/screenshots/generator-nomad-clan.jpg)                             | 174 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-npc.jpg`](https://assets.codexcryptica.com/screenshots/generator-npc.jpg)                                           | 160 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-pantheon-generator.jpg`](https://assets.codexcryptica.com/screenshots/generator-pantheon-generator.jpg)             | 166 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-plot-twist-generator.jpg`](https://assets.codexcryptica.com/screenshots/generator-plot-twist-generator.jpg)         | 205 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-quest.jpg`](https://assets.codexcryptica.com/screenshots/generator-quest.jpg)                                       | 202 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-secret-society.jpg`](https://assets.codexcryptica.com/screenshots/generator-secret-society.jpg)                     | 190 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-settlement.jpg`](https://assets.codexcryptica.com/screenshots/generator-settlement.jpg)                             | 165 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-ship-generator.jpg`](https://assets.codexcryptica.com/screenshots/generator-ship-generator.jpg)                     | 176 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-social-hub.jpg`](https://assets.codexcryptica.com/screenshots/generator-social-hub.jpg)                             | 168 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-star-system.jpg`](https://assets.codexcryptica.com/screenshots/generator-star-system.jpg)                           | 218 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-tavern.jpg`](https://assets.codexcryptica.com/screenshots/generator-tavern.jpg)                                     | 167 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-vampire-clan.jpg`](https://assets.codexcryptica.com/screenshots/generator-vampire-clan.jpg)                         | 130 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/generator-world.jpg`](https://assets.codexcryptica.com/screenshots/generator-world.jpg)                                       | 152 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| [`screenshots/secret-society-1-form.jpg`](https://assets.codexcryptica.com/screenshots/secret-society-1-form.jpg)                           | 147 KB | image/jpeg | 2026-08-09 | Secret Society generator step-by-step sequence    |
| [`screenshots/secret-society-2-result.jpg`](https://assets.codexcryptica.com/screenshots/secret-society-2-result.jpg)                       | 146 KB | image/jpeg | 2026-08-09 | Secret Society generator step-by-step sequence    |
| [`screenshots/secret-society-3-detail.jpg`](https://assets.codexcryptica.com/screenshots/secret-society-3-detail.jpg)                       | 131 KB | image/jpeg | 2026-08-09 | Secret Society generator step-by-step sequence    |

## `vault-samples/` — demo/quick-start vault portrait art

| Key                                                                                                                           | Size    | Type      | Modified   | Purpose                                        |
| ----------------------------------------------------------------------------------------------------------------------------- | ------- | --------- | ---------- | ---------------------------------------------- |
| [`vault-samples/images/cyberpunk-city.png`](https://assets.codexcryptica.com/vault-samples/images/cyberpunk-city.png)         | 1903 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| [`vault-samples/images/cyberpunk-creature.png`](https://assets.codexcryptica.com/vault-samples/images/cyberpunk-creature.png) | 1672 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| [`vault-samples/images/cyberpunk-faction.png`](https://assets.codexcryptica.com/vault-samples/images/cyberpunk-faction.png)   | 2089 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| [`vault-samples/images/cyberpunk-hacker.png`](https://assets.codexcryptica.com/vault-samples/images/cyberpunk-hacker.png)     | 1760 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| [`vault-samples/images/cyberpunk-note.png`](https://assets.codexcryptica.com/vault-samples/images/cyberpunk-note.png)         | 1653 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| [`vault-samples/images/cyberpunk-npc2.png`](https://assets.codexcryptica.com/vault-samples/images/cyberpunk-npc2.png)         | 1714 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| [`vault-samples/images/fantasy-creature.png`](https://assets.codexcryptica.com/vault-samples/images/fantasy-creature.png)     | 1868 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| [`vault-samples/images/fantasy-faction.png`](https://assets.codexcryptica.com/vault-samples/images/fantasy-faction.png)       | 1771 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| [`vault-samples/images/fantasy-mage.png`](https://assets.codexcryptica.com/vault-samples/images/fantasy-mage.png)             | 1645 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| [`vault-samples/images/fantasy-note.png`](https://assets.codexcryptica.com/vault-samples/images/fantasy-note.png)             | 1667 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| [`vault-samples/images/fantasy-npc2.png`](https://assets.codexcryptica.com/vault-samples/images/fantasy-npc2.png)             | 1565 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| [`vault-samples/images/fantasy-tavern.png`](https://assets.codexcryptica.com/vault-samples/images/fantasy-tavern.png)         | 1657 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| [`vault-samples/images/modern-creature.png`](https://assets.codexcryptica.com/vault-samples/images/modern-creature.png)       | 1558 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| [`vault-samples/images/modern-detective.png`](https://assets.codexcryptica.com/vault-samples/images/modern-detective.png)     | 1346 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| [`vault-samples/images/modern-faction.png`](https://assets.codexcryptica.com/vault-samples/images/modern-faction.png)         | 1440 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| [`vault-samples/images/modern-hq.png`](https://assets.codexcryptica.com/vault-samples/images/modern-hq.png)                   | 1818 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| [`vault-samples/images/modern-note.png`](https://assets.codexcryptica.com/vault-samples/images/modern-note.png)               | 1424 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| [`vault-samples/images/modern-npc2.png`](https://assets.codexcryptica.com/vault-samples/images/modern-npc2.png)               | 1504 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| [`vault-samples/images/scifi-android.png`](https://assets.codexcryptica.com/vault-samples/images/scifi-android.png)           | 1760 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| [`vault-samples/images/scifi-creature.png`](https://assets.codexcryptica.com/vault-samples/images/scifi-creature.png)         | 1733 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| [`vault-samples/images/scifi-faction.png`](https://assets.codexcryptica.com/vault-samples/images/scifi-faction.png)           | 1201 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| [`vault-samples/images/scifi-note.png`](https://assets.codexcryptica.com/vault-samples/images/scifi-note.png)                 | 1634 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| [`vault-samples/images/scifi-npc2.png`](https://assets.codexcryptica.com/vault-samples/images/scifi-npc2.png)                 | 1524 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| [`vault-samples/images/scifi-station.png`](https://assets.codexcryptica.com/vault-samples/images/scifi-station.png)           | 1873 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| [`vault-samples/images/vampire-creature.png`](https://assets.codexcryptica.com/vault-samples/images/vampire-creature.png)     | 1575 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| [`vault-samples/images/vampire-faction.png`](https://assets.codexcryptica.com/vault-samples/images/vampire-faction.png)       | 1675 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| [`vault-samples/images/vampire-lord.png`](https://assets.codexcryptica.com/vault-samples/images/vampire-lord.png)             | 1465 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| [`vault-samples/images/vampire-manor.png`](https://assets.codexcryptica.com/vault-samples/images/vampire-manor.png)           | 1787 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| [`vault-samples/images/vampire-note.png`](https://assets.codexcryptica.com/vault-samples/images/vampire-note.png)             | 1972 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| [`vault-samples/images/vampire-npc2.png`](https://assets.codexcryptica.com/vault-samples/images/vampire-npc2.png)             | 1590 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| [`vault-samples/images/wasteland-creature.png`](https://assets.codexcryptica.com/vault-samples/images/wasteland-creature.png) | 1485 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |
| [`vault-samples/images/wasteland-faction.png`](https://assets.codexcryptica.com/vault-samples/images/wasteland-faction.png)   | 1633 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |
| [`vault-samples/images/wasteland-fort.png`](https://assets.codexcryptica.com/vault-samples/images/wasteland-fort.png)         | 1659 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |
| [`vault-samples/images/wasteland-hero.png`](https://assets.codexcryptica.com/vault-samples/images/wasteland-hero.png)         | 1743 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |
| [`vault-samples/images/wasteland-note.png`](https://assets.codexcryptica.com/vault-samples/images/wasteland-note.png)         | 2037 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |
| [`vault-samples/images/wasteland-npc2.png`](https://assets.codexcryptica.com/vault-samples/images/wasteland-npc2.png)         | 1724 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |

## `silhouettes/` — curated vector silhouettes for entities and generators

Curated standalone SVG vector silhouettes (`viewBox="0 0 100 100"`, `fill="currentColor"`) for entity archetypes, creature types, factions, items, locations, and wanted poster generators.

| Key                                                                                                                     | Size    | Type          | Modified   | Archetype / Purpose                                  |
| ----------------------------------------------------------------------------------------------------------------------- | ------- | ------------- | ---------- | ---------------------------------------------------- |
| [`silhouettes/fantasy-warrior-male.svg`](https://assets.codexcryptica.com/silhouettes/fantasy-warrior-male.svg)         | ~0.5 KB | image/svg+xml | 2026-09-02 | Fantasy Warrior (Male) with sword & armor            |
| [`silhouettes/fantasy-warrior-female.svg`](https://assets.codexcryptica.com/silhouettes/fantasy-warrior-female.svg)     | ~0.5 KB | image/svg+xml | 2026-09-02 | Fantasy Warrior (Female) with blade & braid          |
| [`silhouettes/fantasy-caster-male.svg`](https://assets.codexcryptica.com/silhouettes/fantasy-caster-male.svg)           | ~0.5 KB | image/svg+xml | 2026-09-02 | Fantasy Mage / Caster (Male) with staff & robes      |
| [`silhouettes/fantasy-caster-female.svg`](https://assets.codexcryptica.com/silhouettes/fantasy-caster-female.svg)       | ~0.5 KB | image/svg+xml | 2026-09-02 | Fantasy Sorceress / Caster (Female) with spell orb   |
| [`silhouettes/fantasy-rogue-male.svg`](https://assets.codexcryptica.com/silhouettes/fantasy-rogue-male.svg)             | ~0.5 KB | image/svg+xml | 2026-09-02 | Fantasy Rogue / Assassin (Male) hooded with daggers  |
| [`silhouettes/fantasy-rogue-female.svg`](https://assets.codexcryptica.com/silhouettes/fantasy-rogue-female.svg)         | ~0.5 KB | image/svg+xml | 2026-09-02 | Fantasy Rogue / Shadow (Female) hooded with daggers  |
| [`silhouettes/fantasy-paladin.svg`](https://assets.codexcryptica.com/silhouettes/fantasy-paladin.svg)                   | ~0.5 KB | image/svg+xml | 2026-09-02 | Fantasy Holy Paladin with heavy greatshield & blade  |
| [`silhouettes/gothic-vampire-male.svg`](https://assets.codexcryptica.com/silhouettes/gothic-vampire-male.svg)           | ~0.5 KB | image/svg+xml | 2026-09-02 | Gothic Vampire Lord (Male) with high collared cape   |
| [`silhouettes/gothic-vampire-female.svg`](https://assets.codexcryptica.com/silhouettes/gothic-vampire-female.svg)       | ~0.5 KB | image/svg+xml | 2026-09-02 | Gothic Vampire Countess (Female) with sweeping gown  |
| [`silhouettes/gothic-inquisitor.svg`](https://assets.codexcryptica.com/silhouettes/gothic-inquisitor.svg)               | ~0.5 KB | image/svg+xml | 2026-09-02 | Gothic Inquisitor / Witch Hunter with wide-brim hat  |
| [`silhouettes/scifi-scientist-alien.svg`](https://assets.codexcryptica.com/silhouettes/scifi-scientist-alien.svg)       | ~0.5 KB | image/svg+xml | 2026-09-02 | Sci-Fi Alien Scientist with cranial crest & datapad  |
| [`silhouettes/scifi-pilot-explorer.svg`](https://assets.codexcryptica.com/silhouettes/scifi-pilot-explorer.svg)         | ~0.5 KB | image/svg+xml | 2026-09-02 | Sci-Fi Pilot / Explorer in EVA pressurized suit      |
| [`silhouettes/cyberpunk-hacker-female.svg`](https://assets.codexcryptica.com/silhouettes/cyberpunk-hacker-female.svg)   | ~0.5 KB | image/svg+xml | 2026-09-02 | Cyberpunk Netrunner / Hacker with VR deck & jacket   |
| [`silhouettes/cyberpunk-enforcer-male.svg`](https://assets.codexcryptica.com/silhouettes/cyberpunk-enforcer-male.svg)   | ~0.5 KB | image/svg+xml | 2026-09-02 | Cyberpunk Street Enforcer with cyberware arm         |
| [`silhouettes/western-gunslinger-male.svg`](https://assets.codexcryptica.com/silhouettes/western-gunslinger-male.svg)   | ~0.5 KB | image/svg+xml | 2026-09-02 | Western Gunslinger (Male) with Stetson & duster coat |
| [`silhouettes/western-outlaw-female.svg`](https://assets.codexcryptica.com/silhouettes/western-outlaw-female.svg)       | ~0.5 KB | image/svg+xml | 2026-09-02 | Western Outlaw / Bounty Hunter (Female) with hat     |
| [`silhouettes/creature-beast-quadruped.svg`](https://assets.codexcryptica.com/silhouettes/creature-beast-quadruped.svg) | ~0.5 KB | image/svg+xml | 2026-09-02 | Quadruped Beast / Dire Wolf creature                 |
| [`silhouettes/creature-dragon-winged.svg`](https://assets.codexcryptica.com/silhouettes/creature-dragon-winged.svg)     | ~0.5 KB | image/svg+xml | 2026-09-02 | Winged Dragon / Wyvern beast                         |
| [`silhouettes/creature-horror-aberrant.svg`](https://assets.codexcryptica.com/silhouettes/creature-horror-aberrant.svg) | ~0.5 KB | image/svg+xml | 2026-09-02 | Cosmic Horror Aberration / Eldritch tentacled entity |
| [`silhouettes/creature-golem-construct.svg`](https://assets.codexcryptica.com/silhouettes/creature-golem-construct.svg) | ~0.5 KB | image/svg+xml | 2026-09-02 | Heavy Stone Golem / Mech Construct                   |
| [`silhouettes/item-relic-blade.svg`](https://assets.codexcryptica.com/silhouettes/item-relic-blade.svg)                 | ~0.5 KB | image/svg+xml | 2026-09-02 | Ancient Artifact Blade / Relic Sword                 |
| [`silhouettes/item-arcane-tome.svg`](https://assets.codexcryptica.com/silhouettes/item-arcane-tome.svg)                 | ~0.5 KB | image/svg+xml | 2026-09-02 | Grimoire / Arcane Tome artifact                      |
| [`silhouettes/location-citadel-castle.svg`](https://assets.codexcryptica.com/silhouettes/location-citadel-castle.svg)   | ~0.5 KB | image/svg+xml | 2026-09-02 | Fortress / Citadel / Castle stronghold               |
| [`silhouettes/location-scifi-megacity.svg`](https://assets.codexcryptica.com/silhouettes/location-scifi-megacity.svg)   | ~0.5 KB | image/svg+xml | 2026-09-02 | Sci-Fi Megacity Skyline / Spire metropolis           |
| [`silhouettes/faction-insignia-crest.svg`](https://assets.codexcryptica.com/silhouettes/faction-insignia-crest.svg)     | ~0.5 KB | image/svg+xml | 2026-09-02 | Heraldic Shield Crest for noble factions / guilds    |
| [`silhouettes/faction-insignia-cyber.svg`](https://assets.codexcryptica.com/silhouettes/faction-insignia-cyber.svg)     | ~0.5 KB | image/svg+xml | 2026-09-02 | Cyber Hex Emblem for megacorps & tech syndicates     |
| [`silhouettes/generic-humanoid-unknown.svg`](https://assets.codexcryptica.com/silhouettes/generic-humanoid-unknown.svg) | ~0.5 KB | image/svg+xml | 2026-09-02 | Unknown Person / Mysterious Wanderer fallback        |

## Collapsed groups (user data / bundled packs)

These are not assets the team authored for marketing/content — listed as one row per group rather than per file.

| Group                                                                                                                                 | Files | Size   | Modified      | What it is                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ | ------------- | ------------------------------------------------------------------------------------------------ |
| [`published/09e611df-99b7-484e-a0c8-11aaf8ab712c/`](https://assets.codexcryptica.com/published/09e611df-99b7-484e-a0c8-11aaf8ab712c/) | 2     | 421 KB | 2026-07-24    | Guest-published vault bundle (map/entity images published for player viewing)                    |
| [`published/15ac9a9f-6de0-4c0d-bf9a-edc2851dd98a/`](https://assets.codexcryptica.com/published/15ac9a9f-6de0-4c0d-bf9a-edc2851dd98a/) | 82    | 8.5 MB | 2026-07-02    | Guest-published vault bundle                                                                     |
| [`published/3ed2bc05-668b-476a-b7b6-b0417a2b1750/`](https://assets.codexcryptica.com/published/3ed2bc05-668b-476a-b7b6-b0417a2b1750/) | 71    | 7.6 MB | 2026-06-23    | Guest-published vault bundle                                                                     |
| [`published/48e7f173-5f37-404e-b2dd-07bc78786a6f/`](https://assets.codexcryptica.com/published/48e7f173-5f37-404e-b2dd-07bc78786a6f/) | 23    | 3.0 MB | 2026-07-03    | Guest-published vault bundle                                                                     |
| [`published/4d58a9f0-724b-474a-9460-b65390f2f300/`](https://assets.codexcryptica.com/published/4d58a9f0-724b-474a-9460-b65390f2f300/) | 3     | 3.5 MB | 2026-07-12    | Guest-published vault bundle                                                                     |
| [`published/54429d8e-252c-40da-ab66-f9d91cb9a4ad/`](https://assets.codexcryptica.com/published/54429d8e-252c-40da-ab66-f9d91cb9a4ad/) | 23    | 1.7 MB | 2026-06-23    | Guest-published vault bundle                                                                     |
| [`published/85da9578-9670-466a-ba7c-848eff9f26e1/`](https://assets.codexcryptica.com/published/85da9578-9670-466a-ba7c-848eff9f26e1/) | 71    | 5.1 MB | 2026-06-30    | Guest-published vault bundle                                                                     |
| [`published/b44e8329-0323-4755-84af-49a70a1b3775/`](https://assets.codexcryptica.com/published/b44e8329-0323-4755-84af-49a70a1b3775/) | 1     | 159 KB | 2026-06-23    | Guest-published vault bundle                                                                     |
| [`published/c3f9dd7d-ad1c-45b5-aadd-059b262aed9c/`](https://assets.codexcryptica.com/published/c3f9dd7d-ad1c-45b5-aadd-059b262aed9c/) | 112   | 7.9 MB | 2026-07-02/03 | Guest-published vault bundle                                                                     |
| [`published/ca09a3e0-0121-42a5-aa8d-83735a924888/`](https://assets.codexcryptica.com/published/ca09a3e0-0121-42a5-aa8d-83735a924888/) | 62    | 5.7 MB | 2026-07-02    | Guest-published vault bundle                                                                     |
| [`published/f7ee85d1-de45-4a30-a0f8-beccec6af82d/`](https://assets.codexcryptica.com/published/f7ee85d1-de45-4a30-a0f8-beccec6af82d/) | 81    | 8.3 MB | 2026-06-23    | Guest-published vault bundle                                                                     |
| [`starter-tile-decks/kenney-scribble-dungeons/`](https://assets.codexcryptica.com/starter-tile-decks/kenney-scribble-dungeons/)       | 159   | 175 KB | 2026-08-04    | Bundled third-party VTT map tile pack (Kenney "Scribble Dungeons"), shipped with the VTT feature |

`published/*` folders come from the guest-vault publish pipeline (`GuestExporter`/`GuestBundle`, see PR #1641) — each UUID is one vault someone published for guest/player viewing, containing a `bundle.json` plus that vault's map and entity images. This is live user content living in the same bucket, not something to reuse for marketing.

## Re-generating this file

```js
// via the cloudflare-api MCP execute tool, account b065cbccc9617f440b47177d96ac15d8
async () => {
  const objects = [];
  let cursor;
  for (let i = 0; i < 20; i++) {
    const res = await cloudflare.request({
      method: "GET",
      path: `/accounts/${accountId}/r2/buckets/codex-cryptica-statics/objects`,
      query: cursor ? { cursor, per_page: 1000 } : { per_page: 1000 },
    });
    objects.push(...(res.result || []));
    const next = res.result_info && res.result_info.cursor;
    if (!next) break;
    cursor = next;
  }
  return objects; // sort/group/re-render as needed
};
```
