import { z } from "zod";
import { id, text } from "./schema-primitives";

const stateFactSchema = z.object({
  id,
  text,
  source: z.enum(["canonical", "provisional", "revealed-secret"]),
  sourceRecordId: id.optional(),
  placeId: id.optional(),
  cues: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
});
const newStateFactSchema = stateFactSchema.omit({ id: true }).strict();

const relationshipSchema = stateFactSchema.extend({
  subjectId: id,
  disposition: text,
});
const newRelationshipSchema = relationshipSchema.omit({ id: true }).strict();

export const visibleStateSchema = z.object({
  location: stateFactSchema.optional(),
  situation: stateFactSchema.optional(),
  objectives: z.array(stateFactSchema).max(20),
  activeCharacters: z.array(stateFactSchema).max(30),
  knownFacts: z.array(stateFactSchema).max(60),
  relationships: z.array(relationshipSchema).max(40),
});

const hiddenSecretSchema = z.object({
  id,
  text,
  revealCondition: text.optional(),
  status: z.enum(["hidden", "revealed"]),
  revealedOnTurnId: id.optional(),
});
const newHiddenSecretSchema = hiddenSecretSchema
  .omit({ id: true, revealedOnTurnId: true })
  .strict();

const hiddenThreadSchema = z.object({
  id,
  text,
  status: z.enum(["hidden", "revealed"]),
  revealCondition: text.optional(),
});
const newHiddenThreadSchema = hiddenThreadSchema.omit({ id: true }).strict();

export const hiddenStateSchema = z.object({
  secrets: z.array(hiddenSecretSchema).max(60),
  gmThreads: z.array(hiddenThreadSchema).max(40),
});

export const provisionalFactSchema = z.object({
  id,
  kind: z.enum([
    "person",
    "place",
    "faction",
    "item",
    "event",
    "clue",
    "other",
  ]),
  name: text,
  summary: text,
  introducedOnTurnId: id.optional(),
  sourceOocExchangeId: id.optional(),
  provenance: z.enum(["play", "ooc"]).optional(),
  supersededById: id.optional(),
  aliases: z.array(text).max(8).optional(),
  visibility: z.enum(["player-visible", "gm-only"]),
  scenarioId: id.optional(),
});
export const newProvisionalFactSchema = provisionalFactSchema
  .omit({
    id: true,
    introducedOnTurnId: true,
    sourceOocExchangeId: true,
    provenance: true,
    supersededById: true,
    aliases: true,
  })
  .strict();

export const oocReplyClassificationSchema = z.enum([
  "established",
  "hypothetical",
  "meta-rules",
  "canon-conflict",
  "secret-refusal",
]);

export const newOocDecisionSchema = z
  .object({
    kind: provisionalFactSchema.shape.kind,
    name: text,
    summary: text,
    aliases: z.array(text).max(8).optional(),
    supersedesName: text.optional(),
    visibility: provisionalFactSchema.shape.visibility,
  })
  .strict();

export const causalCommitmentSchema = z.object({
  id,
  kind: z.enum(["motive", "mechanism", "identity", "action", "link"]),
  commitmentClass: z.enum([
    "supporting-explanation",
    "belief-testimony",
    "speculative-plan",
  ]),
  subject: text,
  summary: text,
  actorRef: z
    .object({
      tier: z.enum(["source-record", "provisional-fact", "name"]),
      value: text,
    })
    .strict()
    .optional(),
  scenarioId: id.optional(),
  status: z.enum(["committed", "contested"]),
  sourceTurnId: id,
  sourceRevision: z.number().int().nonnegative(),
});
export const newCausalCommitmentSchema = causalCommitmentSchema
  .omit({ id: true, status: true, sourceTurnId: true, sourceRevision: true })
  .extend({ contested: z.boolean().optional() })
  .strict();

const collectionPatch = <TAdd extends z.ZodType, TUpdate extends z.ZodType>(
  addSchema: TAdd,
  updateSchema: TUpdate,
) =>
  z.object({
    add: z.array(addSchema),
    update: z.array(updateSchema),
    removeIds: z.array(id),
  });

export const visiblePatchSchema = z.object({
  packageSceneId: z.string().min(1).optional(),
  location: newStateFactSchema.nullable().optional(),
  situation: newStateFactSchema.nullable().optional(),
  objectives: collectionPatch(newStateFactSchema, stateFactSchema),
  activeCharacters: collectionPatch(newStateFactSchema, stateFactSchema),
  knownFacts: collectionPatch(newStateFactSchema, stateFactSchema),
  relationships: collectionPatch(newRelationshipSchema, relationshipSchema),
});

export const hiddenPatchSchema = z.object({
  secrets: collectionPatch(newHiddenSecretSchema, hiddenSecretSchema),
  gmThreads: collectionPatch(newHiddenThreadSchema, hiddenThreadSchema),
});

// Committed turns are durable history, not model proposals. Their additions
// already have reducer-assigned IDs and must remain readable across schema
// changes.
const persistedCollectionPatch = <T extends z.ZodType>(schema: T) =>
  collectionPatch(schema, schema);

export const persistedVisiblePatchSchema = z.object({
  location: stateFactSchema.nullable().optional(),
  situation: stateFactSchema.nullable().optional(),
  objectives: persistedCollectionPatch(stateFactSchema),
  activeCharacters: persistedCollectionPatch(stateFactSchema),
  knownFacts: persistedCollectionPatch(stateFactSchema),
  relationships: persistedCollectionPatch(relationshipSchema),
});

export const persistedHiddenPatchSchema = z.object({
  secrets: persistedCollectionPatch(hiddenSecretSchema),
  gmThreads: persistedCollectionPatch(hiddenThreadSchema),
});
