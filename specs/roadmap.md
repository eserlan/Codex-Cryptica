# Codex Cryptica Product & Feature Roadmap

This document maps the evolution of Codex Cryptica from its architectural foundations to its current decoupled Svelte/P2P capabilities, concluding with proposed future specifications.

---

## 🚀 Future Roadmap & Proposals

The following high-impact candidate specifications target performance, scaling, and multiplayer resilience in local-first environments.

### [PROPOSED] Default Entity Templates with Local Overrides

- **Target Area**: Entity Creation & Vault-Level Templates (`apps/web/src/lib/stores/vault/` & `packages/vault-engine/`)
- **Objective**: Standardize entity creation with high-quality default Markdown templates, while allowing vault-specific customization and theme-adapted templates.
- **Details**: Pre-populates newly created Character, Faction, Location, Item, Event, Creature, or Note entities with beautiful default markdown structures (like Goals, Secrets, and Story Hooks). Provides a visual toggle to disable template populating. Supports vault-level overrides via local markdown files in `.cc/templates/{type}.md` (case-insensitive conversion). Adapts default structures dynamically to configured world genres (e.g., High-Fantasy vs. Cyberpunk). Detailed in [123-entity-templates](./123-entity-templates/spec.md).

---

### [PROPOSED] Direct P2P Audio/Video Integration

- **Target Area**: P2P Networking & VTT UI (`apps/web/src/lib/services/p2p/`)
- **Objective**: Implement decentralized, low-latency voice and video channels directly on the tactical map view.
- **Details**: Leverages CC's decoupled PeerJS network topology to transmit audio/video stream tracks in real-time, completely bypassing centralized routing. Includes adaptive frame rates, audio-only fallbacks, and floating Svelte 5 overlay components. Detailed in [p2p_audio_video_analysis.md](./p2p_audio_video_analysis.md).

---

## 🏛️ Historical Roadmap & Release Timeline

### v0.27.0 — The Themed Generators & World Chronology Update (2026-06-22)

- **Highlights**: Full calendar and agenda chronology view (mobile swipe navigation, year-wheel picker, double-click-to-create events); themed generator hubs and content packs for Western, Steampunk, Lancer, Space Opera, Optimistic Sci-Fi, Cyberpunk, and Vampire settings via nested `/generators/[theme]` routes; a dedicated Entity Explorer desktop workspace with navigation history and keyboard shortcuts; entity revision through the Gemini Interactions API; new/enhanced world textures and an authentic Pip-Boy CRT theme; and a re-engineered graph load pipeline (`LoadPhase` state machine + typed `LayoutRequest`) with a graph-controls/footer overlap fix.
- **Associated Specifications**:
  - [132-calendar-agenda-view](./132-calendar-agenda-view/spec.md) (World chronology calendar and agenda view)
  - [133-entity-explorer-layout](./133-entity-explorer-layout/spec.md) (Entity Explorer desktop workspace)
  - [134-entity-navigation-history](./134-entity-navigation-history/spec.md) (Entity navigation history and shortcuts)

### v0.26.3 — The Grounded Context-Aware Entity Creator Update (2026-05-30)

- **Highlights**: Branch campaign settings organically using a new 'Generate Related' action that gathers the active entity and its first-degree graph neighbors to draft grounded entities, with outline templates integration, adaptive relationship suggestions, and automatic directed back-linking in the vault.
- **Associated Specifications**:
  - [127-context-aware-entity-generator](./127-context-aware-entity-generator/spec.md) (Grounded context-aware related entity creator, adaptive suggestions, and directed connection back-linking)

### v0.26.2 — The Vault Save Confidence & Chronology Quality Update (2026-05-26)

- **Highlights**: Silent validation of local directory permission on app startup to prevent intrusive picker prompts, direct UI action to grant permissions, a 3-second transient visual confirmation for folder saves, and a non-blocking 5-second save-drain timeout when switching vaults.
- **Associated Specifications**:
  - [121-vault-load-save-confidence](./121-vault-load-save-confidence/spec.md) (Vault folder operations clarity, safety, and permission recovery)

### v0.26.1 — The Nested Entities & Explorer Polish Update (2026-05-26)

- **Highlights**: Deep folder tree nesting up to 8 levels, fully re-engineered native drag-and-drop workspace organization with cycle validation and dedicated root drop zone, inline subfolder/child entity creation, standard list item layout ARIA accessibility restructure, and cache reload persistence.
- **Associated Specifications**:
  - [120-explorer-nested-entities](./120-explorer-nested-entities/spec.md) (Logical parent-child nesting, inline creation, re-parenting, and drag-and-drop mechanics)

### v0.26.0 — The Multi-Sensory & Interactive Chronology Update (2026-05-25)

- **Highlights**: Fully voiced entity quotes (Sound Bites) via Gemini 2.5 Flash Preview with 28 voices, real-time audio broadcasting, P2P image sharing and lightbox sync, tactile scroll-wheel timeline picker, and relationship graph important node markers.
- **Associated Specifications**:
  - [116-scroll-wheel-date-picker](./116-scroll-wheel-date-picker/spec.md) (Tactile scroll-wheel date picker)
  - [118-graph-important-label](./118-graph-important-label/spec.md) (Graph important node markers and indicators)
  - [119-sound-bite](./119-sound-bite/spec.md) (Interactive Sound Bite generation and customization)
  - [119-show-entity-image](./119-show-entity-image/spec.md) (Real-time P2P host-to-guest image sharing and lightbox)

### v0.25.1 — The Autotagging & Search Autocomplete Update (2026-05-24)

- **Highlights**: Automatic temporal autotagging for historical entities, optimized search input tag autocomplete, and intelligent re-triggering of label selectors.
- **Associated Specifications**:
  - [112-autotag-entities-end-date](./112-autotag-entities-end-date/spec.md) (Historical temporal entity autotagging)

### v0.25.0 — The Art Direction Update (2026-05-23)

- **Highlights**: Deterministic default Art Direction for AI image generation across Oracle entity/chat draw flows and front page cover art. The resolver now applies entity-specific art direction, normal user-authored art direction content, category composition defaults, active theme Default Art Style, and a global Codex Cryptica fallback. Category defaults tailor composition for characters, creatures, locations, items, factions, events, notes, and world covers, while `/draw` category hints fill gaps without overriding matched entity metadata. Custom art direction remains lore-native through ordinary notes/entities rather than a dedicated settings editor.
- **Associated Specifications**:
  - [115-default-art-prompts](./115-default-art-prompts/spec.md) (Default art prompt resolver, category/theme defaults, draw-command category hints, and lore-native art direction content)

### v0.24.0 — The Dual-Layer Theming & Chrome Stabilization Update (2026-05-23)

- **Highlights**: Separate global app appearance layers (neutral light, neutral dark, and system matching device preferences) and vault-specific world theme genre layers. Fully neutralized, stable, and texture-free app chrome (headers, sidebar panels, settings screens, and status indicators) that remains consistent when changing or previewing campaign genres, with strict color/font isolation for all chrome controls. Support for dynamic light and dark counterpart resolution for all 10 selectable world themes.
- **Associated Specifications**:
  - [113-neutral-world-theming](./113-neutral-world-theming/plan.md) (Dual-layer app appearance and world themes with stable chrome controls)

### v0.23.0 — The Animated Transitions & State Persistence Update (2026-05-22)

- **Highlights**: Animated entity detail panel opening (scaling/translating from click location), native bottom sheet panel transitions on mobile viewports, seamless content cross-fading on internal details navigation, graph node selection pulse animations, and vault-scoped browser state persistence and layout restoration.
- **Associated Specifications**:
  - [110-animate-node-opening](./110-animate-node-opening/spec.md) (Entity detail panel and graph node selected transitions)
  - [114-app-state-persistence](./114-app-state-persistence/spec.md) (Browser state persistence and layout restoration)

### v0.22.0 — The Spatial & Scratchpad Update (2026-05-22)

- **Highlights**: QuickNote scratchpad, AI-driven entity synthesis/elevation, full Svelte 5 Rune conversion, progressive background search worker, and decoupled P2P network services.
- **Associated Specifications**:
  - [097-oracle-executor-decoupling](./097-oracle-executor-decoupling/spec.md) (Command-specific Oracle executors and faster command routing)
  - [098-p2p-host-service-decoupling](./098-p2p-host-service-decoupling/spec.md) (Host service split into transport, dispatcher, and handlers)
  - [099-map-session-decomposition](./099-map-session-decomposition/spec.md) (Map session store split into focused managers)
  - [100-guest-service-decoupling](./100-guest-service-decoupling/spec.md) (Guest service split into transport, dispatcher, and handlers)
  - [101-ui-store-decoupling](./101-ui-store-decoupling/spec.md) (UI store split into focused per-feature stores)
  - [102-oracle-store-decoupling](./102-oracle-store-decoupling/spec.md) (Oracle store facade backed by focused reactive managers)
  - [103-map-page-decomposition](./103-map-page-decomposition/spec.md) (Map page controller/store decomposition)
  - [104-peerjs-connection-manager](./104-peerjs-connection-manager/spec.md) (Centralized PeerJS lifecycle, handshake, heartbeat, and retry state machine)
  - [105-p2p-transport-integration](./105-p2p-transport-integration/spec.md) (Host/guest service integration and reactive connection status UI)
  - [106-progressive-worker-search](./106-progressive-worker-search/spec.md) (Background search indexing via Comlink/Web Workers)
  - [108-rune-hardening](./108-rune-hardening/spec.md) (Full Svelte 5 Rune conversion for all apps/web stores)
  - [109-quicknote-scratchpad](./109-quicknote-scratchpad/spec.md) (QuickNote scratchpad and AI elevation)
- **Related Non-Spec Work**:
  - Oracle `ChatMessage` controller extraction and [chat message decomposition analysis](../docs/CHAT_MESSAGE_ANALYSIS.md)
  - Speckit command and skill restoration across `.gemini`, `.agents`, `.claude`, `.qwen`, and `.specify`

### v0.21.0 — The Mobile Ergonomics Update (2026-04-26)

- **Highlights**: Compact mobile menus, real-time campaign-level entity counts, keyless AI node merging.
- **Associated Specifications**:
  - [092-approve-draft-entities](file:///home/espen/proj/Codex-Arcana/specs/092-approve-draft-entities/spec.md) (Draft approvals)
  - [095-ai-regen-button](file:///home/espen/proj/Codex-Arcana/specs/095-ai-regen-button/spec.md) (Inline AI regeneration drafts)
  - [096-gdrive-cloud-sync](file:///home/espen/proj/Codex-Arcana/specs/096-gdrive-cloud-sync/spec.md) (Cloud sync reliability)

### v0.20.0 — The Aesthetic Graph Update (2026-04-21)

- **Highlights**: Themed, color-tinted nodes, tighter graph cluster layouts, compact zen writing panel.
- **Associated Specifications**:
  - [049-theme-based-jargon](file:///home/espen/proj/Codex-Arcana/specs/049-theme-based-jargon/spec.md) (Contextual themes)
  - [071-zenmode-refactor](file:///home/espen/proj/Codex-Arcana/specs/071-zenmode-refactor/spec.md) (Streamlined text interfaces)
  - [080-fantasy-theme-refresh](file:///home/espen/proj/Codex-Arcana/specs/080-fantasy-theme-refresh/spec.md) (Fantasy visual overhaul)

### v0.19.0 — The Discovery Update (2026-04-16)

- **Highlights**: Support for multiple entity aliases, adjustable sidebar layout, multi-label explorer filters.
- **Associated Specifications**:
  - [088-adjustable-sidebars](file:///home/espen/proj/Codex-Arcana/specs/088-adjustable-sidebars/spec.md) (Layout flexibility)
  - [090-entity-aliases](file:///home/espen/proj/Codex-Arcana/specs/090-entity-aliases/spec.md) (Alias search indexing)

### v0.18.0 — The Tactical Explorer Update (2026-04-16)

- **Highlights**: Collapsible label-grouped sections, VTT sidebar integrated entity lists, token drag-and-drop.
- **Associated Specifications**:
  - [069-pop-out-help-window](file:///home/espen/proj/Codex-Arcana/specs/069-pop-out-help-window/spec.md) (Popouts)
  - [084-label-grouped-explorer](file:///home/espen/proj/Codex-Arcana/specs/084-label-grouped-explorer/spec.md) (Explorer structure)
  - [085-vtt-entity-list](file:///home/espen/proj/Codex-Arcana/specs/085-vtt-entity-list/spec.md) (VTT workspace list)

### v0.17.0 — The Playable Tabletop Update (2026-04-14)

- **Highlights**: Interactive tactical VTT encounters, peer-to-peer zero-setup multiplayer sync, alegreya typography, in-app changelog alerts.
- **Associated Specifications**:
  - [079-vtt-light](file:///home/espen/proj/Codex-Arcana/specs/079-vtt-light/spec.md) & [081-in-app-changelog](file:///home/espen/proj/Codex-Arcana/specs/081-in-app-changelog/spec.md)
  - [098-p2p-host-service-decoupling](file:///home/espen/proj/Codex-Arcana/specs/098-p2p-host-service-decoupling/spec.md) & [100-guest-service-decoupling](file:///home/espen/proj/Codex-Arcana/specs/100-guest-service-decoupling/spec.md) (Multiplayer backbone)

### v0.16.0 — The Living Hub Update (2026-04-03)

- **Highlights**: Living hub dashboard, pinned note pins, traditional focus editing view, free AI Oracle tiers.
- **Associated Specifications**:
  - [075-free-oracle-use](file:///home/espen/proj/Codex-Arcana/specs/075-free-oracle-use/spec.md) (AI usage settings)
  - [077-vault-front-page](file:///home/espen/proj/Codex-Arcana/specs/077-vault-front-page/spec.md) (Dashboard)
  - [078-entity-traditional-view](file:///home/espen/proj/Codex-Arcana/specs/078-entity-traditional-view/spec.md) (Traditional explorer layout)

### v0.15.0 — The Spatial Canvas Update (2026-03-25)

- **Highlights**: Infinite node positioning canvases, 3D die roller with history, dockable help documentation.
- **Associated Specifications**:
  - [061-spatial-canvas](file:///home/espen/proj/Codex-Arcana/specs/061-spatial-canvas/spec.md) (Canvas coordinate engine)
  - [066-die-rolling](file:///home/espen/proj/Codex-Arcana/specs/066-die-rolling/spec.md) (Fair randomization engine)
  - [076-add-canvas-context-menu](file:///home/espen/proj/Codex-Arcana/specs/076-add-canvas-context-menu/spec.md) (Canvas integrations)

### v0.14.0 — The Robust Storage Update (2026-03-15)

- **Highlights**: OPFS file structures, Dexie metadata database caching, campaign-switching, bidirectional GDrive sync.
- **Associated Specifications**:
  - [039-multi-campaign-switch](file:///home/espen/proj/Codex-Arcana/specs/039-multi-campaign-switch/spec.md) (Vault separation)
  - [059-robust-local-sync](file:///home/espen/proj/Codex-Arcana/specs/059-robust-local-sync/spec.md) (File sync logic)
  - [073-dexie-entity-store](file:///home/espen/proj/Codex-Arcana/specs/073-dexie-entity-store/spec.md) (Dexie storage caching)
  - [093-directional-vault-sync](file:///home/espen/proj/Codex-Arcana/specs/093-directional-vault-sync/spec.md) & [096-gdrive-cloud-sync](file:///home/espen/proj/Codex-Arcana/specs/096-gdrive-cloud-sync/spec.md) (Sovereign sync)

### v0.13.0 — The Oracle Ascension Update (2026-03-01)

- **Highlights**: Chat commands, proactive relationship proposers, AI image generation, intelligent PDF importer.
- **Associated Specifications**:
  - [011-oracle-image-gen](file:///home/espen/proj/Codex-Arcana/specs/011-oracle-image-gen/spec.md) (DALL-E / Imagen integration)
  - [031-import-file-content](file:///home/espen/proj/Codex-Arcana/specs/031-import-file-content/spec.md) & [046-import-state-management](file:///home/espen/proj/Codex-Arcana/specs/046-import-state-management/spec.md) (Import registries)
  - [040-connections-proposer](file:///home/espen/proj/Codex-Arcana/specs/040-connections-proposer/spec.md) & [044-oracle-chat-commands](file:///home/espen/proj/Codex-Arcana/specs/044-oracle-chat-commands/spec.md) (AI suggestions)

### v0.12.0 — The World Timeline Update (2026-02-15)

- **Highlights**: Event chronologies, item/location merging, rich-text markdown rendering improvements.
- **Associated Specifications**:
  - [026-world-timeline](file:///home/espen/proj/Codex-Arcana/specs/026-world-timeline/spec.md) (Timeline controls)
  - [030-rich-text-formatting](file:///home/espen/proj/Codex-Arcana/specs/030-rich-text-formatting/spec.md) (Marked engine tuning)
  - [041-node-merging](file:///home/espen/proj/Codex-Arcana/specs/041-node-merging/spec.md) (Duplicate resolution)

### v0.11.0 — The Advanced Graph Update (2026-02-01)

- **Highlights**: Player-side Fog of War rendering, orbital centering layout models, descriptive edge labels.
- **Associated Specifications**:
  - [032-central-node-orbit](file:///home/espen/proj/Codex-Arcana/specs/032-central-node-orbit/spec.md) (Orbit physics layout)
  - [033-connection-labels](file:///home/espen/proj/Codex-Arcana/specs/033-connection-labels/spec.md) (Cytoscape edge text)
  - [034-fog-of-war](file:///home/espen/proj/Codex-Arcana/specs/034-fog-of-war/spec.md) (Visibility toggles)

### v0.10.0 — The Customization Update (2026-01-15)

- **Highlights**: Custom nodes styling templates, visual label filters, clean distraction-free document views.
- **Associated Specifications**:
  - [027-node-read-mode](file:///home/espen/proj/Codex-Arcana/specs/027-node-read-mode/spec.md) (Reading layouts)
  - [028-styling-templates](file:///home/espen/proj/Codex-Arcana/specs/028-styling-templates/spec.md) (Custom graph visual schemes)
  - [029-entity-labeling](file:///home/espen/proj/Codex-Arcana/specs/029-entity-labeling/spec.md) (Entity metadata tags)

### v0.9.0 — The Oracle Intelligence Update (2026-01-01)

- **Highlights**: High-accuracy local RAG, context-aware AI lore retrieval, structured metadata mining.
- **Associated Specifications**:
  - [008-lore-oracle](file:///home/espen/proj/Codex-Arcana/specs/008-lore-oracle/spec.md) (AI agent configuration)
  - [019-oracle-rag-improvements](file:///home/espen/proj/Codex-Arcana/specs/019-oracle-rag-improvements/spec.md) (RAG precision scoring)
  - [022-oracle-data-parsing](file:///home/espen/proj/Codex-Arcana/specs/022-oracle-data-parsing/spec.md) (YAML block extractor)

### v0.8.0 — The Campaign Management Update (2025-12-15)

- **Highlights**: Campaign sharing links, interactive calendars, customizable entity categories.
- **Associated Specifications**:
  - [010-flexible-categories](file:///home/espen/proj/Codex-Arcana/specs/010-flexible-categories/spec.md) (Schema overrides)
  - [021-share-campaigns](file:///home/espen/proj/Codex-Arcana/specs/021-share-campaigns/spec.md) (Read-only campaign mirrors)
  - [045-campaign-date-picker](file:///home/espen/proj/Codex-Arcana/specs/045-campaign-date-picker/spec.md) (Interactive in-game calendar)

### v0.7.0 — The Graph Engine Update (2025-12-01)

- **Highlights**: Navigation minimaps, interactive sub-graph isolates, node removal safety handlers.
- **Associated Specifications**:
  - [012-minimap](file:///home/espen/proj/Codex-Arcana/specs/012-minimap/spec.md) (Miniature canvas tracker)
  - [014-graph-focus-mode](file:///home/espen/proj/Codex-Arcana/specs/014-graph-focus-mode/spec.md) (Focused node extraction)
  - [024-delete-nodes](file:///home/espen/proj/Codex-Arcana/specs/024-delete-nodes/spec.md) (Clean cascade deletions)

### v0.6.0 — The Search & Discovery Update (2025-11-15)

- **Highlights**: Superfast prefix and fuzzy indexing, fluid touch interface updates, large-graph layout performance.
- **Associated Specifications**:
  - [004-fuzzy-search](file:///home/espen/proj/Codex-Arcana/specs/004-fuzzy-search/spec.md) (Fuzzy lookup)
  - [009-mobile-ux-sync-feedback](file:///home/espen/proj/Codex-Arcana/specs/009-mobile-ux-sync-feedback/spec.md) (Sync signals)
  - [018-perf-improvements](file:///home/espen/proj/Codex-Arcana/specs/018-perf-improvements/spec.md) (Cytoscape viewport frame rates)

### v0.5.0 — The Foundations Update (2025-11-01)

- **Highlights**: Foundational text structures, sync triggers, primary cloud backups.
- **Associated Specifications**:
  - [001-core-entity-schema](file:///home/espen/proj/Codex-Arcana/specs/001-core-entity-schema/spec.md) (Core spec)
  - [002-svelte-sync-engine](file:///home/espen/proj/Codex-Arcana/specs/002-svelte-sync-engine/spec.md) (Reactive engine)
  - [003-gdrive-mirroring](file:///home/espen/proj/Codex-Arcana/specs/003-gdrive-mirroring/spec.md) (Primary Drive mirror)
