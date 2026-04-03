# Research: Vault Front Page

## Decisions

### 1. Vault Metadata Storage

- **Decision**: Use **Dexie** (`CodexEntityDb`) to store campaign-level metadata. Add a `vaultMetadata` table to `EntityDb` in `apps/web/src/lib/utils/entity-db.ts`.
- **Rationale**: Dexie is the established modern storage layer for the project (since features 073 and 075). It provides better observability and structured indexing than raw `idb`.
- **Alternatives considered**: Legacy `idb` stores. Rejected to maintain consistency with the project's direction toward a consolidated Dexie schema.

### 2. Recent Activity Tracking

- **Decision**: Query the `graphEntities` table in **Dexie** (`CodexEntityDb`).
- **Rationale**: Feature 073 migrated all graph metadata to Dexie. The `graphEntities` table contains the `lastModified` timestamp for every entity in the vault, making it the perfect source for relevant entities and the frontpage marker.
- **Alternatives considered**: Querying legacy `vault_cache`. Rejected as it is being phased out in favor of Dexie.

### 3. Frontpage Tag Resolution

- **Decision**: Implement a search in `CampaignService` and `ActivityService` that queries the `graphEntities` table in Dexie for `frontpage` markers in both tags and labels.
- **Rationale**: Consistent with how categories and connections are handled via structured Dexie queries, while still remaining tolerant of older content shapes.

### 4. Cover Image Storage

- **Decision**:
  - **Local**: Store in a `.assets/` or `images/` folder in the vault OPFS and save the path in the Dexie `vaultMetadata` table.
  - **AI Generated**: Use the existing `OracleService` to generate an image, save it locally to OPFS, and set its path.
- **Rationale**: Reuses the established pattern from `011-oracle-image-gen` while keeping cover art local-first. The shipped UI uses drag-and-drop replacement and omits direct URL entry.

### 5. UI Architecture

- **Decision**: Create a `FrontPage.svelte` component that renders as a landing overlay in the workspace shell, with the direct vault route also rendering the entity detail panel when a node is selected.
- **Rationale**: This lets the user dismiss the front page, return to the graph, and still access entity details on the direct vault route without a separate page transition.

### 6. AI Prompt Context

- **Decision**: Feed the active theme name and theme-specific thematic description into both summary and image-generation prompts.
- **Rationale**: The front page should sound and look like the world it represents, not just a generic text block.

## Technical Unknowns

- **Dexie Schema Migration**: We need to add the `vaultMetadata` table to `EntityDb` and handle versioning correctly (bumping to version 4).
- **Activity Query Performance**: A simple `orderBy('lastModified').reverse().limit(10)` query in Dexie should be highly performant even for large vaults.
