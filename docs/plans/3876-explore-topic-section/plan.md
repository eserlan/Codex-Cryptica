# Plan: Browse by Topic on Explore

Issue: [#3876](https://github.com/eserlan/Codex-Cryptica/issues/3876)  
Branch: `feat/3876-explore-topic-section`  
Status: Planned; implementation has not started.

## Goal

Give visitors to `/explore` a clear place to find guides, worked examples and tools by campaign subject. The four existing topic cards currently sit in the broad Learn section. Move them into a dedicated section using the existing directory layout.

This is a standalone implementation plan. No `spec.md`, Spec Kit feature directory or changes to the active Spec Kit feature configuration are needed.

## Agreed presentation

Insert **Browse by Topic** immediately after **Find Your Setup** and before **Learn**. Use this description:

> Guides, worked examples, and tools for the campaign you’re running.

| Card title          | Existing destination | Existing icon           |
| ------------------- | -------------------- | ----------------------- |
| Heists              | `/topics/heists`     | `icon-[lucide--lock]`   |
| Puzzles             | `/topics/puzzles`    | `icon-[lucide--puzzle]` |
| Pirates & High Seas | `/topics/pirates`    | `icon-[lucide--ship]`   |
| Running D&D         | `/topics/dnd`        | `icon-[lucide--swords]` |

Preserve the current card summaries and order. Each topic destination appears once in the default directory. Learn retains its general resources, including Answers, Devlog, Responsible AI, Import & Migrate, Castle Floorplans and My Stuff.

## Current architecture and discovery ownership

- `apps/web/src/lib/components/explore/explore-sections.ts` owns the directory's section and card data.
- `ExploreSectionList.svelte` already renders semantic section headings and a responsive card grid through `ExploreLinkCard.svelte`. A new section needs only data changes.
- `apps/web/src/routes/(marketing)/explore/+page.svelte` renders the directory when no label filter or non-empty search query is active. Its introductory description also supplies SEO metadata.
- `ExploreSearch.svelte` uses the public content aggregation and search index independently of the directory section data. Moving cards should not require search changes.
- The discovery registry already assigns `/explore` to `explore-index` in `entries/product.ts` and the four topic URLs to entries in `entries/topics.ts`. This change preserves those navigation intents and canonical URLs. Review the existing ownership before implementation and run the discovery audit; add no new route or synonym URL.

## Implementation steps

- [ ] Add focused route coverage in `explore.route.test.ts` for the Browse by Topic heading, description, placement and four destinations. Scope assertions to their containing sections and require one link per topic in the directory, with none remaining in Learn.
- [ ] Cover the meaningful alternate paths: a label view must not render the directory section; a non-empty search hides the directory, and clearing it restores Browse by Topic. Extend the existing route and search tests rather than adding a second testing abstraction.
- [ ] Move the four topic card objects from Learn into the new section in `explore-sections.ts`. Shorten their titles to the agreed labels while retaining summaries, icons and URLs.
- [ ] Update the default directory description in `+page.svelte` to include topics. Suggested final copy: “Every section of Codex Cryptica in one place: features, worlds, examples, generators, tools, topics, guides, and the campaign directory.” Update the existing metadata assertion accordingly.
- [ ] Add a brief task-focused description to the existing `getting-started` Help entry in `apps/web/src/lib/config/help-content.ts`: explain that Explore is available from the app footer or mobile menu, and that Browse by Topic leads to guides, examples and tools for a chosen subject. Verify those navigation entry points before finalising the wording.
- [ ] Check the rendered directory at mobile and desktop widths, including keyboard navigation and heading order. Reuse the existing layout without introducing CSS, dependencies, imagery or a new component unless a concrete rendering problem requires it.
- [ ] Run the implementation validation below and address concrete findings.
- [ ] Commit the implementation, push the feature branch and open a ready-for-review PR to `staging` that closes #3876.

## Constitution and style check

- **Simplicity and bounded responsibility:** use the existing app-specific data module and renderers. This navigation regrouping requires no new package, store or service.
- **Tests:** exercise rendered navigation and alternate label/search states. Avoid tests that only repeat every constant in the data table.
- **Documentation:** the section description explains its purpose on the public page; the short Help description explains how app users reach it, satisfying Constitution VII.
- **Discovery governance:** keep the existing directory and topic intent owners and canonical routes. Audit the changed public discovery surface.
- **Accessibility and style:** retain Svelte 5 patterns, semantic headings, ordinary links, Tailwind semantic tokens, existing marketing styling and Iconify classes. Keyboard interaction should remain standard link navigation.
- **Privacy:** this is static navigation; it introduces no persistence, tracking or user-data processing.

## Validation during implementation

Run only validation affected by the implementation:

1. From `apps/web`, run `bunx vitest run 'src/routes/(marketing)/explore/explore.route.test.ts' src/lib/components/explore/ExploreSearch.test.ts`. Include `ExploreLabelResults.test.ts` or other suites only if their code is changed or a regression concern warrants it.
2. At the repository root, run `bun run lint:changed` and `bun run test:changed`.
3. From `apps/web`, run `bunx svelte-check --tsconfig ./tsconfig.json --threshold error`.
4. At the repository root, run `bun scripts/discovery-audit.mjs` and record any intentional overlap judgement required by its output.
5. Apply the canonical general code review and `codex-review` specialist review to the implementation diff.
6. Before each commit or push, run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and resolve blocking introduced findings.
7. In a real browser, check `/explore` at approximately 390px and 1280px widths: section order, readable card titles, working topic links, visible keyboard focus, search-and-clear behaviour, and `/explore?label=pirate` retaining its results view.

Planning this change does not run application tests or implement these steps. The implementation is complete when all four topics appear exactly once in their new section, the alternate directory views still work, Help guidance is available, and the focused validation passes.
