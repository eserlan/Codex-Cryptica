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

const npcCuesSchema = {
  type: "array",
  maxItems: 4,
  items: { type: "string", maxLength: 40 },
} as const;

const activeCharacterSchema = {
  ...stateFactSchema,
  properties: {
    ...stateFactSchema.properties,
    cues: npcCuesSchema,
  },
} as const;

const newActiveCharacterSchema = {
  ...newStateFactSchema,
  properties: {
    ...newStateFactSchema.properties,
    cues: npcCuesSchema,
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

const newCausalCommitmentSchema = {
  type: "object",
  required: ["kind", "commitmentClass", "subject", "summary"],
  properties: {
    kind: {
      type: "string",
      enum: ["motive", "mechanism", "identity", "action", "link"],
    },
    commitmentClass: {
      type: "string",
      enum: ["supporting-explanation", "belief-testimony", "speculative-plan"],
    },
    subject: textSchema,
    summary: textSchema,
    actorRef: {
      type: "object",
      required: ["tier", "value"],
      properties: {
        tier: {
          type: "string",
          enum: ["source-record", "provisional-fact", "name"],
        },
        value: textSchema,
      },
    },
    scenarioId: idSchema,
    contested: { type: "boolean" },
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

const placeCuesSchema = {
  type: "array",
  maxItems: 8,
  items: { type: "string", minLength: 1, maxLength: 32 },
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
      propertyOrdering: [
        "kind",
        "hiddenPatch",
        "revealSecretIds",
        "revealScenarioIds",
        "packageEvents",
        "actorEvents",
        "elaborateScenarios",
        "narration",
        "timeAdvance",
        "moveTo",
        "placeCues",
        "personRefs",
        "visiblePatch",
        "provisionalFacts",
        "causalCommitments",
        "sourceRecordIds",
        "suggestedActions",
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
            cues: placeCuesSchema,
          },
        },
        placeCues: placeCuesSchema,
        personRefs: {
          type: "array",
          maxItems: 8,
          items: idSchema,
        },
        packageEvents: {
          type: "array",
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              recordId: idSchema,
              kind: {
                type: "string",
                enum: ["scene", "encounter", "clue", "secret"],
              },
              to: {
                type: "string",
                enum: [
                  "unvisited",
                  "available",
                  "active",
                  "resolved",
                  "altered",
                  "skipped",
                ],
              },
              certainty: { type: "string", enum: ["claimed", "confirmed"] },
              note: { ...textSchema, maxLength: 240 },
              supersedes: idSchema,
            },
            required: ["recordId", "kind", "to", "certainty", "note"],
          },
        },
        actorEvents: {
          type: "array",
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              actorId: idSchema,
              status: {
                type: "string",
                enum: ["present", "absent", "dead"],
              },
              disposition: {
                type: "string",
                enum: ["hostile", "wary", "neutral", "friendly", "allied"],
              },
              fact: { ...textSchema, maxLength: 160 },
              certainty: { type: "string", enum: ["claimed", "confirmed"] },
              note: { ...textSchema, maxLength: 240 },
              supersedes: idSchema,
            },
            required: ["actorId", "certainty", "note"],
          },
        },
        sceneTransition: {
          type: "object",
          properties: {
            sceneId: idSchema,
            title: { ...textSchema, maxLength: 120 },
          },
        },
        visiblePatch: {
          type: "object",
          properties: {
            packageSceneId: idSchema,
            location: { anyOf: [newStateFactSchema, { type: "null" }] },
            situation: { anyOf: [newStateFactSchema, { type: "null" }] },
            objectives: patchSchema(newStateFactSchema, stateFactSchema),
            activeCharacters: patchSchema(
              newActiveCharacterSchema,
              activeCharacterSchema,
            ),
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
        causalCommitments: {
          type: "array",
          maxItems: 4,
          items: newCausalCommitmentSchema,
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
    {
      type: "object",
      required: ["kind", "uncertainty", "stakes", "sourceRecordIds"],
      propertyOrdering: [
        "kind",
        "setupNarration",
        "uncertainty",
        "stakes",
        "dice",
        "sourceRecordIds",
        "suggestedActions",
      ],
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

export interface InvalidAdventureResponseError extends Error {
  validationHint?: string;
}

function summarizeValidationError(cause: unknown): string {
  if (cause instanceof SyntaxError) return "Response was not valid JSON.";
  if (
    cause &&
    typeof cause === "object" &&
    "issues" in cause &&
    Array.isArray((cause as { issues?: unknown[] }).issues)
  ) {
    const issues = (
      cause as {
        issues: Array<{ path?: Array<string | number>; message?: string }>;
      }
    ).issues
      .slice(0, 4)
      .map((issue) => {
        const path =
          issue.path && issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${path}: ${issue.message ?? "invalid"}`;
      });
    if (issues.length > 0) return issues.join("; ").slice(0, 300);
  }
  return "Schema validation failed.";
}

function stripSingleJsonFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(trimmed);
  return match ? match[1]!.trim() : trimmed;
}

export function parseAdventureResponse(text: string): AdventureTurnProposal {
  try {
    return parseTurnProposal(JSON.parse(stripSingleJsonFence(text)));
  } catch (cause) {
    const error = new Error(
      "invalid-adventure-response",
    ) as InvalidAdventureResponseError;
    error.validationHint = summarizeValidationError(cause);
    throw error;
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

export function isInvalidAdventureResponse(
  error: unknown,
): error is InvalidAdventureResponseError {
  return (
    error instanceof Error && error.message === "invalid-adventure-response"
  );
}
