import { z } from "zod";
import {
  AlternativeSolutionSchema,
  type AlternativeSolution,
} from "../source-package/schema";

export const ADVENTURE_JSON_V1_FORMAT_VERSION = "adventure-json/v1" as const;

export const EpistemicStatusSchema = z.enum([
  "explicit",
  "inferred",
  "ambiguous",
  "unresolved",
]);
export type EpistemicStatus = z.infer<typeof EpistemicStatusSchema>;

export const VisibilitySchema = z.enum(["player-visible", "gm-only"]);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const SourceReferenceSchema = z
  .object({
    page: z.number().int().min(1).optional(),
    pageEnd: z.number().int().min(1).optional(),
    chapter: z.string().min(1).optional(),
    section: z.string().min(1).optional(),
    anchor: z.string().min(1).optional(),
    textQuote: z.string().min(1).optional(),
  })
  .strict();
export type SourceReference = z.infer<typeof SourceReferenceSchema>;

export const PremiseSchema = z
  .object({
    background: z.string(),
    hook: z.string(),
    theme: z.array(z.string()).optional(),
    tone: z.string().optional(),
  })
  .strict();
export type Premise = z.infer<typeof PremiseSchema>;

export const AdventureSourceMetadataSchema = z
  .object({
    title: z.string().min(1),
    authors: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    publishedDate: z.string().optional(),
    url: z.string().optional(),
    license: z.string().optional(),
    documentHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export type AdventureSourceMetadata = z.infer<
  typeof AdventureSourceMetadataSchema
>;

export const TargetPartySchema = z
  .object({
    sizeMin: z.number().int().min(1).optional(),
    sizeMax: z.number().int().min(1).optional(),
    levelMin: z.number().int().min(0).optional(),
    levelMax: z.number().int().min(0).optional(),
  })
  .strict();
export type TargetParty = z.infer<typeof TargetPartySchema>;

export const SystemInfoSchema = z
  .object({
    name: z.string().min(1),
    targetParty: TargetPartySchema.optional(),
  })
  .strict();
export type SystemInfo = z.infer<typeof SystemInfoSchema>;

export const LocationConnectionSchema = z
  .object({
    targetLocationId: z.string().min(1),
    description: z.string().optional(),
    travelConditions: z.array(z.string()).optional(),
  })
  .strict();
export type LocationConnection = z.infer<typeof LocationConnectionSchema>;

export const LocationSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    summary: z.string(),
    description: z.string().optional(),
    parentLocationId: z.string().min(1).optional(),
    connections: z.array(LocationConnectionSchema).optional(),
    visibility: VisibilitySchema,
    epistemicStatus: EpistemicStatusSchema,
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonLocation = z.infer<typeof LocationSchema>;

export const ActorSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    summary: z.string(),
    description: z.string().optional(),
    role: z.string().optional(),
    motivation: z.string().optional(),
    disposition: z.string().optional(),
    factionId: z.string().min(1).optional(),
    locationId: z.string().min(1).optional(),
    visibility: VisibilitySchema,
    epistemicStatus: EpistemicStatusSchema,
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonActor = z.infer<typeof ActorSchema>;

export const FactionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    summary: z.string(),
    description: z.string().optional(),
    goals: z.array(z.string()).optional(),
    dispositionTowardsParty: z.string().optional(),
    visibility: VisibilitySchema,
    epistemicStatus: EpistemicStatusSchema,
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonFaction = z.infer<typeof FactionSchema>;

export const SceneTransitionBranchSchema = z
  .object({
    targetSceneId: z.string().min(1),
    description: z.string().min(1),
    condition: z.string().optional(),
    optional: z.boolean().optional(),
  })
  .strict();
export type SceneTransitionBranch = z.infer<typeof SceneTransitionBranchSchema>;

export const SceneSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string(),
    locationId: z.string().min(1).optional(),
    readAloud: z.union([z.string(), z.array(z.string())]).optional(),
    body: z.string().optional(),
    conditions: z.array(z.string()).optional(),
    branches: z.array(SceneTransitionBranchSchema).optional(),
    optional: z.boolean().optional(),
    visibility: VisibilitySchema,
    epistemicStatus: EpistemicStatusSchema,
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonScene = z.infer<typeof SceneSchema>;

export const EncounterAlternativeSolutionSchema = AlternativeSolutionSchema;
export type EncounterAlternativeSolution = AlternativeSolution;

export const EncounterSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    sceneId: z.string().min(1).optional(),
    locationId: z.string().min(1).optional(),
    description: z.string(),
    conditions: z.array(z.string()).optional(),
    actorIds: z.array(z.string().min(1)).optional(),
    alternativeSolutions: z.array(EncounterAlternativeSolutionSchema),
    visibility: VisibilitySchema,
    epistemicStatus: EpistemicStatusSchema,
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonEncounter = z.infer<typeof EncounterSchema>;

export const ClueSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    reveals: z.string().optional(),
    leadTargetId: z.string().min(1).optional(),
    placedLocationId: z.string().min(1).optional(),
    placedActorId: z.string().min(1).optional(),
    placedSceneId: z.string().min(1).optional(),
    alternativeSourceId: z.string().min(1).optional(),
    visibility: VisibilitySchema,
    epistemicStatus: EpistemicStatusSchema,
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonClue = z.infer<typeof ClueSchema>;

export const RumourTruthSchema = z.enum([
  "true",
  "false",
  "partially-true",
  "unverified",
]);
export type RumourTruth = z.infer<typeof RumourTruthSchema>;

export const RumourSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    truth: RumourTruthSchema,
    sourceActorId: z.string().min(1).optional(),
    sourceLocationId: z.string().min(1).optional(),
    targetEntityId: z.string().min(1).optional(),
    visibility: VisibilitySchema,
    epistemicStatus: EpistemicStatusSchema,
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonRumour = z.infer<typeof RumourSchema>;

export const ItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    summary: z.string(),
    description: z.string().optional(),
    locationId: z.string().min(1).optional(),
    actorId: z.string().min(1).optional(),
    visibility: VisibilitySchema,
    epistemicStatus: EpistemicStatusSchema,
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonItem = z.infer<typeof ItemSchema>;

export const SecretSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    relatedEntityIds: z.array(z.string().min(1)).optional(),
    visibility: z.literal("gm-only"),
    epistemicStatus: EpistemicStatusSchema,
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonSecret = z.infer<typeof SecretSchema>;

export const EndingSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    description: z.string().min(1),
    conditions: z.array(z.string()).optional(),
    epistemicStatus: EpistemicStatusSchema,
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonEnding = z.infer<typeof EndingSchema>;

export const UnresolvedSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    message: z.string().min(1),
    relatedEntityId: z.string().min(1).optional(),
    context: z.string().optional(),
    epistemicStatus: z.enum(["ambiguous", "unresolved"]),
    sourceRef: SourceReferenceSchema.optional(),
  })
  .strict();
export type AdventureJsonUnresolved = z.infer<typeof UnresolvedSchema>;

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const AdventureJsonV1Schema = z
  .object({
    formatVersion: z.literal(ADVENTURE_JSON_V1_FORMAT_VERSION),
    id: z.string().regex(/^[a-z0-9_-]{3,64}$/i),
    title: z.string().min(1).max(200),
    version: z.string().regex(SEMVER_RE),
    description: z.string().optional(),
    premise: PremiseSchema,
    source: AdventureSourceMetadataSchema,
    system: SystemInfoSchema.optional(),
    locations: z.array(LocationSchema),
    actors: z.array(ActorSchema),
    factions: z.array(FactionSchema),
    scenes: z.array(SceneSchema),
    encounters: z.array(EncounterSchema),
    clues: z.array(ClueSchema),
    rumours: z.array(RumourSchema),
    items: z.array(ItemSchema),
    secrets: z.array(SecretSchema),
    endings: z.array(EndingSchema),
    unresolved: z.array(UnresolvedSchema),
  })
  .strict();

export type AdventureJsonV1 = z.infer<typeof AdventureJsonV1Schema>;
