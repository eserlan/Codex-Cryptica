# Quickstart: Help and Guide System

## 1. Defining a Walkthrough
Tours are defined as arrays of `GuideStep` objects.

```typescript
const ONBOARDING_TOUR = [
    {
        id: "vault-intro",
        targetSelector: '[data-testid="vault-button"]',
        title: "Your Archive",
        content: "This is where you connect to your local files. Your data never leaves your computer.",
        position: "bottom"
    },
    // ...
];
```

## 2. Triggering the Onboarding
In `+layout.svelte`, check if the user has seen the onboarding:

```typescript
onMount(() => {
    helpStore.init();
    if (!helpStore.hasSeen("initial-onboarding")) {
        helpStore.startTour("initial-onboarding");
    }
});
```

## 3. UI Implementation
- **`TourOverlay.svelte`**: A global component in `+layout.svelte` that renders the dimmed background and spotlight.
- **`HelpTab.svelte`**: A new tab in the `SettingsModal.svelte`.
- **`HelpArticleItem.svelte`**: Renders a single help article with markdown support via `marked`.
