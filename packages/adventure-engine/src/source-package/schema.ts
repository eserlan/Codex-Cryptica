import { z } from "zod";

export const ADVENTURE_IMPORT_VERSION = "1.0.0" as const;
export const ADVENTURE_SOURCE_SCHEMA_VERSION = 1 as const;

export const ProvenanceSchema = z.enum([
  "source-grounded",
  "suggested",
  "unresolved",
]);
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const SourceIdentitySchema = z
  .object({
    fileName: z.string().min(1),
    title: z.string().min(1).optional(),
  })
  .strict();
export type SourceIdentity = z.infer<typeof SourceIdentitySchema>;

export const SectionAnchorSchema = z
  .object({
    sourceId: z.string().min(1),
    title: z.string().min(1),
    level: z.number().int().min(1).max(6),
    body: z.string(),
    readAloud: z.union([z.string(), z.array(z.string())]).optional(),
    gmOnly: z.boolean(),
    provenance: ProvenanceSchema,
  })
  .strict();
export type SectionAnchor = z.infer<typeof SectionAnchorSchema>;

export const SceneBranchSchema = z
  .object({
    targetSourceId: z.string().min(1).optional(),
    description: z.string().min(1),
  })
  .strict();
export type SceneBranch = z.infer<typeof SceneBranchSchema>;

export const SceneRecordSchema = z
  .object({
    sourceId: z.string().min(1),
    title: z.string().min(1),
    conditions: z.array(z.string()),
    optionalBranch: z.boolean().optional(),
    branches: z.array(SceneBranchSchema).optional(),
    provenance: ProvenanceSchema,
  })
  .strict();
export type SceneRecord = z.infer<typeof SceneRecordSchema>;

export const NpcRecordSchema = z
  .object({
    name: z.string().min(1),
    motivation: z.string(),
    sourceId: z.string().min(1),
    provenance: ProvenanceSchema,
  })
  .strict();
export type NpcRecord = z.infer<typeof NpcRecordSchema>;

export const ClueRecordSchema = z
  .object({
    clue: z.string().min(1),
    primarySourceId: z.string().min(1),
    alternativeSourceId: z.string().min(1).optional(),
    provenance: ProvenanceSchema,
  })
  .strict();
export type ClueRecord = z.infer<typeof ClueRecordSchema>;

export const AlternativeSolutionSchema = z
  .object({
    method: z.string().min(1),
    description: z.string().min(1),
    socialBypassOfCombat: z.boolean().optional(),
  })
  .strict();
export type AlternativeSolution = z.infer<typeof AlternativeSolutionSchema>;

export const EncounterRecordSchema = z
  .object({
    sourceId: z.string().min(1),
    title: z.string().min(1).optional(),
    description: z.string(),
    conditions: z.array(z.string()).optional(),
    alternativeSolutions: z.array(AlternativeSolutionSchema),
    provenance: ProvenanceSchema,
  })
  .strict();
export type EncounterRecord = z.infer<typeof EncounterRecordSchema>;

export const SecretRecordSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    sourceId: z.string().min(1),
    gmOnly: z.boolean(),
    provenance: ProvenanceSchema,
  })
  .strict();
export type SecretRecord = z.infer<typeof SecretRecordSchema>;

export const EndingRecordSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    description: z.string().min(1),
    sourceId: z.string().min(1),
    provenance: ProvenanceSchema,
  })
  .strict();
export type EndingRecord = z.infer<typeof EndingRecordSchema>;

export const AmbiguityRecordSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    message: z.string().min(1),
    sourceId: z.string().min(1).optional(),
    context: z.string().optional(),
    provenance: z.literal("unresolved"),
  })
  .strict();
export type AmbiguityRecord = z.infer<typeof AmbiguityRecordSchema>;

export const AdventureSourcePackageSchema = z
  .object({
    schemaVersion: z.literal(ADVENTURE_SOURCE_SCHEMA_VERSION),
    status: z.enum(["draft", "approved"]),
    documentHash: z.string().regex(/^[a-f0-9]{64}$/),
    sourceIdentity: SourceIdentitySchema,
    importMethod: z.literal("markdown"),
    importVersion: z.string().min(1),
    sections: z.array(SectionAnchorSchema),
    scenes: z.array(SceneRecordSchema),
    npcs: z.array(NpcRecordSchema),
    clues: z.array(ClueRecordSchema),
    encounters: z.array(EncounterRecordSchema),
    secrets: z.array(SecretRecordSchema),
    endings: z.array(EndingRecordSchema),
    ambiguities: z.array(AmbiguityRecordSchema),
  })
  .strict();

export type AdventureSourcePackage = z.infer<
  typeof AdventureSourcePackageSchema
>;

export type AdventureImportErrorCode =
  | "EMPTY_INPUT"
  | "INPUT_TOO_LARGE"
  | "INVALID_OPTIONS"
  | "BINARY_CONTENT"
  | "INVALID_UTF8"
  | "NO_SECTIONS";

export interface AdventureImportError {
  code: AdventureImportErrorCode;
  message: string;
  details?: unknown;
}

export type ParseAdventureResult =
  | { ok: true; package: AdventureSourcePackage }
  | { ok: false; error: AdventureImportError };
