# Quickstart: Context-Aware Entity Generator

This guide provides examples of how the new context-aware entity generation method is integrated and called in the codebase.

## 1. AI Text Generation Service Setup

```typescript
// apps/web/src/lib/services/ai/text-generation.service.svelte.ts

async generateRelatedEntity(
  apiKey: string,
  modelName: string,
  sourceEntity: {
    title: string;
    type: string;
    content?: string;
    lore?: string;
  },
  targetType: string,
  relationship: string,
  customInstructions?: string,
  connectedEntities?: ConnectedEntityPromptContext[],
  categories?: { id: string; label?: string }[],
  templateOutline?: string,
  options?: { isGuest?: boolean },
): Promise<{
  name: string;
  type: string;
  summary: string;
  description: string;
  labels?: string[];
  plotHook?: string;
  relationshipBack?: string;
}> {
  const prompt = buildRelatedEntityGenerationPrompt(
    sourceEntity,
    targetType,
    relationship,
    customInstructions,
    connectedEntities,
    categories,
    templateOutline,
  );

  const model = await this.aiClientManager.getModel(apiKey, modelName);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse and validate the response JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    name: parsed.name || "Unnamed Related Entity",
    type: parsed.type || targetType,
    summary: parsed.summary || "",
    description: parsed.description || "",
    labels: parsed.labels || [],
    plotHook: parsed.plotHook,
    relationshipBack: parsed.relationshipBack || relationship
  };
}
```

## 2. Dynamic Relationship Suggestion Helper

```typescript
export function getSuggestedRelationships(
  sourceType: string,
  targetType: string,
): string[] {
  const map: Record<string, Record<string, string[]>> = {
    character: {
      character: ["ally", "rival", "mentor", "enemy", "relative"],
      item: ["signature item", "stolen item", "inheritance", "cursed object"],
      location: ["resident", "local ruler", "visitor", "exile"],
    },
    faction: {
      character: ["leader", "agent", "founder", "defector", "spy"],
      location: ["headquarters", "safehouse", "sacred site"],
    },
  };
  return map[sourceType]?.[targetType] || ["related_to", "associated_with"];
}
```
