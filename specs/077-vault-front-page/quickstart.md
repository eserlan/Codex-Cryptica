# Quickstart: Vault Front Page Implementation

## 1. Local Environment Setup

- **Branch**: `077-vault-front-page`
- **Dependencies**: **Dexie 4.x** (already in `apps/web/package.json`)

## 2. Implementation Steps

1.  **Dexie Update**: Modify `apps/web/src/lib/utils/entity-db.ts`.
    - Add `vaultMetadata` table to the schema.
    - Bump to `version(4)`.
2.  **CampaignService**: Implement in `packages/vault-engine/src/services/CampaignService.ts`.
    - `getRecentActivity`: query recent entities, pin any `frontpage`-marked records, and include title/type/image metadata.
    - `getFrontPageEntity`: query `entityDb.graphEntities` for `frontpage` markers in both tags and labels, then use the newest match.
    - `generateCoverImage`: feed the current summary and theme context into the image prompt, then persist the generated asset locally.
3.  **Components**:
    - Create `apps/web/src/lib/components/campaign/EntityCard.svelte` for relevant entities.
    - Create `apps/web/src/lib/components/campaign/FrontPage.svelte` for the landing overlay, summary editor, cover art, and lightbox.
    - Keep the direct vault route wired to the entity detail panel so card clicks have a visible destination.
4.  **Routing**: Update `apps/web/src/routes/(app)/+page.svelte` and `apps/web/src/routes/(app)/vault/[id]/+page.svelte` for the landing overlay and direct-vault detail flow.

## 3. Verification Commands

- **Unit Tests**: `npm test`
- **Dexie Validation**: Verify schema version 4 in browser DevTools.
- **Manual**: Tag an entity with `frontpage`, confirm it pins to the top of relevant entities, and verify summary/cover generation still works.
