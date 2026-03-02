# Research: Comprehensive Help Guide Blog Post

## Core Features Status

### Vault Management

- **Status**: Stable.
- **Capabilities**:
  - Creation of multiple independent vaults.
  - Switching between vaults via the sidebar/settings.
  - Deletion of vaults (with confirmation).
- **Location**: Managed via `vault.svelte.ts` and `vault-registry.svelte.ts`.

### Sync Engine

- **Status**: Stable.
- **Capabilities**:
  - **Local Sync**: Uses Origin Private File System (OPFS) for browser-native storage.
  - **Google Drive Sync**: Direct integration with Google Drive for cloud backup and multi-device sync.
- **Location**: `packages/sync-engine/`.

### Spatial Canvas

- **Status**: Recently implemented/updated.
- **Capabilities**:
  - Node-based visualization using `@xyflow/svelte`.
  - Drag-and-drop organization.
  - Linking nodes to vault entities.
- **Location**: `packages/canvas-engine/`.

### Lore Oracle

- **Status**: Highly active.
- **Slash Commands**:
  - `/draw [subject]`: AI image generation (Advanced tier).
  - `/create "Name" [as "Type"]`: Direct entity creation.
  - `/connect "A" label "B"`: Direct connection creation.
  - `/merge "Source" into "Target"`: Entity merging.
  - `/clear`: History reset.
  - `/help`: Command reference.
- **Location**: `apps/web/src/lib/stores/oracle.svelte.ts`.

## Content Structure

The blog post will follow the `ArticleRenderer` format (Markdown + YAML Frontmatter).

### Decision: Table of Contents

- **Decision**: Include a manual Markdown Table of Contents at the top.
- **Rationale**: `ArticleRenderer` generates IDs for headings, so standard Markdown anchors (`[Title](#title)`) will work.
- **Alternatives**: Automatic TOC generator component. Rejected to keep the blog post as a simple, portable Markdown file.

### Decision: Visuals

- **Decision**: Use descriptive placeholders as per User preference.
- **Rationale**: Allows the implementation to proceed without waiting for finalized assets.
