# Quickstart: Graph Important Label

## User Flow

1. Open the graph.
2. Right-click an editable entity node.
3. Choose `Mark Important`.
4. Confirm the entity now has the `important` label.
5. Confirm the entity visually stands out in the graph even when graph label text is hidden.

## Multi-Select Flow

1. Select two or more graph nodes.
2. Right-click one of the selected nodes.
3. Choose `Mark Important`.
4. Confirm every selected entity gains the `important` label unless it already had it.
5. Confirm all important nodes use the same distinct graph treatment.

## Read-Only Flow

1. Open a guest or read-only graph session.
2. Right-click an entity node.
3. Confirm `Mark Important` is not available.

## Developer Verification

Run focused tests for the affected surfaces:

```sh
bun run --filter graph-engine test -- src/transformer.test.ts
bun run --filter web test -- src/lib/components/graph/graph-context-menu-controller.test.ts
```

Then run repository validation before merge:

```sh
bun run lint
bun run test
```

If Bun fails in the current shell with `CouldntReadCurrentDirectory`, rerun from a working host shell or CI environment and record the local blocker in the PR.
