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
11. Transition public NPC, Faction, Settlement, and Magic Item generator pages to package-backed adapters while preserving routes, SEO/discovery behavior, and primary public generation flows.
12. Add help content and optional feature hint.
13. Verify public generator pages and existing related-entity generation still work.
14. Validate the guided usability criteria and performance goals, or document justified deviations.

## Commands

```sh
bun run --filter generator-engine test
bun run --filter web test -- src/lib/components/generators
bun run --filter web test -- src/lib/stores/ui/modal-ui.svelte.test.ts
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

## Manual Smoke Test

1. Open a writable campaign.
2. Open the in-app generator workflow.
3. Generate an NPC with AI disabled and save it.
4. Confirm a new character entity exists with title, content, lore, and labels.
5. Generate a Faction from an existing source entity and save with relationship enabled.
6. Confirm the new faction exists and is connected to the source entity.
7. Switch to guest/read-only mode and confirm saving is blocked.
8. Confirm public NPC, Faction, Settlement, and Magic Item generator pages still load and generate usable output through package-backed logic.
9. Record whether the full flow can be completed in under 2 minutes and whether save-before-persist behavior is clear before clicking Save.
10. Record modal-open timing and non-AI generation timing, or document why a target is not currently measurable.
