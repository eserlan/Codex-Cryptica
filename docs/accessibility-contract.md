# Accessibility contract

**Scope:** the primary workspace journey, graph to table to entity detail.
**Owner:** whoever changes the graph, table, or entity-detail surfaces.
**Automated coverage:** `apps/web/tests/a11y-workspace.spec.ts`.

This document exists because Chunk 7 of the
[UX assessment](reports/ai-aesthetic-ux-assessment.md) asked for a documented
accessibility contract rather than a one-off fix. It states what we promise, how
the promise is checked, and what is knowingly not yet true.

## The contract

### 1. The graph canvas is not an accessibility surface, and says so

Cytoscape paints into a `<canvas>`. There is no DOM per node, so no node can be
focused, named, or reached. Rather than mirroring graph state into a hidden DOM
tree that drifts from the renderer, the canvas is `aria-hidden="true"` and its
meaning is carried in text:

- a visually hidden description (`graph-a11y-summary`) states the graph's scale,
  whether focus view or filters are culling it, and where the operable
  equivalents are;
- a single polite live region (`graph-a11y-announcer`, `aria-atomic`) announces
  selection changes from any source: canvas tap, search, or table.

Wording is built by pure functions in
`apps/web/src/lib/components/graph/graph-a11y.ts` and unit-tested there.

**If you add graph state that changes what the user sees** (a new culling mode,
a new filter class), extend `buildGraphSummary` so the description stays true.

### 2. Every entity is reachable without a pointer

Three independent paths, none of which depend on the canvas:

| Path             | Entry point                                                                        |
| ---------------- | ---------------------------------------------------------------------------------- |
| Search           | Ctrl/Cmd+K, a combobox with a listbox                                              |
| Table            | **Browse as table** in the graph controls, and the Table item in the activity rail |
| Explorer sidebar | The Entities tool in the activity rail                                             |

The **Browse as table** link is worded exactly as the graph's hidden description
names it. If one changes, change both, or the instruction stops matching the
control.

### 3. Relationship direction survives without sight

Connection lists state direction in text ("Outgoing connection:", "Incoming
connection:", "Child of this entity:"), never by icon shape or dot colour alone.
This holds in `DetailStatusTab`, `ZenContent`, and `ZenSidebar`.

Row actions name their target ("Delete connection to Kara"), because a list of
identically named buttons is unusable in a screen reader's element list.

The `*` past-label marker has no visible legend anywhere in the app, so every
surface that renders it pairs it with screen-reader text: `DetailStatusTab`,
`DetailHeader`, `NodeReadModal`, `EntityListItem`, `MapPinPopover`, `PinLinker`,
`TokenAddDialog`.

### 4. Focus is not stranded across view changes

Navigating graph to table to entity detail must leave focus inside the live
document. SvelteKit's default of resetting focus after client-side navigation is
acceptable; focus landing on a detached node is not.

## What the automated scan does and does not cover

`a11y-workspace.spec.ts` runs axe against three states (graph, table, entity
detail) with the `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa` tags, and fails
on `serious` and `critical` violations. Lower impacts print for triage without
gating.

Two deliberate design choices in that spec:

- **Tab order is computed, not walked.** In dev and staging builds the
  DebugConsole overlay re-renders as log lines arrive and drops focus back to
  `body`, so a press-Tab-until-found loop measures the overlay rather than the
  workspace. Membership in the document's tab order is the property that
  matters and it is stable.
- **`color-contrast` is reported but does not gate.** See the known gap below.

Axe cannot tell you the graph is unusable, that an announcement arrives at the
wrong moment, or that a label is technically present but meaningless. It is a
floor, not the contract.

## Known gaps

| Gap                      | Detail                                                                                                                                                                                                                  | Status                                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme contrast           | Three controls in the entity detail measure 2.70, 2.75, and 3.39 against the 4.5 AA threshold for small bold text. The colours come from shared theme tokens, so raising them is a palette decision across every theme. | Open. Needs a design pass; when it lands, delete `color-contrast` from `NON_BLOCKING_RULES` so the scan gates on it.                                                          |
| Graph node traversal     | There is no way to walk from a node to its neighbours on the canvas itself. The entity detail's connection list provides this in the DOM.                                                                               | Accepted for now. If the screen-reader pass shows it is needed, the cheap version is a roving list of the selected node plus its neighbours, not a mirror of the whole graph. |
| CI timing                | Playwright runs on a daily schedule (`.github/workflows/daily-e2e.yml`), not on pull requests, so this spec does not gate a merge.                                                                                      | Open decision: move it into the PR workflow, or accept next-day detection.                                                                                                    |
| Staging-only focus churn | The DebugConsole overlay renders in dev and staging (`VITE_STAGING`), and its re-render drops keyboard focus. Production is unaffected.                                                                                 | Accepted; noted so the next person does not chase it as a product bug.                                                                                                        |

## Manual screen-reader pass

Automation covers none of the judgement. Run this before claiming a graph,
table, or entity-detail change is accessible. Roughly fifteen minutes.

**Setup:** a vault with at least ten entities and several connections, one of
them labelled `past`. Use VoiceOver (macOS, Cmd+F5), NVDA (Windows), or Orca
(Linux).

1. **Land on the graph.** Does the screen reader describe a knowledge graph with
   a scale, rather than announcing an unlabelled region or silence? Does it tell
   you where to go instead of the canvas?
2. **Follow the instruction.** The description names "Browse as table". Navigate
   by control, find that exact wording, activate it. If you had to guess, the
   wording has drifted.
3. **Read the table.** Are columns announced as a table with headers and sort
   state? Can you reach a row's entity by link, not by coordinate?
4. **Open an entity.** Does focus land somewhere sensible, and can you get back?
5. **Read the connections.** For each connection, can you tell inbound from
   outbound without seeing the icon? Does a `past`-labelled name announce
   "(past)" rather than an unexplained "star"?
6. **Delete the right thing.** Pull up the element list of buttons. Can you tell
   the twelve delete buttons apart?
7. **Select from elsewhere.** With the graph open, select an entity through
   search. Is the selection announced once, politely, without interrupting?
8. **Interrupt it.** Change selection twice quickly. Do you get one coherent
   announcement per change, or a stutter of partial messages?

Record the date, the reader, and anything that failed at the bottom of this file
in a `## Pass log` section.
