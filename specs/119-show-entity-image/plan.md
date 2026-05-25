# Implementation Plan: Show Entity Image to Guests

**Branch**: `119-show-entity-image` | **Date**: 2026-05-25 | **Spec**: [spec.md](file:///home/espen/proj/remotecodexarcana/specs/119-show-entity-image/spec.md)
**Input**: Feature specification from `/specs/119-show-entity-image/spec.md`

## Summary

Implement a mechanism for a host to broadcast an entity's image to all connected guests over P2P using the existing `SHOW_TOKEN_IMAGE` protocol. We will add a "Show to Guests" action button in `DetailImage.svelte` and the full-screen `ZenImageLightbox.svelte` for hosts, extend the reactive `VTTMediaManager` to handle sharing arbitrary entity images, and move the `VTTSharedImageLightbox` receiver to a global layout context so guests receive shared images immediately on any page.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace
**Primary Dependencies**: Svelte 5, SvelteKit, PeerJS, existing VTT stores, Tailwind 4 semantic tokens
**Storage**: N/A (Transient real-time broadcast and UI states)
**Testing**: Vitest unit tests in `map-session.test.ts` for the media manager and image broadcast; manual verification using multiple browser windows
**Target Platform**: Browser (desktop/mobile layout compatible)

## Constitution Check

- **Library-First**: PASS. Image-sharing logic is implemented in the headless VTT media manager and protocol stores (`vtt-media-manager.svelte.ts`), while the UI handles invocation and rendering.
- **TDD**: PASS. Unit tests will be updated/added alongside the implementation to cover the success path for arbitrary image sharing.
- **Simplicity & YAGNI**: PASS. Reuses the existing `SHOW_TOKEN_IMAGE` VTT protocol type, `VTTSharedImageLightbox`, and lightbox store mechanisms; no new network message types or database structures are introduced.
- **Dependency Injection**: PASS. Uses the existing constructor dependencies for VTT managers.
- **Natural Language**: PASS. UI prompts and notification copy use clear and plain terminology: "Show to Guests" and "Shared image with guests".

## Project Structure

### Documentation (this feature)

```text
specs/119-show-entity-image/
├── plan.md              # This file
├── checklists/
│   └── requirements.md  # Quality checklist
└── spec.md              # Feature specification
```

### Source Code

#### apps/web/src/

```text
lib/
├── components/
│   ├── entity-detail/
│   │   └── DetailImage.svelte      # Add "Show to Guests" button for host detail view
│   ├── zen/
│   │   └── ZenImageLightbox.svelte  # Add "Share with Guests" button for host expanded view
│   └── vtt/
│       └── VTTSharedImageLightbox.svelte # Guest side listener (unchanged logic)
├── stores/
│   ├── ui/
│   │   └── modal-ui.svelte.ts       # Track original imagePath in lightbox state
│   └── vtt/
│       ├── map-session-facade.ts    # Expose showImageToPlayers
│       └── vtt-media-manager.svelte.ts # Add showImageToPlayers method
routes/
└── (app)/
    ├── +layout.svelte               # Render VTTSharedImageLightbox globally for guests
    └── map/
        └── +page.svelte             # Remove VTTSharedImageLightbox from page level
```

**Structure Decision**: Keep VTT message generation in the VTT media manager layer, while routing components directly in SvelteKit layout so image rendering is globally responsive.

## Proposed Changes

### VTT Media Manager

#### [MODIFY] [vtt-media-manager.svelte.ts](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/stores/vtt/vtt-media-manager.svelte.ts)

- Add `showImageToPlayers(title: string, imagePath: string)` method that emits a `SHOW_TOKEN_IMAGE` message.

#### [MODIFY] [map-session-facade.ts](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/stores/vtt/map-session-facade.ts)

- Expose `showImageToPlayers(title: string, imagePath: string)` to call the media manager method.

#### [MODIFY] [map-session.test.ts](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/stores/map-session.test.ts)

- Add unit test verifying that `store.showImageToPlayers(title, imagePath)` broadcasts the message.

### Lightbox State and Layout

#### [MODIFY] [modal-ui.svelte.ts](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/stores/ui/modal-ui.svelte.ts)

- Add `imagePath: string` to the `lightbox` state structure and populate it in `openLightbox`.

#### [MODIFY] [DetailImage.svelte](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/components/entity-detail/DetailImage.svelte)

- Pass `entity.image` as the fourth parameter to `modalUIStore.openLightbox`.
- Render a "Show to Guests" action button if `p2pHost.isHosting` is true and `entity.image` is set.

#### [MODIFY] [ZenImageLightbox.svelte](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/components/zen/ZenImageLightbox.svelte)

- Render a "Share with Guests" button in the top right controls if `p2pHost.isHosting` is true.

#### [MODIFY] [+layout.svelte](<file:///home/espen/proj/remotecodexarcana/apps/web/src/routes/(app)/+layout.svelte>)

- Render `<VTTSharedImageLightbox>` globally for guests if `sessionModeStore.isGuestMode` is true.

#### [MODIFY] [+page.svelte](<file:///home/espen/proj/remotecodexarcana/apps/web/src/routes/(app)/map/+page.svelte>)

- Remove the `<VTTSharedImageLightbox>` element from the `/map` page.

## Verification Plan

### Automated Tests

- Run `bun run test` to verify `map-session.test.ts` and all existing unit tests pass.
- Run `bun run lint` to ensure code conforms to project rules.

### Manual Verification

1. Start the local server (`bun run dev`).
2. Open host window and start hosting P2P session.
3. Open guest window in incognito/separate browser and connect using host's connection ID.
4. Navigate guest to a non-map route (e.g. `/vault`).
5. As host, open an entity detail sidebar with an image, click "Show to Guests".
6. Verify a success toast "Shared image with guests" appears on the host's screen.
7. Verify a full-screen lightbox immediately opens on the guest's screen displaying the shared image and entity title.
8. Test that the guest can dismiss the lightbox cleanly.
9. Verify the same behavior when sharing from the full-screen Zen lightbox view.
