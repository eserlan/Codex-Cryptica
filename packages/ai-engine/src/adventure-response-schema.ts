import {
  parseTurnProposal,
  type AdventureTurnProposal,
} from "@codex/adventure-engine";

const idSchema = { type: "string", minLength: 1 } as const;
const textSchema = { type: "string", minLength: 1, maxLength: 600 } as const;
const diceExpressionSchema = {
  ...textSchema,
  pattern:
    "^\\s*(?:\\d*d\\d+(?:!|kh\\d*|kl\\d*)*|\\d+)(?:\\s*[+-]\\s*(?:\\d*d\\d+(?:!|kh\\d*|kl\\d*)*|\\d+))*\\s*$",
} as const;

const stateFactSchema = {
  type: "object",
  required: ["id", "text", "source"],
  properties: {
    id: idSchema,
    text: textSchema,
    source: {
      type: "string",
      enum: ["canonical", "provisional", "revealed-secret"],
    },
    sourceRecordId: idSchema,
  },
} as const;

const newStateFactSchema = {
  type: "object",
  required: ["text", "source"],
  properties: {
    text: textSchema,
    source: stateFactSchema.properties.source,
    sourceRecordId: idSchema,
  },
} as const;

const relationshipSchema = {
  ...stateFactSchema,
  required: [...stateFactSchema.required, "subjectId", "disposition"],
  properties: {
    ...stateFactSchema.properties,
    subjectId: idSchema,
    disposition: textSchema,
  },
} as const;

const newRelationshipSchema = {
  ...newStateFactSchema,
  required: [...newStateFactSchema.required, "subjectId", "disposition"],
  properties: {
    ...newStateFactSchema.properties,
    subjectId: idSchema,
    disposition: textSchema,
  },
} as const;

const hiddenSecretSchema = {
  type: "object",
  required: ["id", "text", "status"],
  properties: {
    id: idSchema,
    text: textSchema,
    status: { type: "string", enum: ["hidden", "revealed"] },
    revealCondition: textSchema,
    revealedOnTurnId: idSchema,
  },
} as const;

const newHiddenSecretSchema = {
  type: "object",
  required: ["text", "status"],
  properties: {
    text: textSchema,
    status: hiddenSecretSchema.properties.status,
    revealCondition: textSchema,
  },
} as const;

const hiddenThreadSchema = {
  type: "object",
  required: ["id", "text", "status"],
  properties: {
    id: idSchema,
    text: textSchema,
    status: { type: "string", enum: ["hidden", "revealed"] },
    revealCondition: textSchema,
  },
} as const;

const newHiddenThreadSchema = {
  type: "object",
  required: ["text", "status"],
  properties: {
    text: textSchema,
    status: hiddenThreadSchema.properties.status,
    revealCondition: textSchema,
  },
} as const;

const provisionalFactSchema = {
  type: "object",
  required: ["id", "kind", "name", "summary", "visibility"],
  properties: {
    id: idSchema,
    kind: {
      type: "string",
      enum: ["person", "place", "faction", "item", "event", "clue", "other"],
    },
    name: textSchema,
    summary: textSchema,
    visibility: { type: "string", enum: ["player-visible", "gm-only"] },
  },
} as const;

const newProvisionalFactSchema = {
  type: "object",
  required: ["kind", "name", "summary", "visibility"],
  properties: {
    kind: provisionalFactSchema.properties.kind,
    name: textSchema,
    summary: textSchema,
    visibility: provisionalFactSchema.properties.visibility,
    scenarioId: idSchema,
  },
} as const;

const scenarioElaborationSchema = {
  type: "object",
  required: ["scenarioId", "stage"],
  properties: {
    scenarioId: idSchema,
    stage: {
      type: "string",
      enum: ["hearsay", "actionable-clue", "revelation-crisis"],
    },
    discovery: textSchema,
  },
} as const;

function patchSchema(
  addItemSchema: Record<string, unknown>,
  updateItemSchema: Record<string, unknown>,
) {
  return {
    type: "object",
    required: ["add", "update", "removeIds"],
    properties: {
      add: { type: "array", items: addItemSchema },
      update: { type: "array", items: updateItemSchema },
      removeIds: { type: "array", items: idSchema },
    },
  } as const;
}

const bandSchema = {
  type: "object",
  required: ["id", "label"],
  properties: {
    id: idSchema,
    label: textSchema,
    minimum: { type: "number" },
    maximum: { type: "number" },
  },
} as const;

export const adventureTurnResponseSchema = {
  oneOf: [
    {
      type: "object",
      required: [
        "kind",
        "narration",
        "visiblePatch",
        "hiddenPatch",
        "revealSecretIds",
        "provisionalFacts",
        "sourceRecordIds",
      ],
      properties: {
        kind: { type: "string", enum: ["complete"] },
        narration: { ...textSchema, maxLength: 2_000 },
        timeAdvance: {
          type: "object",
          required: ["minutes", "cause", "developments"],
          properties: {
            minutes: { type: "integer", minimum: 1, maximum: 43200 },
            cause: textSchema,
            developments: {
              type: "array",
              maxItems: 3,
              items: {
                type: "object",
                required: ["threadId", "text"],
                properties: { threadId: idSchema, text: textSchema },
              },
            },
          },
        },
        moveTo: {
          type: "object",
          properties: {
            placeId: idSchema,
            name: { ...textSchema, maxLength: 120 },
            relation: textSchema,
          },
        },
        visiblePatch: {
          type: "object",
          properties: {
            location: { anyOf: [newStateFactSchema, { type: "null" }] },
            situation: { anyOf: [newStateFactSchema, { type: "null" }] },
            objectives: patchSchema(newStateFactSchema, stateFactSchema),
            activeCharacters: patchSchema(newStateFactSchema, stateFactSchema),
            knownFacts: patchSchema(newStateFactSchema, stateFactSchema),
            relationships: patchSchema(
              newRelationshipSchema,
              relationshipSchema,
            ),
          },
          required: [
            "objectives",
            "activeCharacters",
            "knownFacts",
            "relationships",
          ],
        },
        hiddenPatch: {
          type: "object",
          properties: {
            secrets: patchSchema(newHiddenSecretSchema, hiddenSecretSchema),
            gmThreads: patchSchema(newHiddenThreadSchema, hiddenThreadSchema),
          },
          required: ["secrets", "gmThreads"],
        },
        revealSecretIds: { type: "array", items: { type: "string" } },
        revealScenarioIds: { type: "array", items: idSchema },
        elaborateScenarios: { type: "array", items: scenarioElaborationSchema },
        provisionalFacts: { type: "array", items: newProvisionalFactSchema },
        sourceRecordIds: { type: "array", items: idSchema },
        suggestedActions: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: textSchema,
        },
      },
    },
    {
      type: "object",
      required: ["kind", "uncertainty", "stakes", "sourceRecordIds"],
      properties: {
        kind: { type: "string", enum: ["roll-required"] },
        setupNarration: { ...textSchema, maxLength: 2_000 },
        uncertainty: textSchema,
        stakes: textSchema,
        dice: {
          type: "object",
          properties: {
            expression: diceExpressionSchema,
            outcomeBands: { type: "array", items: bandSchema },
          },
          required: ["expression", "outcomeBands"],
        },
        sourceRecordIds: { type: "array", items: idSchema },
        suggestedActions: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: textSchema,
        },
      },
    },
  ],
} as const;

export function parseAdventureResponse(text: string): AdventureTurnProposal {
  try {
    return parseTurnProposal(JSON.parse(text));
  } catch {
    throw new Error("invalid-adventure-response");
  }
}

export function buildAdventureContentInput(serialized: string) {
  return {
    contents: [{ role: "user", parts: [{ text: serialized }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: adventureTurnResponseSchema,
    },
  };
}
