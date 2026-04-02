# Research: Vault Front Page

## Decisions

### 1. Vault Metadata Storage

- **Decision**: Use **Dexie** (`CodexEntityDb`) to store campaign-level metadata. Add a `vaultMetadata` table to `EntityDb` in `apps/web/src/lib/utils/entity-db.ts`.
- **Rationale**: Dexie is the established modern storage layer for the project (since features 073 and 075). It provides better observability and structured indexing than raw `idb`.
- **Alternatives considered**: Legacy `idb` stores. Rejected to maintain consistency with the project's direction toward a consolidated Dexie schema.

### 2. Recent Activity Tracking

- **Decision**: Query the `graphEntities` table in **Dexie** (`CodexEntityDb`).
- **Rationale**: Feature 073 migrated all graph metadata to Dexie. The `graphEntities` table contains the `lastModified` timestamp for every entity in the vault, making it the perfect source for "Recent Activity".
- **Alternatives considered**: Querying legacy `vault_cache`. Rejected as it is being phased out in favor of Dexie.

### 3. Frontpage Tag Resolution

- **Decision**: Implement a search in `CampaignService` (new) that queries the `graphEntities` table in Dexie for the tag `frontpage`.
- **Rationale**: Consistent with how categories and connections are now handled via structured Dexie queries.

### 4. Cover Image Storage

- **Decision**:
  - **Local**: Store in a `.assets/` or `images/` folder in the vault OPFS and save the path in the Dexie `vaultMetadata` table.
  - **URL**: Save the absolute URL in the Dexie `vaultMetadata` table.
  - **AI Generated**: Use the existing `OracleService` to generate an image, save it locally to OPFS, and set its path.
- **Rationale**: Reuses the established pattern from `011-oracle-image-gen`.

### 5. UI Architecture

- **Decision**: Create a `FrontPage.svelte` component that becomes the default view of `/vault/[id]` when no specific entity is selected in the URL.
- **Rationale**: Cleanest integration into SvelteKit routing.

## Technical Unknowns

- **Dexie Schema Migration**: We need to add the `vaultMetadata` table to `EntityDb` and handle versioning correctly (bumping to version 4).
- **Activity Query Performance**: A simple `orderBy('lastModified').reverse().limit(10)` query in Dexie should be highly performant even for large vaults.
