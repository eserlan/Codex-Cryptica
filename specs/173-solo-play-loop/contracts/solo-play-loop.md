# Contracts: Solo Play Loop

Every interface below is tested before it is implemented (Constitution II), with a success path and at least one failure or negative path.

## 1. `packages/session-journal-engine` (extended)

```ts
// capture.ts
export function formatGeneratedResult(input: {
  generatorId: string;
  title: string;
  summary?: string;
}): JournalCapturePayload; // entryType "generated-result"
export function formatGeneratedSaved(input: {
  title: string;
  category: string;
}): JournalCapturePayload; // entryType "generated-saved"
export function formatPartyChange(input: {
  joined: string[];
  left: string[];
}): JournalCapturePayload | null; // entryType "party-change"; null when nothing changed

// recent.ts
export function recentResults(
  entries: readonly JournalEntry[],
  limit?: number,
): JournalEntry[]; // excludes party-change and generated-saved
```

**Tests**:

- **Formatters**: each produces the documented content. A missing or blank title gives a payload that `captureToEntryInput` rejects. A summary over the limit is clamped. `formatPartyChange` returns null when nothing changed.
- **`recentResults`**: newest first, limited, excludes `party-change` and `generated-saved` (bookkeeping entries), and returns `[]` for an empty journal.

## 2. `packages/solo-session-engine` (extended)

```ts
// session.ts: SoloSession gains partyIds: string[] and scenes: SoloScene[]
export interface SoloScene {
  name: string;
  sectionId: string | null;
}
export function withParty(
  session: SoloSession,
  ids: readonly string[],
): SoloSession; // dedupe, ≤12
export function withSceneAdded(
  session: SoloSession,
  name: string,
  sectionId: string | null,
): SoloSession;
export function withCurrentSceneRenamed(
  session: SoloSession,
  name: string,
): SoloSession;
export function nextVisitName(
  scenes: readonly SoloScene[],
  index: number,
): string | null; // "Arrival (2)"; null if out of range

// defaults.ts
export function suggestCategory(
  entryType: string,
  generatorId: string | null,
  categoryIds: readonly string[], // the vault's categories; fall back to "note" when the suggestion is missing
): string;
export type OracleShortcut =
  "npc-reaction" | "complication" | "place-knowledge" | "what-next";
export function buildOracleShortcutPrompt(
  kind: OracleShortcut,
  context: {
    sceneName: string;
    mapName: string | null;
    partyNames: string[];
    recent: string[];
  },
): string; // ≤ 1,200 characters
```

**Tests**:

- **Parsing**: a Phase 1 record without the new fields parses with the defaults. Each malformed new field reads as null, for example 13 party ids, a duplicate id, or a scene name over 80 characters.
- **`withParty`** deduplicates and clamps.
- **`nextVisitName`** numbers visits per base name ("Arrival" → "Arrival (2)" → "Arrival (3)", and a revisit of "Arrival (2)" also gives "Arrival (3)") and returns null out of range.
- **`suggestCategory`**: npc → character; rumour → note; encounter → event, or note when the vault has no Event category; unknown → note.
- **Prompt builder**:
  - each kind starts with its question;
  - the context includes only the parts that are present;
  - recent items are clamped to 120 characters and at most 10;
  - the total is at most 1,200 characters;
  - no prompt contains wording that asks the Oracle to act as game master. The test checks for "game master", "GM" and "run the game".

## 3. Stores and services (`apps/web/src/lib`)

### `SoloSessionStore` (extended)

```ts
// New constructor dependency: publishCapture(payload: JournalCapturePayload): void (emits JOURNAL:CAPTURE)
setParty(ids: string[]): Promise<void>;          // records party-change when the journal runs
returnToScene(index: number): Promise<boolean>;  // starts a numbered new visit
readonly party: { id: string; name: string }[];  // resolved, missing ids dropped
readonly scenes: SoloScene[];
```

### `SoloTablePinsStore` (new): `stores/solo-table-pins.svelte.ts`

```ts
constructor(deps: { storage: StorageLike; vaultId(): string | null; tableIds(): string[] })
readonly pins: string[];               // resolved against existing tables
pin(id: string): boolean;              // false when full (3) or unknown
unpin(id: string): void;
```

### `recordTableRoll`: `services/record-table-roll.ts`

The function is extracted from `TableRoller.svelte` with its behaviour unchanged. `TableRoller` keeps its own tests, and the extracted function gains tests.

### `publishGeneratedCapture`, `publishGeneratedSaved`: `services/generator-journal-capture.ts`

Both emit `JOURNAL:CAPTURE` on the injected bus, and both swallow and log errors so generation and saving never fail because of the journal.

### `soloPromoter`

A `SessionJournalPromoter` instance whose `openEntity` and `closePanel` are no-ops and whose `notify` calls `notificationStore`.

### Oracle `ui` manager

```ts
pendingPrompt: string | null;
setPendingPrompt(text: string): void;   // trimmed, empty → null
takePendingPrompt(): string | null;     // returns and clears
```

**Tests**:

- **Party:** set, change and clear the party. A journal entry is written only while the journal runs. Missing members are dropped.
- **Scenes:** returning to a scene starts a numbered visit with a new section, and an index out of range does nothing.
- **Pins:** limit of 3, unknown ids, pruning, a storage read error, and each vault keeping its own pins.
- **Recording:** `recordTableRoll` calls `addResult(…, "table", { label, source })`.
- **Capture publishers:** each emits once, and a bus that throws does not throw out of the publisher.
- **Save path:** `soloPromoter` never calls the navigation dependencies.
- **Oracle UI:** `setPendingPrompt` followed by `takePendingPrompt` returns the text and then null.

## 4. Components (`apps/web/src/lib/components/solo/`)

| Component                     | Responsibility                                                                                                                                                                 | Key test ids                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `SoloGenerateMenu.svelte`     | NPC, Encounter, Rumour and Complication, each opening the existing generator, plus "All generators…" (the full picker); disabled with a reason when generators are unavailable | `solo-generate-menu`, `solo-generate-npc`, `solo-generate-all`, … |
| `SoloPinnedTables.svelte`     | Up to 3 pinned tables that roll inline, plus "Pin a table"                                                                                                                     | `solo-pinned-table`, `solo-pin-table`, `solo-table-result`        |
| `SoloRecentResults.svelte`    | The last 10 journal results, each with Save to Vault, or a note when no journal runs                                                                                           | `solo-recent-results`, `solo-save-result`                         |
| `SoloSaveResultDialog.svelte` | Category (suggested) and name, then Save; empty name refused; errors shown                                                                                                     | `solo-save-category`, `solo-save-name`, `solo-save-confirm`       |
| `SoloPartyMenu.svelte`        | Party chips that open entries, and a picker of Character entities                                                                                                              | `solo-party-menu`, `solo-party-member`                            |
| `SoloSceneMenu.svelte`        | The scene field from Phase 1, plus the scene list with the current one marked, Open and Return to scene                                                                        | `solo-scene-menu`, `solo-scene-item`                              |
| `SoloOracleMenu.svelte`       | Open Oracle and the four shortcuts; not rendered when AI is off                                                                                                                | `solo-oracle-menu`, `solo-oracle-shortcut`                        |

Existing files touched: `SoloActions.svelte` and `SoloSessionSheet.svelte` (composition), `SoloSetupDialog.svelte` (optional party picker), `SessionJournalView.svelte` (section filter and "Show all"), `quicknote.svelte.ts` (`openJournal({ sectionId })`), `OracleChat.svelte` (consumes `pendingPrompt`), `CampaignGeneratorModal.svelte` (two publisher calls) and `TableRoller.svelte` (uses `recordTableRoll`).

Every control has an accessible name, can be operated by keyboard, and appears in the phone sheet (FR-026).

## 5. Help and Cif

- New controls `solo-generate-menu`, `solo-recent-results`, `solo-pinned-tables`, `solo-party-menu`, `solo-scene-menu` and `solo-oracle-menu` (area `solo`, `requiresFlag: "solo-session"`). `solo-oracle-menu` is listed only while AI is on.
- `solo-session` article sections for each.
- New feature workflows.
- Five eval questions.
- Embeddings regenerated.
