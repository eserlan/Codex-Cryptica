# Quickstart: In-App RPG Generators

## Goal

Implement a native campaign generator workflow for NPC, Faction, Settlement, and Magic Item drafts.

## Implementation Order

1. Create `packages/generator-engine` with package metadata, TypeScript config, Vitest config, and public exports.
2. Add failing tests for the campaign generator registry and output-to-draft mapping in `packages/generator-engine`.
3. Implement the registry and mapping service over the existing generator logic.
4. Add failing tests for draft generation success, invalid generator id, AI-disabled local fallback, minimal AI context, blocked saves, and no `localStorage` transfer.
5. Implement campaign draft generation and save orchestration in `packages/generator-engine`.
6. Add a minimal lazy-loadable modal stub, then add modal store state and lazy-load the generator modal through `GlobalModalProvider`.
7. Build the native Svelte 5 modal flow: select generator, configure options, generate, review, save.
8. Add failing tests for save success, save failure preserving draft, guest/read-only/unavailable blocked save, cancellation/no-save, and optional source relationship.
9. Wire direct vault save through injected vault APIs.
10. Add theme-default mapping tests and implementation.
11. Build the bounded vault context packet in the web app layer, including resolved entity template outline/source, and pass it into package services as plain data.
12. Route existing entity sidebar and Zen Mode Generate Related buttons into the unified generator workflow with source entity context.
13. Retire the standalone related-entity modal or reduce it to a compatibility wrapper after contextual parity is covered.
14. Transition public NPC, Faction, Settlement, and Magic Item generator pages to package-backed adapters while preserving routes, SEO/discovery behavior, and primary public generation flows.
15. Add help content and optional feature hint.
16. Verify public generator pages and existing Generate Related entry points still work through the unified workflow.
17. Validate the guided usability criteria and performance goals, or document justified deviations.

## Commands

```sh
bun run --filter generator-engine test
bun run --filter web test -- src/lib/components/generators
bun run --filter web test -- src/lib/services/generators/generator-vault-context.test.ts
bun run --filter web test -- src/lib/stores/ui/modal-ui.svelte.test.ts
bun run --filter web test -- src/lib/components/entity-detail/DetailStatusTab.test.ts
bun run --filter web test -- src/lib/components/zen/ZenContent.related.test.ts
bun run --filter web test -- 'src/routes/(marketing)/generators/[slug]/generators.test.ts'
bun run --filter web test -- src/lib/services/seo/generator-engine.test.ts
bun run --filter '*' lint:types
bun run --filter '*' lint
bun run --filter '*' test -- --changed
```

## Design Constraints

- Use Svelte 5 runes.
- Use Tailwind 4 semantic tokens.
- Use Iconify utility classes, not `lucide-svelte` components.
- Keep app chrome neutral; use world-theme tokens only inside campaign content surfaces.
- Use constructor-based dependency injection for new services.
- Keep generator contracts, registry, theme defaults, AI policy, draft mapping, public-page adapters, and save orchestration in `packages/generator-engine`.
- Preserve public generator routes, SEO/discovery behavior, and primary public generation flows while transitioning them to package-backed logic.
- Treat Generate Related as a contextual entry point into the unified generator workflow, not as a separate long-term modal.
- Build vault context in the web app layer; `packages/generator-engine` receives only a bounded plain-data packet.
- Cap source and neighbor excerpts before package generation. Do not pass full vault maps, full graph state, API keys, or full lore fields.
- Resolve templates in the web app layer using the same behavior as manual entity creation, including `.cc/templates/` and `.codex/templates/` custom overrides.
- Apply resolved templates to generated campaign drafts by default, while allowing template application to be disabled before save.
- Keep generated drafts transient until explicit save.
- Do not use `localStorage` as an import bridge.
- Use labels, not tags.
- Do not send full vault contents to AI by default.

## Accessibility Notes

- Use semantic forms with visible labels.
- Group related options with fieldsets/legends where appropriate.
- Prefer radio buttons for small exclusive option sets and selects for longer lists.
- Let submit trigger validation; disable only during in-flight generation/save to prevent duplicate submissions.
- Preserve keyboard navigation and focus visibility.
- Make cancel/close behavior explicit and non-destructive.

## Vault Context Packet Builder

Build the packet in `apps/web/src/lib/services/generators/generator-vault-context.ts` from injected dependencies so it can be tested without global store coupling.

Construction steps:

1. Start with theme/schema context: active theme id/name, selected target category, available category labels, resolved template outline, template source, and whether template application is enabled.
2. If launched from Generate Related, add the selected source entity as a capped excerpt with title, type, content excerpt, optional lore excerpt, and labels.
3. Gather directly connected outbound and inbound neighbors from the source entity.
4. Rank neighbors by direct relationship presence, meaningful content, and labels; keep a small capped set.
5. Convert neighbors to capped excerpts with title, type, relationship label, content excerpt, optional lore excerpt, and bounded labels.
6. Add bounded existing-title hints for duplicate avoidance and bounded label suggestions.
7. Produce an `includedContext` summary for the UI, grouped as theme, schema, template, source, neighbors, titles, and labels.
8. Let the user remove optional source or neighbor context before AI-backed generation.
9. Let the user inspect whether a system or vault-custom template will be applied and disable template application for the draft.
10. Pass the final packet to package services. Never pass the full `vault.entities`, full graph, full lore corpus, file handles, or live stores.

## Manual Smoke Test

1. Open a writable campaign.
2. Open the in-app generator workflow.
3. Generate an NPC with AI disabled and save it.
4. Confirm a new character entity exists with title, content, lore, and labels.
5. Click Generate Related from an existing source entity and save a Faction with relationship enabled.
6. Confirm the new faction exists and is connected to the source entity.
7. Switch to guest/read-only mode and confirm saving is blocked.
8. Confirm public NPC, Faction, Settlement, and Magic Item generator pages still load and generate usable output through package-backed logic.
9. Record whether the full flow can be completed in under 2 minutes and whether save-before-persist behavior is clear before clicking Save.
10. Record modal-open timing and non-AI generation timing, or document why a target is not currently measurable.
11. Confirm the Generate Related action no longer needs a standalone related-entity modal to complete contextual generation.
12. Confirm AI-backed contextual generation shows included context categories and excludes full vault contents by default.
13. Confirm generated campaign drafts preserve resolved template headings when template application is enabled.
14. Confirm a custom `.cc/templates/{type}.md` or `.codex/templates/{type}.md` file takes precedence over the system template.
