# Quickstart: Business / Enterprise Generator

How to check the feature works end to end. The types are in [contracts/business-api.md](./contracts/business-api.md), and the rules are in [data-model.md](./data-model.md).

## Prerequisites

- `bun install` at the repo root.
- `bun run dev` in `apps/web`, for the browser checks.

## 1. Engine tests (offline)

```sh
cd packages/generator-engine
bun test src/business-
```

Expected:

- Local generation passes `checkBusiness` with 0 issues for every genre and every type in `BUSINESS_TYPES` (SC-001, SC-002).
- The management section is present exactly when `playersOwn` is on, and in that case leadership is a manager.
- A staged run with one failing stage keeps the other stages' AI sections and lists the failed stage's sections in `fallbackSections`.
- An aborted run rejects with an AbortError and doesn't fall back.
- Regenerating one section changes only that section. A renamed person's old name is replaced elsewhere (SC-005).
- The save plan marks a party whose name matches an existing title as `match` (ticked), and any other party as `create` (unticked).

## 2. Web tests

```sh
cd apps/web
bunx vitest run src/lib/services/generators/business-vault-save.test.ts \
  src/lib/components/seo/BusinessRefinePanel.test.ts \
  src/lib/components/generators/BusinessSaveStep.test.ts \
  src/lib/components/entity-detail/GenerateBusinessButton.test.ts
```

Expected:

- A save creates one Faction, the ticked Characters and the ticked party links.
- An `addConnection` failure removes every entity created in that save (rollback).
- The button appears only on Location, Character and Faction entities.

## 3. Public page (browser)

1. Open `/generators/business` logged out, choose cyberpunk and check the type list shows cyberpunk businesses. Generate with AI off. A full business appears straight away.
2. Turn on **Players own this business** and generate. Leadership is a manager, and a management section appears with no prices.
3. Regenerate **Current pressure** with a steer. Only the pressure changes.
4. Regenerate the owner. The new name replaces the old one in the hooks and the secret.
5. Save to the vault. In the app, the business appears as a Faction, with the owner and staff linked by _owned by_ and _employs_.

## 4. In-app (browser)

1. Open a Location entity and press **Generate a business here**. The location pre-fills, and the save step offers _located in_ that location.
2. Name an existing faction in the campaign context, generate until it appears as a relationship, and open the save step. A link to the existing faction is offered and ticked. Any party with no match is offered as new and unticked.
3. Turn on AI Disabled in settings. The AI controls disappear, and generation and regeneration still work from local tables.

## 5. Gates

```sh
bun scripts/lint-changed.mjs
bun scripts/test-changed.mjs
(cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error)
bun scripts/discovery-audit.mjs
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

Expected: 0 errors in each, discovery audit with no errors, and a fallow verdict of `pass`.
