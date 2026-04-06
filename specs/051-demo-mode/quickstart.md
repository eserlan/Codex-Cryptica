# Quickstart: Implementing Demo Mode

## 1. Prepare Sample Data

Create JSON files for each theme in `apps/web/static/vault-samples/`:

- `fantasy.json`
- `vampire.json`
- `scifi.json`
- ...etc

Each file should contain an export of `VaultState`.

## 2. Update VaultStore

Add the `loadDemoData` method to `apps/web/src/lib/stores/vault.svelte.ts`. This method should set `isInitialized = true` and populate the `entities` and `inboundConnections` map without calling IndexedDB.

## 3. Implement URL Detection

In `apps/web/src/routes/+layout.svelte`, use an `$effect` to watch for the `demo` query parameter:

```typescript
$effect(() => {
  const demoTheme = page.url.searchParams.get("demo");
  if (demoTheme && !uiStore.isDemoMode) {
    demoService.startDemo(demoTheme);
  }
});
```

## 4. UI Indicators

- Add a "DEMO MODE" badge to the `VaultControls.svelte`.
- Add a "Save as Campaign" button to the `SettingsModal.svelte`.
- Update `LandingPage.svelte` with theme quick-start links.

## 5. Oracle Persona

In `OracleStore.svelte.ts`, append a "guided demo" instruction to the system prompt if `uiStore.isDemoMode` is true.
