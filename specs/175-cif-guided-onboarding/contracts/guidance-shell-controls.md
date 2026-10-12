# Contract: shell controls and journey "Show me" actions

## `help-engine` catalogue additions (`packages/help-engine/src/actions/catalogue.ts`)

```ts
/** App-chrome controls only onboarding journeys may point at. Never advertised to the Worker. */
export const SHELL_CONTROL_IDS = [
  "create-entry",
  "open-search",
  "activity-bar-graph",
] as const;

// existing entries stay first; the shell ids are appended
export const CONTROL_IDS = [
  ...EXISTING_CONTROL_IDS,
  ...SHELL_CONTROL_IDS,
] as const;

interface ControlSpec {
  area: "entity-detail" | "map" | "solo" | "shell"; /* … */
}

CONTROL_CATALOGUE["create-entry"] = { area: "shell" }; // no requiresFlag: Create always opens the intent menu
CONTROL_CATALOGUE["open-search"] = { area: "shell" };
CONTROL_CATALOGUE["activity-bar-graph"] = { area: "shell" };
```

`controlIsOnScreen` treats `"shell"` like `"solo"`: it skips the area match.

## `validateAction` extension (`packages/help-engine/src/actions/validate.ts`)

```ts
export interface ActionDeps {
  helpIds: ReadonlySet<string>;
  /** Extra ids the caller vouches for in this call only (journeys pass SHELL_CONTROL_IDS). */
  extraAvailable?: readonly string[];
}
```

- `extraAvailable` is merged into `ctx.availableActions` for that one validation and is never written back into the context.
- `sanitizeHelpContext` and the help context store are unchanged, so shell ids never reach the Worker in a help request.
- Tests: a shell highlight is rejected without `extraAvailable` and accepted with it. Without it, an existing Cif action behaves exactly as before.

## `HelpActionRunner.run` extension (`apps/web/src/lib/services/help-assistant/help-action-runner.ts`)

```ts
run(action: GuidanceAction, options?: { extraAvailable?: readonly string[] }): Promise<boolean>;
```

It passes `extraAvailable` to `validateAction`. Everything else is unchanged: highlights still go through `HelpHighlightService.show()`, which returns `false` when no matching element is rendered. The journey shows the step's `fallback` whenever `run` resolves `false`.

## DOM contract: `data-help-target` placements

| id                   | Elements that carry it                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-entry`       | `AppHeader` `header-create-button` (lg+), `GraphView` `graph-fab-create` (< lg), `GraphEmptyState` CTA (`graph-empty-state-cta`, through a new optional `ctaHelpTarget` prop on `EmptyState`) |
| `open-search`        | `AppHeader` `search-input` (desktop), `mobile-search-button` (< lg)                                                                                                                           |
| `activity-bar-graph` | `ActivityBar` button for the graph view (`activity-bar-graph`)                                                                                                                                |

**Render-contract test** (SC-006): for each journey step whose `showMe` is a highlight, render at 1280, 820 and 390 px wide and assert that a visible `[data-help-target=<id>]` exists, or that the step is marked in the test table as fallback-only at that width.

## Allowed "Show me" action types for journeys

Only `navigate`, `openHelp`, `openPanel`, `highlight` and `openGenerator`, the existing types, none of which can change the vault (FR-013). Each runs only from the user's tap on "Show me" in the journey card, or on the finish card's `next` button.
