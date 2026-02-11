# Quickstart: Focus Mode Integration

**Feature**: Graph Focus Highlight (014-graph-focus-mode)

## Integration Steps

### 1. Update Theme

In `apps/web/src/lib/themes/graph-theme.ts`, add the `.dimmed` selector to `BASE_STYLE`:

```typescript
{
  selector: '.dimmed',
  style: {
    'opacity': 0.35,
    'transition-property': 'opacity',
    'transition-duration': 200
  }
}
```

### 2. Handle Selection

In `apps/web/src/lib/components/GraphView.svelte`, update the `tap` listener:

```typescript
cy.on("tap", "node", (evt) => {
  const node = evt.target;
  const neighborhood = node.neighborhood().add(node);

  cy.elements().addClass("dimmed");
  neighborhood.removeClass("dimmed");
});

cy.on("tap", (evt) => {
  if (evt.target === cy) {
    cy.elements().removeClass("dimmed");
  }
});
```

### 3. Verification

- Click a node: everything else should fade.
- Click a neighbor: focus should shift.
- Click background: all nodes vivid.
