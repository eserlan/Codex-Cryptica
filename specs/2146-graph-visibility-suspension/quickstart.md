# Quickstart: Validate Graph Visibility Suspension

## Automated checks

From `apps/web`:

```bash
bun run check
bun run lint
bun run test:unit -- \
  src/lib/components/graph/graph-view-controller.test.ts \
  src/lib/components/graph/Minimap.test.ts \
  src/lib/components/GraphView.test.ts
```

If a new lifecycle helper is extracted, include its focused test file in the
command above. Run the full `bun run test:unit` before publishing.

## Manual cover/resume check

1. Open a large vault in the graph view and select a node.
2. Pan/zoom to a distinctive camera position and open the minimap.
3. Open the desktop Explorer workspace so the graph is fully covered.
4. Confirm no new layout worker jobs or minimap animation frames are produced
   while the overlay is open.
5. Close Explorer and confirm the same camera, selection, and minimap state
   return without a visible layout storm.
6. Repeat with the front-page overlay and with a normal partially open sidebar;
   only the full-surface cases should suspend.

## Manual document-visibility check

1. Start a layout or graph update.
2. Switch to another browser tab and return after a vault change or vault
   switch has completed.
3. Confirm the resumed graph shows the current vault, not stale elements,
   and does not duplicate event listeners.

## Performance evidence

With the local performance capture enabled, compare visible and suspended
intervals for:

- layout/worker invocation count;
- minimap redraw count;
- long animation frame count/duration;
- resume-to-stable-frame latency;
- camera and selection restoration.

Capture only aggregate local measurements; do not export vault contents.
