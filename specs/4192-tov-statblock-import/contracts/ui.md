# Contract: UI surfaces

All new components use Svelte 5 runes, Tailwind 4 semantic tokens and Iconify classes (`docs/STYLE_GUIDE.md`). Field states are shown by **icon + text label**, never by colour alone.

## Entry points

| Surface                                                   | Control                                                                                 | Visible when (FR-001/002/002a)                                     |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `DetailStatsTab.svelte` header                            | **Import** button (`aria-label="Import stat block"`), `data-testid="stat-sheet-import"` | Not guest, and (vault is ToV or the sheet's template is a ToV one) |
| `VaultControls.svelte` new-entity form                    | **From stat block** button, `data-testid="new-entity-from-stat-block"`                  | Vault is ToV                                                       |
| `MobileCreateEntitySheet.svelte` footer, next to GENERATE | **FROM STAT BLOCK** button, `data-testid="mobile-new-from-stat-block"`                  | Vault is ToV                                                       |

All three call `modalUIStore.openStatBlockImport({ entityId?: string })`.

## `StatBlockImportModal.svelte` (new, mounted in `GlobalModalProvider`)

Steps: **Paste → Review → (Confirm overwrites) → Saved**.

| Step       | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Paste      | Textarea (also accepts dropped `.json`); mode radio **Copy as written** / **Convert from 5e** (hidden when AI is off); privacy line (FR-022); **Read stat block**.                                                                                                                                                                                                                                                                                                                         |
| Reading    | Spinner, Cancel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Review     | `StatBlockReview.svelte`: sheet type switch (Monster/NPC); fields grouped like the sheet; each row has a value input plus a state chip (`found`/`check this`/`not found`/`converted`/`worked out from CR`); source snippet under check rows; original under converted rows; leftovers list; **Keep the original text in notes** (unticked, with the share warning); notices (quick reader used / looks like 5e); missing-required message; **Save** (disabled until FR-015a) / **Cancel**. |
| Confirm    | Only when `MergePlan.overwrites` is non-empty: a list of "field: old → new", then **Replace these values** / **Back**.                                                                                                                                                                                                                                                                                                                                                                     |
| Name clash | New entity only, same title exists: **Open existing** / **Import into it** / **Create separate**.                                                                                                                                                                                                                                                                                                                                                                                          |

## Copy (plain language, Constitution IX)

- Privacy line: "Your pasted text is sent to the AI to read the stat block. It isn't kept."
- Quick reader notice: "AI is off, so a quick reader was used. Some fields may need filling in by hand."
- 5e notice: "This looks like a 5e stat block. Want to convert it to Tales of the Valiant instead?"
- Share warning: "Notes are included when you share or publish this vault."
