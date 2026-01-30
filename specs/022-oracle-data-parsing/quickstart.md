# Quickstart: Oracle Parser Integration

## Using the Parser

The parser is located in `@codex/editor-core`.

```typescript
import { parseOracleOutput } from '@codex/editor-core';

const rawOutput = "## Chronicle\nA brave hero.\n\n## Lore\nBorn in the mountains...";
const { chronicle, lore, wasSplit } = parseOracleOutput(rawOutput);

if (wasSplit) {
  // Apply to node fields
  vault.updateEntity(id, { content: chronicle, lore: lore });
}
```

## UI Components

The `ChatMessage.svelte` component uses the `OracleParseResult` to decide whether to show the "Intelligent Apply" button.

```svelte
<!-- ChatMessage.svelte -->
{@const parsed = parseOracleOutput(message.content)}
{#if parsed.wasSplit}
  <button onclick={() => applyIntelligent(parsed)}>
     APPLY ALL TO NODE
  </button>
{/if}
```

```