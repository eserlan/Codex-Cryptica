# Quickstart: Implementing the Pop-out Help Window

## Steps

### 1. Create the `/help` Route

- **Location**: `apps/web/src/routes/help/+page.svelte`
- **Task**: Create a simple page that imports and renders `<HelpTab isStandalone={true} />`.
- **Verification**: Navigate directly to `http://localhost:5173/help`. You should see the help content, but likely with the main app sidebar still visible.

### 2. Whitelist the Route in Layout

- **Location**: `apps/web/src/routes/+layout.svelte`
- **Task**: Update the `isPopup` derived rune to include `/help`.
  ```typescript
  const isPopup = $derived(
    page.url.pathname === `${base}/oracle` ||
      page.url.pathname === `${base}/help`,
  );
  ```
- **Verification**: Refresh `http://localhost:5173/help`. The sidebar and main app navigation should disappear, leaving only the help content.

### 3. Add the Trigger Logic

- **Location**: `apps/web/src/lib/stores/help.svelte.ts`
- **Task**: Implement `openHelpWindow()` method using `window.open`.
- **Verification**: Run `helpStore.openHelpWindow()` from the browser console.

### 4. Add the UI Trigger

- **Location**: `apps/web/src/lib/components/help/HelpTab.svelte`
- **Task**: Add a "Pop out" button (using `lucide:external-link` or similar) that calls the store method. Hide this button if `isStandalone` is true.
- **Verification**: Open the help modal in the main app, click the pop-out button, and verify the new window opens correctly.

### 5. Final Polish

- **Task**: Ensure the standalone page has correct background colors and padding.
- **Verification**: Use `svelte-check` to ensure no new accessibility or type errors were introduced.
