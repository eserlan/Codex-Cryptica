# Research: Graph Visibility Suspension

## Decision 1: Preserve the Cytoscape instance and suspend work in place

**Decision**: Keep the existing Cytoscape instance, `GraphImageManager`, graph
membership, camera, and selection mounted while hidden. Add a lifecycle gate in
`GraphViewController` and make child work (layout, timers, animation frames,
and minimap redraws) honor it.

**Rationale**:

- `GraphViewController` already owns the Cytoscape instance, layout manager,
  image manager, timers, async generation guards, and cleanup.
- `LayoutManager.stop()` already invalidates worker jobs and stops the current
  Cytoscape layout, so suspension can reuse an established cancellation path.
- Preserving the instance naturally retains camera, selection, pending search
  focus, and graph membership without serializing or rebuilding them.
- Destroy/recreate would repeat initialization, image synchronization, graph
  event registration, and initial layout work after every cover/resume cycle.

**Alternatives considered**:

- **Destroy and recreate Cytoscape**: stronger memory release, but risks camera
  and selection loss, repeats expensive large-vault initialization, and adds a
  failure-prone restoration protocol. Keep as an explicit fallback only when
  the preserved instance is destroyed or invalid.
- **Only set CSS visibility/opacity**: does not stop workers, layout callbacks,
  `requestAnimationFrame`, or Cytoscape event processing.

## Decision 2: Use explicit full-surface signals plus document visibility

**Decision**: The graph receives a boolean lifecycle signal derived from
`document.hidden` and app-owned full-surface states. The first covered states
are the Explorer workspace overlay, the vault front-page overlay, and the
landing/marketing layer when the graph remains mounted. A graph container
`IntersectionObserver` is used only as a safety guard for zero intersection;
it must not suspend on ordinary sidebars or partial visibility.

**Rationale**:

- `IntersectionObserver` reports viewport intersection, not whether another
  positioned element paints over the graph. It cannot reliably detect the
  Explorer overlay by itself.
- The app already exposes reactive state for the Explorer workspace and the
  front-page/landing overlays, so the covered decision can be deterministic and
  testable.
- Explicit signals avoid treating a right sidebar, modal-sized panel, or
  partially visible graph as fully covered.

**Alternatives considered**:

- **Generic `elementFromPoint` occlusion sampling**: brittle with nested
  overlays, portals, transforms, and pointer-events; it would also create a
  geometry sampling loop for little benefit.
- **Intersection ratio alone**: correctly detects off-screen/zero-sized graph
  containers but cannot detect an opaque overlay covering the same rectangle.

## Decision 3: Make suspension a controller lifecycle, not a store concern

**Decision**: Add a small visibility lifecycle type/helper and controller method
in the web graph layer. `GraphView.svelte` owns the reactive app/document
signals and calls the controller. `Minimap.svelte` receives an `isSuspended`
prop and cancels its pending frame/listeners while suspended.

**Rationale**:

- Visibility is presentation/runtime state, not vault persistence or graph
  domain state.
- The controller is already the single owner of Cytoscape and layout resources.
- Constructor DI keeps lifecycle behavior unit-testable without requiring the
  full app layout in tests.

## Decision 4: Resume with one guarded reconciliation

**Decision**: On suspension, increment the controller generation, cancel timers
and pending render measurements, stop layout/worker/viewport animations, and
mark a reconciliation-needed flag. While suspended, element/image/render-hint
effects may update cheap state but must not start layout or animation work. On
resume, verify the current Cytoscape identity and generation, then perform
one `resize`/element reconciliation/layout pass if needed and re-arm the
minimap.

**Rationale**:

- Vault changes and vault switches can occur while hidden; generation checks
  prevent old callbacks from applying to the new vault.
- Deferring repeated updates avoids replaying every hidden mutation one by one.
- A single resume pass preserves freshness without creating a layout storm.

## Measurement plan

- Add local-only performance samples for `graph_visibility_suspend`,
  `graph_visibility_resume`, and deferred-work counts.
- Compare a large-vault scenario with the graph visible versus fully covered:
  worker/layout invocations, minimap animation frames, long animation frames,
  and JS heap where the browser exposes it.
- Record resume latency from the visibility signal to the first stable rendered
  frame and confirm camera/selection restoration.
- Do not transmit or persist graph content or browser-identifying data.
