# Getting Started Blog Image Shot List

Companion image brief for `apps/web/src/lib/content/blog/getting-started-guide.md` and the shorter in-app help intro at `apps/web/src/lib/content/help/intro.md`.

Use Cloudflare image asset paths under `https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/`. The filenames below match the final URLs currently referenced by the content files.

## General Direction

- Use real product screenshots where possible. Prefer accurate UI over decorative fantasy art.
- Keep the visible vault small and understandable: 3–8 entities is enough.
- Use the same example world across shots where possible:
  - `Eldrin`
  - `Kingdom of Aethel`
  - one faction
  - one current conflict or mystery
- Avoid spoilers, copyrighted settings, real customer data, or private campaign text.
- Keep browser chrome out of the image unless it helps explain browser-local storage.
- Use a clean viewport, readable type, and enough whitespace for blog rendering.
- Prefer dark/neutral app appearance unless a specific feature needs stronger contrast.

## Blog Shot List

### 1. Dashboard / Campaign Workspace

- **Asset path**: `/images/blog/getting-started/dashboard.jpg`
- **Current title**: `Codex Cryptica dashboard and campaign workspace`
- **Purpose**: Establish what Codex Cryptica looks like and reassure first-time users that it is a workspace, not just a chat or generator.
- **What it should show**:
  - Main app shell with activity bar visible.
  - A small campaign vault open.
  - Explorer/sidebar with a few entities.
  - Main graph or front page area visible.
  - Optional entity detail panel open with readable Chronicle text.
- **Avoid**:
  - Dense production vaults.
  - AI panels as the main focus.
  - Empty or loading states.

### 2. New Vault / Empty Workspace

- **Asset path**: `/images/blog/getting-started/new-vault.jpg`
- **Current title**: `Create a new local campaign vault`
- **Purpose**: Support the first quick-start action: creating or initializing a vault.
- **What it should show**:
  - Vault menu or new-vault flow.
  - Clear “New Vault” / create-vault affordance.
  - Empty or near-empty workspace behind it.
  - A name like `Aethel Campaign` or `Getting Started Vault`.
- **Avoid**:
  - Settings panels unrelated to vault creation.
  - Import-heavy UI; this shot is about starting from scratch.

### 3. Create Entity

- **Asset path**: `/images/blog/getting-started/create-entity.jpg`
- **Current title**: `Create your first campaign entity`
- **Purpose**: Make the “create your first cast member” step concrete.
- **What it should show**:
  - Create entity modal/sheet or sidebar flow.
  - Entity type/category set to `Character`.
  - Title field containing `Eldrin`.
  - Save/create button visible.
  - Explorer visible enough to show where the new entity will appear.
- **Avoid**:
  - Advanced template options dominating the shot.
  - AI generation UI; this is manual creation.

### 4. Chronicle Writing and Linking

- **Asset path**: `/images/blog/getting-started/chronicle-linking.jpg`
- **Current title**: `Write a Chronicle and link new lore as you type`
- **Purpose**: Explain the core writing workflow: Chronicle text plus linked entity names.
- **What it should show**:
  - `Eldrin` open in the entity detail panel or Zen/editor view.
  - Chronicle field in focus.
  - Example sentence visible:
    `A legendary mage living in [[Kingdom of Aethel]].`
  - If the UI supports unresolved/draft link visuals, show that state clearly.
  - If the UI only links existing entities, use an already-created `Kingdom of Aethel` and show the linked/read-mode highlight instead.
- **Avoid**:
  - Long walls of text.
  - Lore/secret fields as the main visual.
  - Misrepresenting automatic entity creation behavior.

### 5. Connected Graph Payoff

- **Asset path**: `/images/blog/getting-started/connected-graph.jpg`
- **Current title**: `See linked entities appear in the living lore graph`
- **Purpose**: Show the payoff from writing and linking: the world becomes navigable.
- **What it should show**:
  - Graph view with `Eldrin` connected to `Kingdom of Aethel`.
  - One or two additional nearby entities for context.
  - Entity labels readable.
  - A selected node with detail sidebar open if it improves orientation.
- **Avoid**:
  - Large graph hairballs.
  - Layouts where the example connection is hard to see.

### 6. Entity Table

- **Asset path**: `/images/blog/getting-started/entity-table.jpg`
- **Current title**: `Review your campaign as a sortable entity table`
- **Purpose**: Show that Codex supports structured review, not only graph exploration.
- **What it should show**:
  - Table view with rows for the example entities.
  - Visible columns for title/type/modified/connections or similar.
  - Search/filter/sort controls if present.
  - At least one row with connection count visible.
- **Avoid**:
  - Huge tables with unreadable rows.
  - Debug/test data.

### 7. Optional Lore Oracle

- **Asset path**: `/images/blog/getting-started/oracle-chat.jpg`
- **Current title**: `Use the optional Lore Oracle when you want AI assistance`
- **Purpose**: Present AI as optional assistance, not a required setup step.
- **What it should show**:
  - Oracle/chat panel open.
  - A prompt relevant to the tiny example vault, such as asking for plot hooks involving Eldrin and Aethel.
  - A concise, grounded response.
  - Nearby context chips/entities if the UI shows them.
- **Avoid**:
  - Making AI look mandatory.
  - Showing API keys or settings secrets.
  - Long generated text that overwhelms the screenshot.

## Help Intro Shot List

The help intro uses fewer images to stay lightweight.

### 1. Help Dashboard

- **Asset path**: `/images/help/getting-started/dashboard.jpg`
- **Current title**: `Codex Cryptica campaign workspace`
- **Recommended source**: Same composition as the blog dashboard, cropped tighter if needed.

### 2. Help First Entity

- **Asset path**: `/images/help/getting-started/first-entity.jpg`
- **Current title**: `Create your first entity`
- **Recommended source**: Same source as the blog create-entity shot, cropped to the create flow.

### 3. Help Graph

- **Asset path**: `/images/help/getting-started/graph.jpg`
- **Current title**: `Open the graph to see how your lore connects`
- **Recommended source**: Same source as the blog connected-graph shot, cropped to keep the graph readable in the help panel.

## Production Checklist

- [ ] Upload each final screenshot/illustration at the exact asset path listed above.
- [ ] Confirm final files exist at the paths referenced above.
- [ ] Confirm rendered images are legible at blog width and help-panel width.
- [ ] Confirm each image accurately matches current app behavior.
- [ ] Confirm no private vault data, API keys, emails, or personal identifiers are visible.
- [ ] Update this file if any image path changes.
