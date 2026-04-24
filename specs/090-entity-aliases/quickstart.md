# Quickstart: Entity Alias Support

This guide outlines the steps to validate alias support.

## 1. Automated Validation

Run the new unit tests (to be created):

```bash
# Test schema validation
npm test -w packages/schema

# Test search indexing
npm test -w packages/search-engine

# Test UI component
npm test -w apps/web -- src/lib/components/labels/AliasInput.test.ts
```

## 2. Manual Verification

### Management

1.  Open any entity in **Zen Mode**.
2.  Click **Edit**.
3.  Locate the **Aliases** input field.
4.  Type "The Great One" and press `Enter`.
5.  Type "Legendary Hero" and press `,`.
6.  Verify two pills are rendered.
7.  Click the 'X' on "The Great One".
8.  Click **Save**.
9.  Reload the browser and confirm "Legendary Hero" persists.

### Discovery

1.  Go to the **Entity Explorer**.
2.  Find the entity you just edited.
3.  Confirm it says `aka: Legendary Hero` below the title.
4.  Type "Hero" into the Explorer search bar.
5.  Confirm the entity is filtered and remains visible.
6.  Type "Legendary" into the global search modal (`Ctrl+K`).
7.  Confirm the entity appears in the results.
