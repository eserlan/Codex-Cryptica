# Graph Rendering Flow

Traces the complete data flow from vault entities through layout computation to the Cytoscape DOM, including all re-render triggers.

---

## Flow Diagram

```mermaid
flowchart TD
    subgraph Data["Data Layer"]
        VA[vault.allEntities<br/><i>$state reactive array</i>]
        ES[entity-store<br/>createEntity / updateEntity / deleteEntity]
        VEB[vaultEventBus<br/>CACHE_LOADED · ENTITY_UPDATED · BATCH_UPDATED]
    end

    subgraph GraphStore["graph.svelte.ts — Graph Store"]
        GE["graph.elements<br/><i>$derived.by</i><br/>isEntityVisible filter → GraphTransformer"]
        GM[graph mode flags<br/>showLabels · showImages · stableLayout<br/>timelineMode · orbitMode · centralNodeId]
        GF[graph filters<br/>activeLabels · activeCategories · labelFilterMode]
    end

    subgraph Transform["packages/graph-engine — Transformer"]
        GT["GraphTransformer.entitiesToElements()<br/>weight precompute → node sizing<br/>phyllotaxis spiral for unplaced nodes<br/>edge validation"]
    end

    subgraph Component["GraphView.svelte — Component"]
        OM["onMount (+50ms)<br/>initGraph() → cy instance<br/>LayoutManager instantiated<br/>ImageManager instantiated<br/>setupGraphEvents()"]
        SE["$effect: graph.elements change<br/>syncGraphElements()"]
        SM["$effect: style/theme change<br/>cy.style(newStyle)"]
        SF["$effect: selectedId change<br/>applyFocus() — dimmed / neighborhood classes"]
        SL["$effect: mode flags change<br/>applyCurrentLayout(forced=true)"]
    end

    subgraph Sync["packages/graph-engine — useGraphSync"]
        SG["syncGraphElements()<br/>1. detect removals → cy.remove()<br/>2. add new nodes (pending-layout class)<br/>3. add new edges<br/>4. patch-update changed data fields<br/>5. apply category / label filters<br/>6. recalculate weights"]
        OLU["onLayoutUpdate callback<br/>→ applyCurrentLayout()"]
    end

    subgraph Layout["packages/graph-engine — LayoutManager"]
        LA["layoutManager.apply()<br/>isInitial · isForced · caller · hasNewNodes"]
        FO{"fit-only path?<br/>stableLayout=true<br/>no new nodes<br/>not forced"}
        TM{"timelineMode?"}
        OM2{"orbitMode?"}
        FD["Force-Directed<br/>FCOSE via Web Worker"]
        TL["Timeline Layout<br/>chronological axis<br/>gap-compressed years<br/>jitter for concurrent events"]
        OL["Orbit Layout<br/>BFS distances → concentric rings"]
    end

    subgraph Worker["layout.worker.ts — Web Worker"]
        WM["receive job message<br/>cancel pending jobs"]
        FC["cytoscape-fcose<br/>getDynamicLayoutOptions(nodeCount)<br/>quality · edgeLength · repulsion · gravity"]
        OR["overlap removal<br/>spatial grid O(N)<br/>max 32 iterations"]
        WR["return positions → main thread"]
    end

    subgraph PostLayout["Post-Layout"]
        CP["cy.batch() → apply positions<br/>remove pending-layout class (reveal nodes)"]
        AN["cy.animate(fit, 800ms, ease-out-quad)"]
        PU["onPositionsUpdated()<br/>vault.batchUpdate({ id: { metadata: { coordinates } } })<br/>persisted to IndexedDB"]
    end

    subgraph Images["packages/graph-engine — ImageManager"]
        IM["imageManager.sync()<br/>batch resolve blob URLs (10 at a time)<br/>apply as node background-image"]
    end

    subgraph Viewport["Viewport Management"]
        LOD["pan/zoom → LOD classes<br/>zoom<0.2: lod-low<br/>zoom<0.5: lod-medium<br/>else: full detail"]
        RSZ["window resize (250ms debounce)<br/>orientation change → randomize=true"]
        SCF["SEARCH_ENTITY_FOCUS_EVENT<br/>pendingSearchFocus → animate center+zoom"]
    end

    %% Data flow
    ES --> VA
    VEB --> VA
    VA --> GE
    GF --> GE
    GE --> GT
    GT --> GE

    %% Store → Component
    GE --> SE
    GM --> SL
    GF --> SE

    %% Component init
    OM --> SE

    %% Sync
    SE --> SG
    SG --> OLU
    OLU --> LA

    %% Style / selection
    SM --> Component
    SF --> Component

    %% Layout routing
    LA --> FO
    FO -- yes --> AN
    FO -- no --> TM
    TM -- yes --> TL
    TM -- no --> OM2
    OM2 -- yes --> OL
    OM2 -- no --> FD

    %% Worker path
    FD --> WM
    WM --> FC
    FC --> OR
    OR --> WR
    WR --> CP

    %% Post-layout
    TL --> CP
    OL --> CP
    CP --> AN
    AN --> PU

    %% Images
    SE --> IM

    %% Viewport
    AN --> LOD
    RSZ --> LA
    SCF --> Viewport
```

---

## Initialization Sequence

```mermaid
sequenceDiagram
    participant App as +layout.svelte
    participant VS as vault.svelte
    participant GS as graph.svelte
    participant GV as GraphView.svelte
    participant LM as LayoutManager
    participant W as layout.worker

    App->>VS: bootSystem()
    VS->>VS: load entities from IDB (CACHE_LOADED)
    VS-->>GS: vault.allEntities reactive update
    GS->>GS: graph.elements $derived recomputes<br/>(GraphTransformer runs)

    App->>GV: mount component
    Note over GV: 50ms delay
    GV->>GV: initGraph() → new cy instance
    GV->>LM: new LayoutManager(cy)
    GV->>GV: $effect fires: syncGraphElements()
    GV->>LM: applyCurrentLayout(isInitial=true)
    LM->>W: postMessage(job, nodes, edges)
    W-->>LM: positions[]
    LM->>GV: cy.batch(applyPositions)
    LM->>GV: cy.animate(fit)
    LM->>VS: onPositionsUpdated() → batchUpdate
```

---

## Re-render Decision Tree

```mermaid
flowchart TD
    T[trigger fires]
    T --> Q1{structural change?<br/>nodes/edges added or removed}
    Q1 -- yes --> Q2{stableLayout?}
    Q2 -- no --> FULL[full FCOSE layout<br/>in worker]
    Q2 -- yes --> Q3{hasNewNodes?}
    Q3 -- yes --> FULL
    Q3 -- no --> FIT[fit viewport only<br/>cy.animate]

    Q1 -- no --> Q4{mode changed?<br/>timeline / orbit toggle}
    Q4 -- yes --> FORCED[forced layout<br/>randomize=true if exiting mode]
    Q4 -- no --> Q5{data patch only?<br/>label / image / category}
    Q5 -- yes --> STYLE[style / filter update<br/>no layout]
    Q5 -- no --> FIT
```

---

## Key Subsystems

### GraphTransformer (`packages/graph-engine/src/transformer.ts`)

Converts vault entities to Cytoscape elements in a single pass:

1. **Weight pass** — counts visible connections per node to determine size (48px – 128px)
2. **Node creation** — assigns phyllotaxis spiral positions to unplaced nodes; marks them `pending-layout` (opacity 0) until the worker returns
3. **Edge creation** — filters edges whose target no longer exists in the vault

### Element Sync (`packages/graph-engine/src/sync/useGraphSync.ts`)

Incremental diffing — avoids full cy teardown on every vault change:

- O(1) map lookups for existing nodes
- Patch updates: only changed fields written to cy data
- Special equality checks for coordinates, arrays, temporal metadata
- Batched `cy.batch()` writes for DOM efficiency

### Layout Worker (`packages/graph-engine/src/layout.worker.ts`)

Job-based, cancellable. Timeout scales at 30ms/node (min 15s, max 60s).

Dynamic options scale with graph size:

| Parameter      | Formula                                        |
| -------------- | ---------------------------------------------- |
| Edge length    | `90 + √nodeCount × 9`                          |
| Node repulsion | `250000 + nodeCount × 2400`                    |
| Gravity        | `max(0.005, 0.05 − nodeCount × 0.00015)`       |
| Quality        | `"draft"` if nodeCount ≥ 500, else `"default"` |

After worker positions are applied, a grid-based overlap removal pass runs (O(N) per iteration, max 32 rounds).

### Image Manager (`packages/graph-engine/src/sync/ImageManager.ts`)

Lazy, batched blob URL resolution: resolves 10 nodes per tick, caches resolved URLs, revokes stale blob URLs on data change or image toggle.

### Level-of-Detail

Zoom thresholds: `< 0.2` → `lod-low`, `< 0.5` → `lod-medium`, else full detail. Applied via CSS classes on pan/zoom events.

---

## Re-render Trigger Reference

| Trigger                  | Source                      | Layout?     | Type                         |
| ------------------------ | --------------------------- | ----------- | ---------------------------- |
| Entity created           | `vault.createEntity()`      | Yes         | FCOSE (hasNewNodes=true)     |
| Entity deleted           | `vault.deleteEntity()`      | Yes         | FCOSE                        |
| Entity data updated      | `vault.updateEntity()`      | No          | data patch only              |
| Connection added/removed | entity.connections change   | Yes         | FCOSE                        |
| Label filter changed     | `graph.activeLabels`        | No          | CSS class toggle             |
| Category filter changed  | `graph.activeCategories`    | No          | CSS class toggle             |
| Timeline mode toggled    | `graph.timelineMode`        | Yes         | Timeline layout (forced)     |
| Orbit mode toggled       | `graph.orbitMode`           | Yes         | Orbit layout (forced)        |
| Show labels toggled      | `graph.showLabels`          | No          | style update                 |
| Show images toggled      | `graph.showImages`          | No          | ImageManager sync            |
| Stable layout toggled    | `graph.stableLayout`        | No          | affects next layout decision |
| Vault load complete      | `vault.status → idle`       | Yes         | FCOSE (forced)               |
| Window resize            | ResizeObserver              | Conditional | fit-only or FCOSE            |
| Orientation change       | resize handler              | Yes         | FCOSE (randomize=true)       |
| Search focus             | `SEARCH_ENTITY_FOCUS_EVENT` | No          | animate center+zoom          |
| Theme change             | `themeStore.activeTheme`    | No          | `cy.style()` update          |
| Manual redraw            | UI button                   | Yes         | FCOSE (forced)               |

---

## Related Documents

- [`GRAPH_LAYOUT_TUNING.md`](./GRAPH_LAYOUT_TUNING.md) — FCOSE parameter reference and tuning guide
- [`GRAPH_STABILITY.md`](./GRAPH_STABILITY.md) — stable layout mode and position persistence
- [`VAULT_INIT_FLOW.md`](./VAULT_INIT_FLOW.md) — vault boot sequence that precedes graph initialization
