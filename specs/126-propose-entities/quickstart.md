# Quickstart: Propose Entities

## How to extract proposals

```typescript
import { extractProposals } from "@codex/editor-core/utils/text-parsing";

const markdown =
  "The **Crimson Guard** is a faction. [**The King**](entity:123) commands them.";
const existing = new Set(["The King"]); // Pretend "The King" is already an entity
const proposals = extractProposals(markdown, existing);
// proposals = ['Crimson Guard']
```

## How to accept a proposal

```typescript
import { getContext } from "svelte";

const entityProposalService = getContext("entityProposalService");

// User clicks on "Crimson Guard" proposal
async function onAccept(title: string) {
  const newEntity = await entityProposalService.acceptProposal(
    title,
    currentEntity.content,
  );
  // Navigate to newEntity or update UI
}
```
