# Implementation Tasks: Third-Party Image Provider

## Phase 1: State & Service Updates

- [ ] 1. Update `packages/oracle-engine/src/oracle-settings.svelte.ts` to include `imageProvider`, `customImageBaseUrl`, `customImageApiKey`, `customImageModel`.
- [ ] 2. Update `apps/web/src/lib/services/ai/image-generation.service.ts` to route requests based on provider and parse OpenAI-compatible `b64_json` responses.
- [ ] 3. Update `packages/oracle-engine/src/oracle-generator.ts` to pass the new provider settings when calling the image generation service.
- [ ] 4. Update `apps/web/src/lib/stores/world.svelte.ts` to pass the new provider settings.

## Phase 2: UI Updates

- [ ] 5. Update `apps/web/src/lib/components/oracle/OracleSettings.svelte` to add UI fields for "Image Provider" dropdown/toggle, Base URL, API Key, and Model string.

## Phase 3: Validation

- [ ] 6. Ensure `svelte-check` and `vitest run` pass.
- [ ] 7. Commit changes to branch `feature/third-party-image-provider`.
