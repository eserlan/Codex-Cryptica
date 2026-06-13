# Quickstart: In-App RPG Generators

## Goal

Implement a native campaign generator workflow for NPC, Faction, Settlement, and Magic Item drafts.

## Implementation Order

1. Add failing tests for the campaign generator registry and output-to-draft mapping.
2. Implement the registry and mapping service over the existing generator engine.
3. Add failing tests for draft generation success, invalid generator id, and AI-disabled local fallback.
4. Implement campaign draft generation orchestration.
5. Add modal store state and lazy-load the generator modal through `GlobalModalProvider`.
6. Build the native Svelte 5 modal flow: select generator, configure options, generate, review, save.
7. Add failing tests for save success, save failure preserving draft, guest/read-only blocked save, cancellation/no-save, and optional source relationship.
8. Implement direct vault save through existing vault APIs.
9. Add theme-default mapping tests and implementation.
10. Add help content and optional feature hint.
11. Verify public generator pages and existing related-entity generation still work.

## Commands

```sh
bun run --filter web test -- src/lib/services/generators
bun run --filter web test -- src/lib/components/generators
bun run --filter web test -- src/lib/stores/ui/modal-ui.svelte.test.ts
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
8. Confirm public generator pages still load.
