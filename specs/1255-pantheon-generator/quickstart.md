# Developer Quickstart: Pantheon / God Generator

**Branch**: `1255-pantheon-generator` | **Date**: 2026-06-11
**Feature**: [spec.md](file:///home/espen/proj/remotecodexarcana/specs/1255-pantheon-generator/spec.md)

## Implementation Steps

### 1. Business Logic

Create `apps/web/src/lib/services/seo/generators/pantheon.ts` and define:

- `pantheonConfig` with values for genres, types, domains, tones, worshippers, and conflict themes.
- Local fallback logic generating names and content arrays.
- `generatePantheon` (which handles both single deity and small pantheon generation).

Register it in:

- `apps/web/src/lib/services/seo/generator-engine.ts`

### 2. Svelte Components & Routing

Create `apps/web/src/lib/components/seo/PantheonFormFields.svelte` with:

- Toggles between "Single Deity" and "Small Pantheon".
- Interactive dropdown selects mapping to configuration parameters.
- Textarea for optional campaign context.
- "Surprise Me" randomization button.

Update `apps/web/src/routes/(marketing)/generators/[slug]/+page.ts` to include:

- `"pantheon-generator"` and `"god-generator"` in `validSlugs` and entries.

Update `apps/web/src/routes/(marketing)/generators/[slug]/+page.svelte` to:

- Bind state variables for the new form fields.
- Map the layouts and generate handler functions.

### 3. Verification

Run unit tests:

```bash
bun test generator-engine.test.ts
```

Run linter:

```bash
bun run lint
```
