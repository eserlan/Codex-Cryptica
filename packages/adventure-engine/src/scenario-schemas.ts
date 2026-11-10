import { z } from "zod";

const id = z.string().trim().min(1).max(160);
const text = z.string().trim().min(1).max(600);
const eventSecretBindings = z.unknown().transform((value, context) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    context.addIssue({
      code: "custom",
      message: "invalid-event-secret-bindings",
    });
    return {};
  }

  const entries: Array<[string, string]> = [];
  for (const [eventId, secretId] of Object.entries(value)) {
    const parsedEventId = id.safeParse(eventId);
    const parsedSecretId = id.safeParse(secretId);
    if (!parsedEventId.success || !parsedSecretId.success) {
      context.addIssue({
        code: "custom",
        message: "invalid-event-secret-binding",
      });
      continue;
    }
    entries.push([parsedEventId.data, parsedSecretId.data]);
  }
  return Object.fromEntries(entries);
});

function hasStableOriginIdentity(value: {
  kind: "rumour" | "manual";
  batchId?: string;
  index?: number;
  sourceRecordId?: string;
  sourceFingerprint?: string;
  legacySessionId?: string;
  legacyScenarioId?: string;
  manualId?: string;
}): boolean {
  return value.kind === "manual"
    ? Boolean(value.manualId || hasLegacyOriginIdentity(value))
    : Boolean(
        hasRumourBatchIdentity(value) ||
        hasRumourSourceIdentity(value) ||
        hasLegacyOriginIdentity(value),
      );
}

function hasLegacyOriginIdentity(value: {
  legacySessionId?: string;
  legacyScenarioId?: string;
}): boolean {
  return Boolean(value.legacySessionId && value.legacyScenarioId);
}

function hasRumourBatchIdentity(value: {
  batchId?: string;
  index?: number;
}): boolean {
  return Boolean(value.batchId && value.index);
}

function hasRumourSourceIdentity(value: {
  sourceRecordId?: string;
  sourceFingerprint?: string;
  index?: number;
}): boolean {
  return Boolean(
    value.sourceRecordId && value.sourceFingerprint && value.index,
  );
}

const origin = z
  .object({
    kind: z.enum(["rumour", "manual"]),
    batchTitle: text.optional(),
    batchId: id.optional(),
    manualId: id.optional(),
    legacySessionId: id.optional(),
    legacyScenarioId: id.optional(),
    index: z.number().int().min(1).max(6).optional(),
    sourceRecordId: id.optional(),
    sourceFingerprint: id.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!hasStableOriginIdentity(value))
      context.addIssue({
        code: "custom",
        message: "missing-scenario-origin-identity",
      });
  });

const event = z
  .object({
    id,
    kind: z.enum(["discovery", "consequence", "status-change"]),
    visibility: z.enum(["player", "gm"]),
    text,
    at: z.string().datetime({ offset: true }),
    turnId: id.optional(),
    causedBy: z
      .object({
        scenarioId: id,
        eventId: id,
        anchorRef: id,
      })
      .strict()
      .optional(),
  })
  .strict();

export const scenarioItemSchema = z
  .object({
    version: z.literal(1),
    id,
    origin,
    playerVisible: z
      .object({ rumour: text, lead: text, source: text.optional() })
      .strict(),
    gmOnly: z.object({ truth: text, ifInvestigated: text.optional() }).strict(),
    knowledge: z.enum(["unheard", "heard"]),
    stage: z
      .enum(["hearsay", "actionable-clue", "revelation-crisis"])
      .default("hearsay"),
    status: z.enum(["open", "resolved", "abandoned"]),
    events: z.array(event).max(100),
    anchorRefs: z.array(id).max(12),
    revealedSecretIds: z.array(id).max(102).default([]),
    secretBindings: z
      .object({
        truth: id,
        ifInvestigated: id.optional(),
        eventIds: eventSecretBindings,
      })
      .strict(),
  })
  .strict()
  .superRefine((item, context) => {
    const bound = new Set([
      item.secretBindings.truth,
      ...(item.secretBindings.ifInvestigated
        ? [item.secretBindings.ifInvestigated]
        : []),
      ...Object.values(item.secretBindings.eventIds),
    ]);
    if (
      item.events.some(
        (entry) =>
          entry.visibility === "gm" &&
          !Object.hasOwn(item.secretBindings.eventIds, entry.id),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "missing-gm-event-secret-binding",
      });
    }
    if (item.revealedSecretIds.some((id) => !bound.has(id))) {
      context.addIssue({
        code: "custom",
        message: "unknown-revealed-scenario-secret",
      });
    }
  });

export const scenarioCollectionSchema = z
  .object({
    version: z.literal(1),
    items: z.array(scenarioItemSchema).max(8),
    focusedScenarioId: id.nullable(),
  })
  .strict()
  .superRefine((collection, context) => {
    const itemIds = new Set(collection.items.map((item) => item.id));
    if (
      collection.focusedScenarioId !== null &&
      !collection.items.some(
        (item) =>
          item.id === collection.focusedScenarioId &&
          item.knowledge === "heard" &&
          item.status === "open",
      )
    ) {
      context.addIssue({ code: "custom", message: "invalid-scenario-focus" });
    }
    if (itemIds.size !== collection.items.length) {
      context.addIssue({ code: "custom", message: "duplicate-scenario-id" });
    }
    const eventIds = collection.items.flatMap((item) =>
      item.events.map((entry) => entry.id),
    );
    if (new Set(eventIds).size !== eventIds.length) {
      context.addIssue({
        code: "custom",
        message: "duplicate-scenario-event-id",
      });
    }
    const secretIds = collection.items.flatMap((item) => [
      item.secretBindings.truth,
      ...(item.secretBindings.ifInvestigated
        ? [item.secretBindings.ifInvestigated]
        : []),
      ...Object.values(item.secretBindings.eventIds),
    ]);
    const allIds = [...itemIds, ...eventIds, ...secretIds];
    if (new Set(allIds).size !== allIds.length) {
      context.addIssue({
        code: "custom",
        message: "scenario-identity-collision",
      });
    }
  });

export type ScenarioCollectionInput = z.input<typeof scenarioCollectionSchema>;
export type ScenarioItemOutput = z.output<typeof scenarioItemSchema>;

export function scenarioItemIdentityIds(item: ScenarioItemOutput): string[] {
  return [
    item.id,
    ...item.events.map((entry) => entry.id),
    item.secretBindings.truth,
    ...(item.secretBindings.ifInvestigated
      ? [item.secretBindings.ifInvestigated]
      : []),
    ...Object.values(item.secretBindings.eventIds),
  ];
}
