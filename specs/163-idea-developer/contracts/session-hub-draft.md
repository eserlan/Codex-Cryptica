# Contract: Session Hub draft

The first completed development adds the conversation's draft with `sessionHubStore.addEntity()`. Later turns update that same draft with `updateEntity()`. Nothing in the hub store changes.

| `SessionEntity` field | Value                                                                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`                | `"note"`, the type existing generator hub drafts use (`SEOGeneratorLayout.svelte`), which also satisfies the save flow's `ImportDraft`.                                                                                                          |
| `title`               | Short title derived from the idea's first clause (bounded length).                                                                                                                                                                               |
| `summary`             | The idea's core, stated in one or two sentences, at most 180 characters. Generators fold hub drafts into prompts using `summary` first, truncated to 180 characters (`getSessionContext`), so the idea must lead here or it is lost on hand-off. |
| `content`             | The current development as readable text, with the original idea quoted at the top. Replaced on each turn.                                                                                                                                       |
| `labels`              | `["idea-developer", <mode id>]` (labels, per Principle XII).                                                                                                                                                                                     |
| `status`              | `"draft"`                                                                                                                                                                                                                                        |
| `reuseEnabled`        | `true` (this is what makes generators pick it up)                                                                                                                                                                                                |
| `pinned`              | `false`                                                                                                                                                                                                                                          |
| `selectedForSave`     | `true` (the hub's existing default)                                                                                                                                                                                                              |

## Behaviour

- One draft per conversation, updated in place each turn. Starting a new conversation adds a new draft; the old one stays until the user removes it.
- Refining or saving uses the hub's existing controls. Sharing uses the hub's existing snapshot share, which is an explicit user action and the one case where result text leaves the browser (FR-031, FR-023).
- The `Conversation.hubDraftId` links the tool's restore copy to this draft. Removing the draft in the hub clears the restore copy; clearing in the tool removes both.

## Tests

- The draft's `summary` leads with the idea and is at most 180 characters, and stays so after later turns.
- A second turn updates the existing draft rather than adding another.
- `getSessionContext()` returns a line for the draft when `reuseEnabled` is true, and none when it is false.
- Each catalogue generator reads hub context (per-entry check).
