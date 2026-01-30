# Store Contracts: Help and Guide System

## `helpStore` (Svelte 5 State)

The `helpStore` manages the active walkthrough state and the help article library.

### State Properties
```typescript
interface HelpState {
    activeTour: {
        id: string;
        currentStep: number;
        steps: GuideStep[];
    } | null;
    searchQuery: string;
    searchResults: HelpArticle[];
    isSettingsHelpOpen: boolean;
}
```

### Methods
- **`startTour(tourId: string)`**: Loads the specified tour and opens the overlay.
- **`nextStep()`**: Advances to the next step or finishes if at the end.
- **`prevStep()`**: Goes back to the previous step.
- **`skipTour()`**: Immediately ends the tour and marks as seen.
- **`searchArticles(query: string)`**: Updates `searchResults` using FlexSearch.
- **`init()`**: Loads completion status from LocalStorage.

## Events
- **`HELP_TOUR_STARTED`**: Dispatched when a guide begins.
- **`HELP_TOUR_COMPLETED`**: Dispatched when a user reaches the last step.
- **`HELP_HINT_SHOWN`**: Dispatched when a contextual tooltip appears.
