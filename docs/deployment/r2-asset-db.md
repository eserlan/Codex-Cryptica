# R2 Asset Database

Snapshot of everything in the `codex-cryptica-statics` R2 bucket (served at `https://assets.codexcryptica.com/<key>`), captured 2026-08-16 via the Cloudflare API. **This is a point-in-time snapshot, not a live view** — re-run the listing (see bottom) before trusting exact counts/sizes for anything more than a few weeks old.

Rules for what goes in R2 vs. `apps/web/static/` live in [`docs/deployment/assets.md`](./assets.md).

## Summary

| Group                                                   | Files           | Size    | What it's for                                                                        |
| ------------------------------------------------------- | --------------- | ------- | ------------------------------------------------------------------------------------ |
| `announcements/`                                        | 15              | 5.7 MB  | Bluesky / GitHub Discussions launch images                                           |
| `blog/assets/`                                          | 1               | 1.2 MB  | Legacy single blog asset (Spatial Canvas bsky post)                                  |
| `directory/listings/`                                   | 4               | ~3 KB   | Public generator directory metadata (JSON)                                           |
| `discussions/alien-race/`                               | 1               | 0.2 MB  | Alien Race generator discussion image                                                |
| `images/blog/` + `images/help-blog/` + loose `images/*` | 50              | ~18 MB  | Blog post inline images + old help-doc screenshots                                   |
| `og/`                                                   | 12              | 10.6 MB | Dedicated 16:9 social share / OpenGraph cards for `/for` landing pages               |
| `screenshots/`                                          | 37              | ~6.3 MB | `/generators` + `/tools` page cards, og:image                                        |
| `vault-samples/images/`                                 | 36              | 58.7 MB | Portrait art for the 9 demo/quick-start vaults                                       |
| `published/{vault-uuid}/`                               | 531 (11 vaults) | ~52 MB  | **User data**, not ours — assets from real vaults published for guest/player viewing |
| `starter-tile-decks/kenney-scribble-dungeons/`          | 159             | 0.17 MB | Bundled third-party VTT map tile pack (Kenney)                                       |

Total: 849 objects, 155.4 MB. The tables below cover everything **except** `published/` and `starter-tile-decks/`, which are listed as one row per vault/pack in the [Collapsed groups](#collapsed-groups-user-data--bundled-packs) section at the bottom since their contents are user-generated or third-party, not assets we authored.

## `announcements/` — Bluesky / GitHub discussion launch images

| Key                                                      | Size    | Type       | Modified   | Purpose                                            |
| -------------------------------------------------------- | ------- | ---------- | ---------- | -------------------------------------------------- |
| `announcements/cosmic-horror-hub-desktop-v1.png`         | 238 KB  | image/png  | 2026-08-01 | Cosmic Horror Hub discussion post                  |
| `announcements/council-vote-costly-best-solution-v1.jpg` | 129 KB  | image/jpeg | 2026-08-04 | Council Vote generator launch (bsky/discussion)    |
| `announcements/council-vote-hero-v1.jpg`                 | 143 KB  | image/jpeg | 2026-08-04 | Council Vote generator launch (bsky/discussion)    |
| `announcements/council-vote-smallest-coalition-v1.jpg`   | 134 KB  | image/jpeg | 2026-08-04 | Council Vote generator launch (bsky/discussion)    |
| `announcements/faction-generator-iron-syndicate-v1.png`  | 553 KB  | image/png  | 2026-08-14 | Faction Generator bsky post (2026-08-15)           |
| `announcements/generator-hub-desktop-v1.png`             | 120 KB  | image/png  | 2026-08-01 | Generator hub discussion post                      |
| `announcements/secret-society-form-v1.jpg`               | 147 KB  | image/jpeg | 2026-08-09 | Secret Society generator launch                    |
| `announcements/secret-society-hero-v1.jpg`               | 146 KB  | image/jpeg | 2026-08-09 | Secret Society generator launch                    |
| `announcements/secret-society-hero-v2.png`               | 1517 KB | image/png  | 2026-08-09 | Secret Society generator launch (alt hero)         |
| `announcements/secret-society-hero-v3.png`               | 981 KB  | image/png  | 2026-08-09 | Secret Society generator launch (alt hero)         |
| `announcements/secret-society-hooks-v1.jpg`              | 131 KB  | image/jpeg | 2026-08-09 | Secret Society generator launch                    |
| `announcements/star-system-aurelia-7.png`                | 525 KB  | image/png  | 2026-08-06 | Star System Generator bsky post (full result page) |
| `announcements/star-system-diagram-aurelia-7.png`        | 55 KB   | image/png  | 2026-08-06 | Star System Generator bsky post (orbital diagram)  |
| `announcements/star-system-hero.png`                     | 358 KB  | image/png  | 2026-08-06 | Star System Generator discussion post              |
| `announcements/world-generator-desktop-v1.jpg`           | 126 KB  | image/jpeg | 2026-08-03 | World Generator bsky post (2026-08-08)             |

## `blog/` — legacy single blog asset

| Key                                   | Size    | Type      | Modified   | Purpose                               |
| ------------------------------------- | ------- | --------- | ---------- | ------------------------------------- |
| `blog/assets/canvas-announcement.png` | 1229 KB | image/png | 2026-08-04 | Spatial Canvas bsky post (2026-08-14) |

## `directory/` — public generator directory listing metadata (JSON, not images)

| Key                                                            | Size | Type | Modified   | Purpose                                                           |
| -------------------------------------------------------------- | ---- | ---- | ---------- | ----------------------------------------------------------------- |
| `directory/listings/09e611df-99b7-484e-a0c8-11aaf8ab712c.json` | 1 KB | —    | 2026-07-24 | Public generator directory listing (one JSON per published entry) |
| `directory/listings/15ac9a9f-6de0-4c0d-bf9a-edc2851dd98a.json` | 1 KB | —    | 2026-07-02 | Public generator directory listing (one JSON per published entry) |
| `directory/listings/c3f9dd7d-ad1c-45b5-aadd-059b262aed9c.json` | 1 KB | —    | 2026-07-03 | Public generator directory listing (one JSON per published entry) |
| `directory/listings/ca09a3e0-0121-42a5-aa8d-83735a924888.json` | 1 KB | —    | 2026-07-02 | Public generator directory listing (one JSON per published entry) |

## `discussions/` — GitHub Discussions announcement images

| Key                                                          | Size   | Type      | Modified   | Purpose                                |
| ------------------------------------------------------------ | ------ | --------- | ---------- | -------------------------------------- |
| `discussions/alien-race/alien_generator_results_desktop.png` | 220 KB | image/png | 2026-08-13 | Alien Race generator GitHub Discussion |

## `images/` — blog post inline images + old help-doc screenshots

| Key                                                                     | Size    | Type       | Modified   | Purpose                                                     |
| ----------------------------------------------------------------------- | ------- | ---------- | ---------- | ----------------------------------------------------------- |
| `images/blog/canvas-discovery-workflow.png`                             | 1250 KB | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| `images/blog/cc-over-obsidian/cc-over-obsidian-hero.jpg`                | 725 KB  | image/jpeg | 2026-04-04 | Blog post inline image — `cc-over-obsidian`                 |
| `images/blog/cc-over-obsidian/cc-over-obsidian-product-kit.jpg`         | 658 KB  | image/jpeg | 2026-04-04 | Blog post inline image — `cc-over-obsidian`                 |
| `images/blog/custom-stat-sheet-templates/schema-template-library.png`   | 121 KB  | image/png  | 2026-07-31 | Blog post inline image — `custom-stat-sheet-templates`      |
| `images/blog/custom-stat-sheet-templates/template-manager.png`          | 41 KB   | image/png  | 2026-07-31 | Blog post inline image — `custom-stat-sheet-templates`      |
| `images/blog/entity-labels-example.png`                                 | 940 KB  | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| `images/blog/entity-shelf/shelf-import-outcome.png`                     | 31 KB   | image/png  | 2026-08-13 | Blog post inline image — `entity-shelf`                     |
| `images/blog/entity-shelf/shelf-panel.png`                              | 28 KB   | image/png  | 2026-08-13 | Blog post inline image — `entity-shelf`                     |
| `images/blog/filter-discovery-hero.png`                                 | 924 KB  | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| `images/blog/filters-and-labels/canvas-discovery-workflow.png`          | 1250 KB | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| `images/blog/filters-and-labels/entity-labels-example.png`              | 940 KB  | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| `images/blog/filters-and-labels/filter-discovery-hero.png`              | 924 KB  | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| `images/blog/filters-and-labels/graph-filter-highlight.png`             | 279 KB  | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| `images/blog/filters-and-labels/oracle-plot-command.png`                | 802 KB  | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| `images/blog/filters-and-labels/sidebar-filter-action.png`              | 576 KB  | image/png  | 2026-04-22 | Blog post inline image — `filters-and-labels`               |
| `images/blog/front-page/front-page-hero.png`                            | 1003 KB | image/png  | 2026-04-04 | Blog post inline image — `front-page`                       |
| `images/blog/front-page/front-page-theme.png`                           | 58 KB   | image/png  | 2026-04-04 | Blog post inline image — `front-page`                       |
| `images/blog/graph-filter-highlight.png`                                | 279 KB  | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| `images/blog/how-import-works/how-import-works-start.png`               | 18 KB   | image/png  | 2026-03-30 | Blog post inline image — `how-import-works`                 |
| `images/blog/how-import-works/import-dropzone.png`                      | 9 KB    | image/png  | 2026-03-30 | Blog post inline image — `how-import-works`                 |
| `images/blog/how-import-works/import-hero.png`                          | 34 KB   | image/png  | 2026-03-30 | Blog post inline image — `how-import-works`                 |
| `images/blog/how-import-works/import-processing.png`                    | 12 KB   | image/png  | 2026-03-30 | Blog post inline image — `how-import-works`                 |
| `images/blog/how-import-works/import-review-queue.png`                  | 38 KB   | image/png  | 2026-03-30 | Blog post inline image — `how-import-works`                 |
| `images/blog/oracle-capabilities/oracle-capabilities-hero.png`          | 25 KB   | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| `images/blog/oracle-capabilities/oracle-chat-example.png`               | 85 KB   | image/png  | 2026-03-29 | Blog post inline image — `oracle-capabilities`              |
| `images/blog/oracle-capabilities/oracle-command-menu.png`               | 39 KB   | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| `images/blog/oracle-capabilities/oracle-connect-command.png`            | 26 KB   | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| `images/blog/oracle-capabilities/oracle-create-command.png`             | 15 KB   | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| `images/blog/oracle-capabilities/oracle-draw-command.png`               | 102 KB  | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| `images/blog/oracle-capabilities/oracle-plot-command.png`               | 102 KB  | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| `images/blog/oracle-capabilities/oracle-roll-command.png`               | 17 KB   | image/png  | 2026-03-24 | Blog post inline image — `oracle-capabilities`              |
| `images/blog/oracle-plot-command.png`                                   | 802 KB  | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| `images/blog/reuse-entities-between-campaigns/shelf-hero.png`           | 443 KB  | image/png  | 2026-08-13 | Blog post inline image — `reuse-entities-between-campaigns` |
| `images/blog/reuse-entities-between-campaigns/shelf-import-outcome.png` | 130 KB  | image/png  | 2026-08-13 | Blog post inline image — `reuse-entities-between-campaigns` |
| `images/blog/reuse-entities-between-campaigns/shelf-in-context.png`     | 119 KB  | image/png  | 2026-08-13 | Blog post inline image — `reuse-entities-between-campaigns` |
| `images/blog/reuse-entities-between-campaigns/shelf-send-action.png`    | 28 KB   | image/png  | 2026-08-13 | Blog post inline image — `reuse-entities-between-campaigns` |
| `images/blog/sidebar-filter-action.png`                                 | 576 KB  | image/png  | 2026-04-22 | Blog post inline image (ungrouped/legacy path)              |
| `images/fantasy canvas.png`                                             | 802 KB  | image/png  | 2026-03-01 | Legacy ungrouped upload                                     |
| `images/fantasy graph.png`                                              | 626 KB  | image/png  | 2026-03-01 | Legacy ungrouped upload                                     |
| `images/fantasy local area map.png`                                     | 1966 KB | image/png  | 2026-03-01 | Legacy ungrouped upload                                     |
| `images/help-blog/canvas.png`                                           | 518 KB  | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| `images/help-blog/connections.png`                                      | 71 KB   | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| `images/help-blog/entity-sidebar.png`                                   | 278 KB  | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| `images/help-blog/import.png`                                           | 604 KB  | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| `images/help-blog/map.png`                                              | 1527 KB | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| `images/help-blog/new chronicle.png`                                    | 43 KB   | image/png  | 2026-03-01 | Old in-app help/blog screenshot                             |
| `images/help-blog/oracle-draw.png`                                      | 599 KB  | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| `images/help-blog/sync.png`                                             | 61 KB   | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |
| `images/help-blog/welcome.png`                                          | 420 KB  | image/png  | 2026-03-01 | Old in-app help/blog screenshot                             |
| `images/help-blog/zen-mode.png`                                         | 705 KB  | image/png  | 2026-03-02 | Old in-app help/blog screenshot                             |

## `og/` — `/for` landing page 16:9 OpenGraph cards

| Key                             | Size    | Type       | Modified   | Purpose                                          |
| ------------------------------- | ------- | ---------- | ---------- | ------------------------------------------------ |
| `og/call-of-cthulhu.jpg`        | 789 KB  | image/jpeg | 2026-08-27 | Call of Cthulhu system landing page card         |
| `og/conspiracy.jpg`             | 852 KB  | image/jpeg | 2026-08-27 | Conspiracy & Intrigue genre landing page card    |
| `og/cosmic-horror.jpg`          | 820 KB  | image/jpeg | 2026-08-27 | Cosmic Horror genre landing page card            |
| `og/cyberpunk-red.jpg`          | 995 KB  | image/jpeg | 2026-08-27 | Cyberpunk RED system landing page card           |
| `og/dungeons-and-dragons.jpg`   | 898 KB  | image/jpeg | 2026-08-27 | D&D 5e system landing page card                  |
| `og/dystopian-sci-fi.jpg`       | 926 KB  | image/jpeg | 2026-08-27 | Dystopian Sci-Fi genre landing page card         |
| `og/fantasy-worldbuilding.jpg`  | 1165 KB | image/jpeg | 2026-08-27 | Fantasy Worldbuilding genre landing page card    |
| `og/gothic-horror.jpg`          | 804 KB  | image/jpeg | 2026-08-27 | Gothic Horror genre landing page card            |
| `og/pathfinder-2e.jpg`          | 859 KB  | image/jpeg | 2026-08-27 | Pathfinder 2e system landing page card           |
| `og/space-opera.jpg`            | 921 KB  | image/jpeg | 2026-08-27 | Space Opera genre landing page card              |
| `og/traveller.jpg`              | 915 KB  | image/jpeg | 2026-08-27 | Traveller system landing page card               |
| `og/vampire-the-masquerade.jpg` | 793 KB  | image/jpeg | 2026-08-27 | Vampire: The Masquerade system landing page card |

## `screenshots/` — `/generators` + `/tools` page cards and og:image

| Key                                                  | Size   | Type       | Modified   | Purpose                                           |
| ---------------------------------------------------- | ------ | ---------- | ---------- | ------------------------------------------------- |
| `screenshots/feature-build.jpg`                      | 87 KB  | image/jpeg | 2026-08-09 | Feature card image (marketing/landing page)       |
| `screenshots/feature-connect.jpg`                    | 133 KB | image/jpeg | 2026-08-09 | Feature card image (marketing/landing page)       |
| `screenshots/feature-run.jpg`                        | 47 KB  | image/jpeg | 2026-08-09 | Feature card image (marketing/landing page)       |
| `screenshots/feature-unstuck.jpg`                    | 115 KB | image/jpeg | 2026-08-09 | Feature card image (marketing/landing page)       |
| `screenshots/feature-yours.jpg`                      | 214 KB | image/jpeg | 2026-08-09 | Feature card image (marketing/landing page)       |
| `screenshots/generator-adventure-generator.jpg`      | 198 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-adventure-idea-generator.jpg` | 198 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-alien-race.jpg`               | 248 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-council-vote.jpg`             | 206 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-dnd-npc.jpg`                  | 167 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-dungeon-generator.jpg`        | 207 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-faction.jpg`                  | 166 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-fantasy-names.jpg`            | 194 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-god-generator.jpg`            | 160 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-item.jpg`                     | 171 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-kingdom.jpg`                  | 173 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-language-generator.jpg`       | 199 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-magic-item.jpg`               | 162 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-names.jpg`                    | 206 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-nation.jpg`                   | 167 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-news-sheet-generator.jpg`     | 194 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-nomad-clan.jpg`               | 174 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-npc.jpg`                      | 160 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-pantheon-generator.jpg`       | 166 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-plot-twist-generator.jpg`     | 205 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-quest.jpg`                    | 202 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-secret-society.jpg`           | 190 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-settlement.jpg`               | 165 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-ship-generator.jpg`           | 176 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-social-hub.jpg`               | 168 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-star-system.jpg`              | 218 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-tavern.jpg`                   | 167 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-vampire-clan.jpg`             | 130 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/generator-world.jpg`                    | 152 KB | image/jpeg | 2026-08-15 | Generator card image for `/generators` + `/tools` |
| `screenshots/secret-society-1-form.jpg`              | 147 KB | image/jpeg | 2026-08-09 | Secret Society generator step-by-step sequence    |
| `screenshots/secret-society-2-result.jpg`            | 146 KB | image/jpeg | 2026-08-09 | Secret Society generator step-by-step sequence    |
| `screenshots/secret-society-3-detail.jpg`            | 131 KB | image/jpeg | 2026-08-09 | Secret Society generator step-by-step sequence    |

## `vault-samples/` — demo/quick-start vault portrait art

| Key                                           | Size    | Type      | Modified   | Purpose                                        |
| --------------------------------------------- | ------- | --------- | ---------- | ---------------------------------------------- |
| `vault-samples/images/cyberpunk-city.png`     | 1903 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| `vault-samples/images/cyberpunk-creature.png` | 1672 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| `vault-samples/images/cyberpunk-faction.png`  | 2089 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| `vault-samples/images/cyberpunk-hacker.png`   | 1760 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| `vault-samples/images/cyberpunk-note.png`     | 1653 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| `vault-samples/images/cyberpunk-npc2.png`     | 1714 KB | image/png | 2026-03-01 | Portrait for the `cyberpunk` demo vault sample |
| `vault-samples/images/fantasy-creature.png`   | 1868 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| `vault-samples/images/fantasy-faction.png`    | 1771 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| `vault-samples/images/fantasy-mage.png`       | 1645 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| `vault-samples/images/fantasy-note.png`       | 1667 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| `vault-samples/images/fantasy-npc2.png`       | 1565 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| `vault-samples/images/fantasy-tavern.png`     | 1657 KB | image/png | 2026-03-01 | Portrait for the `fantasy` demo vault sample   |
| `vault-samples/images/modern-creature.png`    | 1558 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| `vault-samples/images/modern-detective.png`   | 1346 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| `vault-samples/images/modern-faction.png`     | 1440 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| `vault-samples/images/modern-hq.png`          | 1818 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| `vault-samples/images/modern-note.png`        | 1424 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| `vault-samples/images/modern-npc2.png`        | 1504 KB | image/png | 2026-03-01 | Portrait for the `modern` demo vault sample    |
| `vault-samples/images/scifi-android.png`      | 1760 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| `vault-samples/images/scifi-creature.png`     | 1733 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| `vault-samples/images/scifi-faction.png`      | 1201 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| `vault-samples/images/scifi-note.png`         | 1634 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| `vault-samples/images/scifi-npc2.png`         | 1524 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| `vault-samples/images/scifi-station.png`      | 1873 KB | image/png | 2026-03-01 | Portrait for the `scifi` demo vault sample     |
| `vault-samples/images/vampire-creature.png`   | 1575 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| `vault-samples/images/vampire-faction.png`    | 1675 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| `vault-samples/images/vampire-lord.png`       | 1465 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| `vault-samples/images/vampire-manor.png`      | 1787 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| `vault-samples/images/vampire-note.png`       | 1972 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| `vault-samples/images/vampire-npc2.png`       | 1590 KB | image/png | 2026-03-01 | Portrait for the `vampire` demo vault sample   |
| `vault-samples/images/wasteland-creature.png` | 1485 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |
| `vault-samples/images/wasteland-faction.png`  | 1633 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |
| `vault-samples/images/wasteland-fort.png`     | 1659 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |
| `vault-samples/images/wasteland-hero.png`     | 1743 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |
| `vault-samples/images/wasteland-note.png`     | 2037 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |
| `vault-samples/images/wasteland-npc2.png`     | 1724 KB | image/png | 2026-03-01 | Portrait for the `wasteland` demo vault sample |

## Collapsed groups (user data / bundled packs)

These are not assets the team authored for marketing/content — listed as one row per group rather than per file.

| Group                                             | Files | Size   | Modified      | What it is                                                                                       |
| ------------------------------------------------- | ----- | ------ | ------------- | ------------------------------------------------------------------------------------------------ |
| `published/09e611df-99b7-484e-a0c8-11aaf8ab712c/` | 2     | 421 KB | 2026-07-24    | Guest-published vault bundle (map/entity images published for player viewing)                    |
| `published/15ac9a9f-6de0-4c0d-bf9a-edc2851dd98a/` | 82    | 8.5 MB | 2026-07-02    | Guest-published vault bundle                                                                     |
| `published/3ed2bc05-668b-476a-b7b6-b0417a2b1750/` | 71    | 7.6 MB | 2026-06-23    | Guest-published vault bundle                                                                     |
| `published/48e7f173-5f37-404e-b2dd-07bc78786a6f/` | 23    | 3.0 MB | 2026-07-03    | Guest-published vault bundle                                                                     |
| `published/4d58a9f0-724b-474a-9460-b65390f2f300/` | 3     | 3.5 MB | 2026-07-12    | Guest-published vault bundle                                                                     |
| `published/54429d8e-252c-40da-ab66-f9d91cb9a4ad/` | 23    | 1.7 MB | 2026-06-23    | Guest-published vault bundle                                                                     |
| `published/85da9578-9670-466a-ba7c-848eff9f26e1/` | 71    | 5.1 MB | 2026-06-30    | Guest-published vault bundle                                                                     |
| `published/b44e8329-0323-4755-84af-49a70a1b3775/` | 1     | 159 KB | 2026-06-23    | Guest-published vault bundle                                                                     |
| `published/c3f9dd7d-ad1c-45b5-aadd-059b262aed9c/` | 112   | 7.9 MB | 2026-07-02/03 | Guest-published vault bundle                                                                     |
| `published/ca09a3e0-0121-42a5-aa8d-83735a924888/` | 62    | 5.7 MB | 2026-07-02    | Guest-published vault bundle                                                                     |
| `published/f7ee85d1-de45-4a30-a0f8-beccec6af82d/` | 81    | 8.3 MB | 2026-06-23    | Guest-published vault bundle                                                                     |
| `starter-tile-decks/kenney-scribble-dungeons/`    | 159   | 175 KB | 2026-08-04    | Bundled third-party VTT map tile pack (Kenney "Scribble Dungeons"), shipped with the VTT feature |

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
