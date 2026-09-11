# Data Model: Graph Visibility Suspension

## GraphVisibilityState

Runtime-only state owned by the graph view/controller.

| Field                   | Type                                                            | Meaning                                                         |
| ----------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| `documentVisible`       | `boolean`                                                       | Whether `document.hidden` is false.                             |
| `surfaceCovered`        | `boolean`                                                       | Whether an app-owned full-surface overlay covers the graph.     |
| `containerIntersecting` | `boolean`                                                       | Whether the graph container has non-zero viewport intersection. |
| `suspended`             | `boolean`                                                       | Derived pause decision.                                         |
| `reason`                | `"document-hidden" \| "surface-covered" \| "offscreen" \| null` | Diagnostic reason for suspension.                               |
| `generation`            | `number`                                                        | Monotonic token invalidating stale callbacks.                   |
| `needsReconcile`        | `boolean`                                                       | Whether changes were deferred during suspension.                |

### Derived rule

```text
suspended = !documentVisible || surfaceCovered || !containerIntersecting
```

The implementation must keep `surfaceCovered` explicit; a sidebar being open
does not set it. `containerIntersecting` is a safety guard, not the primary
occlusion detector.

## GraphVisibilityLifecycle

Controller transitions:

```text
visible -> suspended   when any suspension input becomes true
suspended -> visible   when all inputs become clear
visible -> destroyed   when GraphView unmounts
suspended -> destroyed when GraphView unmounts
```

Entering `suspended`:

- Increment `generation`.
- Stop `LayoutManager` and Cytoscape animations.
- Cancel resize/focus/slash/render-ready timers and RAFs.
- Mark pending element/image/layout work as deferred.
- Tell Minimap to stop listeners and redraw frames.

Leaving `suspended`:

- Verify the controller is not destroyed and Cytoscape is still valid.
- Reconcile the latest graph/vault state once.
- Restore minimap listeners and schedule one redraw.
- Preserve existing camera and selection unless the normal reconciliation
  policy explicitly requires a fit.

## Deferred work semantics

- Latest state wins; hidden updates are not replayed individually.
- A stale callback whose captured generation differs from current state is a
  no-op.
- Vault switch remains authoritative: a resume must use the current vault and
  current graph elements only.
