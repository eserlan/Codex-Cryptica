# Quickstart: Vault Front Page Implementation

## 1. Local Environment Setup

- **Branch**: `077-vault-front-page`
- **Dependencies**: **Dexie 4.x** (already in `apps/web/package.json`)

## 2. Implementation Steps

1.  **Dexie Update**: Modify `apps/web/src/lib/utils/entity-db.ts`.
    - Add `vaultMetadata` table to the schema.
    - Bump to `version(4)`.
2.  **CampaignService**: Implement in `packages/vault-engine/src/services/CampaignService.ts`.
    - `getRecentActivity`: `entityDb.graphEntities.orderBy('lastModified').reverse().limit(10).toArray()`.
    - `getFrontPageEntity`: `entityDb.graphEntities.where('tags').equals('frontpage').first()`.
3.  **Components**:
    - Create `apps/web/src/lib/components/campaign/EntityCard.svelte` (Tailwind 4).
    - Create `apps/web/src/lib/components/campaign/FrontPage.svelte`.
4.  **Routing**: Update `apps/web/src/routes/(app)/vault/[id]/+page.svelte` for the landing page view.

## 3. Verification Commands

- **Unit Tests**: `npm test packages/vault-engine`
- **Dexie Validation**: Verify schema version 4 in browser DevTools.
- **Manual**: Tag an entity with `frontpage` and verify rendering.
