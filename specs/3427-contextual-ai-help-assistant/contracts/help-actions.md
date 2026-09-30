# Contract: Safe Guidance Actions

Authoritative catalogue and validator: `packages/help-engine/src/actions/`. Execution: `apps/web/src/lib/services/help-assistant/`.

## Allow-list

| Type            | Payload                      | Executed by                                                       |
| --------------- | ---------------------------- | ----------------------------------------------------------------- |
| `navigate`      | `to: DestinationId`          | SvelteKit `goto` via a destination→route map owned by the web app |
| `openHelp`      | `helpId`                     | Existing `helpStore` (article must be in bundle)                  |
| `openPanel`     | `panel: PanelId`             | Existing tab/panel controllers (e.g. entity detail tab selection) |
| `highlight`     | `target: ControlId`, `label` | `HelpHighlightService`                                            |
| `openGenerator` | `generatorId`                | Existing generator modal/route opener                             |

There is no type for create, edit, delete, import, export, publish, or settings changes, and no free-form string is ever executed.

## Catalogues (closed lists)

- `ControlId` (spike): `add-connection-button`, `graph-view` entry, `status-tab`, `connections-tab` (extensible only via code change).
- `DestinationId`: `graph`, `session-hub`, `tables`, `generators`.
- `PanelId`: `status-tab`, `connections-tab`.
- `GeneratorId`: `campaign`.

Each ControlId has: the `data-help-target` value, allowed `area`/`tab`/`surface`, and required flags.

## Validation (server, then client)

An action is offered only if: its type is in the allow-list; its target is in the catalogue; it is in `context.availableActions` (for `highlight`/`openPanel`) or valid for `context.surface` (for `navigate`/`openGenerator`); and its feature flags are on. Otherwise it is discarded and only the written answer is shown. The Worker builds a **candidate list** from the registry for the retrieved features; the model may only return an `actionId` from that list. The client re-validates before display and again before execution (screen may have changed).

## Highlight behaviour (FR-020, FR-021)

- Finds `[data-help-target="<id>"]`; if absent or hidden, does nothing and reports no error to the user.
- Scrolls into view; applies a ring **plus** a visible text label (not colour alone) using semantic theme tokens.
- Announces "<label> highlighted" via a polite live region; the target keeps normal focus order.
- `prefers-reduced-motion`: no pulsing/animated scroll.
- Removed on: click-away, Escape, route change, panel dismiss, 15 s timeout.
- Never clicks, focuses-and-activates, or fills anything.

## Acceptance

User must press the offered button ("Show me") before any step runs, and can dismiss. The two-step guide runs as one acceptance: open Status tab, then highlight after the target mounts (wait ≤ 1 s, then give up quietly).
