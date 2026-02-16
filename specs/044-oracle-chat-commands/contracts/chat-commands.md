# Contracts: Oracle Chat Commands

## AIService Extensions

```typescript
/**
 * Generates a connection proposal between two entities.
 * Requires full entity objects (Lore + Chronicle) for semantic comparison.
 */
async generateConnectionProposal(
  apiKey: string,
  modelName: string,
  source: Entity,
  target: Entity
): Promise<ConnectionProposal>;

/**
 * Parses a natural language string into connection components.
 */
async parseConnectionIntent(
  apiKey: string,
  modelName: string,
  input: string
): Promise<{ sourceName: string; targetName: string; type?: string; label?: string }>;

interface ConnectionProposal {
  type: 'related_to' | 'neutral' | 'friendly' | 'enemy';
  label: string;
  explanation: string;
}
```

## Chat Command Registry

```typescript
export interface ChatCommand {
  name: string;
  description: string;
  parameters?: string[];
  handler: (args: string) => Promise<void> | void;
}

export const chatCommands: ChatCommand[] = [
  {
    name: "/draw",
    description: "Visualize something with AI",
    parameters: ["[subject]"],
    handler: (subject) => oracle.ask(`/draw ${subject}`),
  },
  {
    name: "/create",
    description: "Create a new record with AI",
    parameters: ["[description]"],
    handler: (desc) => oracle.ask(`/create ${desc}`),
  },
  {
    name: "/connect",
    description: "Link entities with AI guidance",
    parameters: ["oracle"],
    handler: () => oracle.startWizard("connection"),
  },
];
```
