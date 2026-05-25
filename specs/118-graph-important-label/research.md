# Research: Graph Important Label

## Decision: Use the existing `important` entity label as the source of truth

**Rationale**: The issue asks for a quick way to apply `#important` in addition to existing label workflows. The vault already normalizes labels and prevents duplicates through `addLabel`/`bulkAddLabel`, so reusing that path keeps behavior consistent across graph, entity detail, explorer filters, imports, and search.

**Alternatives considered**:

- Add a dedicated importance field: rejected because it would create a second categorization concept and duplicate existing label behavior.
- Add a graph-only visual marker: rejected because it would not persist with entity metadata or work outside the graph.

## Decision: Apply importance through the graph context-menu controller

**Rationale**: The graph context menu already resolves the clicked node vs selected nodes and uses constructor-injected stores for mutations, modals, and notifications. Adding one controller action keeps UI state and mutation feedback testable without moving logic into the Svelte template.

**Alternatives considered**:

- Open the bulk label dialog prefilled with `important`: rejected because the issue asks for an easy direct action and this adds an unnecessary confirmation step.
- Add the action only to the existing label dialog: rejected because it does not improve graph right-click workflow speed.

## Decision: Derive graph visual distinction in `graph-engine`

**Rationale**: The graph engine already transforms entity labels into Cytoscape node data and owns node styles such as category, draft, selection, and revealed states. Deriving an `important` visual state there keeps the web layer thin and makes the visual contract unit-testable without a browser.

**Alternatives considered**:

- Style important nodes in `GraphView.svelte`: rejected because it would split graph styling between app and package.
- Depend only on the rendered label chip/text: rejected because the spec requires important entities to remain distinct even when label text is hidden.

## Decision: Use a non-size-only visual treatment

**Rationale**: The issue explicitly says importance should be visible by something other than number of connections. Existing node size is tied to connection weight, so importance should use a separate border, underlay, glow, or comparable treatment that does not change graph semantics.

**Alternatives considered**:

- Increase node size for important entities: rejected because size already communicates graph connectivity and would confuse the two signals.
- Add only a tooltip or context-menu state: rejected because important entities need to be visibly distinct while scanning the graph.
