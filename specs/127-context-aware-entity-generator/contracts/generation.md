# Contract: Related Entity Generator Prompt & Output Schema

This document defines the interface contract for prompt compile format and the strictly enforced JSON response shape expected from the Gemini AI model.

## AI Response Output Schema (JSON)

The AI model is instructed to output a valid JSON object matching the following structure:

```json
{
  "name": "Name of the new entity",
  "type": "The category/type of the new entity (must match one of the allowed categories)",
  "summary": "Chronicle content: A 1-2 paragraph description summarizing who/what this entity is.",
  "description": "Lore content: Rich background, motivations, secrets, or history.",
  "labels": ["label1", "label2"],
  "plotHook": "Optional plot hook linking this entity back to the world/source entity",
  "relationshipBack": "The relationship label representing the connection from the Source Entity → New Entity"
}
```

## Prompt Construction Contract

The prompt builder `buildRelatedEntityGenerationPrompt` combines:

1. **Source Entity Context**: Title, type, content (chronicle), and lore (lore).
2. **Neighbor Context**: Array of directly connected entities with title, type, connection type, and content (chronicle).
3. **Target Type & Relationship**: The configured output format.
4. **Active Categories**: List of categories available in the vault.
5. **Instructions/Constraints**: Instructions on keeping the new entity grounded in the source context, using vault-allowed categories, using "Labels" instead of "Tags", and formatting output strictly as JSON.
