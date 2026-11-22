import { z } from "zod";
import { id } from "./schema-primitives";

export const MAX_PACKAGE_PROGRESS_ENTRIES = 400;
export const MAX_ACTOR_REMEMBERED_FACTS = 5;
export const MAX_ACTOR_FACT_CHARS = 160;
/** Package-authored IDs are kept verbatim: no trimming and no length cap. */
const packageId = z.string().min(1);
const packageRecordKind = z.enum(["scene", "encounter", "clue", "secret"]);
const packageStatus = z.enum([
  "unvisited",
  "available",
  "active",
  "resolved",
  "altered",
  "skipped",
]);
export const packageEventProposalSchema = z
  .object({
    recordId: packageId,
    kind: packageRecordKind,
    to: packageStatus,
    certainty: z.enum(["claimed", "confirmed"]),
    note: z.string().trim().min(1).max(240),
    supersedes: packageId.optional(),
  })
  .strict();

const actorProposalStatus = z.enum(["present", "absent", "dead"]);
const actorProgressStatus = z.enum(["unknown", "present", "absent", "dead"]);
const actorDisposition = z.enum([
  "hostile",
  "wary",
  "neutral",
  "friendly",
  "allied",
]);
const actorFact = z.string().trim().min(1).max(MAX_ACTOR_FACT_CHARS);
export const actorEventProposalSchema = z
  .object({
    actorId: packageId,
    status: actorProposalStatus.optional(),
    disposition: actorDisposition.optional(),
    fact: actorFact.optional(),
    certainty: z.enum(["claimed", "confirmed"]),
    note: z.string().trim().min(1).max(240),
    supersedes: packageId.optional(),
  })
  .strict();

export const sourcePackageRefSchema = z
  .object({
    packageId: id,
    version: z.string().trim().min(1).max(120),
    formatVersion: z.string().trim().min(1).max(64),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const packageProgressSchema = z
  .object({
    sceneId: packageId,
    version: z.literal(1).optional(),
    records: z
      .array(
        z
          .object({
            id: packageId,
            kind: packageRecordKind,
            status: packageStatus,
          })
          .strict(),
      )
      .max(MAX_PACKAGE_PROGRESS_ENTRIES)
      .optional(),
    events: z
      .array(
        z
          .object({
            id: packageId,
            turnId: id,
            recordId: packageId,
            kind: packageRecordKind,
            from: packageStatus,
            to: packageStatus,
            certainty: z.enum(["claimed", "confirmed"]),
            note: z.string().trim().min(1).max(240),
            supersedes: packageId.optional(),
          })
          .strict(),
      )
      .max(MAX_PACKAGE_PROGRESS_ENTRIES)
      .optional(),
    actors: z
      .array(
        z
          .object({
            actorId: packageId,
            status: actorProgressStatus,
            disposition: actorDisposition,
            facts: z.array(actorFact).max(MAX_ACTOR_REMEMBERED_FACTS),
          })
          .strict(),
      )
      .max(MAX_PACKAGE_PROGRESS_ENTRIES)
      .optional(),
    actorEvents: z
      .array(
        z
          .object({
            id: packageId,
            turnId: id,
            actorId: packageId,
            fromStatus: actorProgressStatus.optional(),
            status: actorProposalStatus.optional(),
            fromDisposition: actorDisposition.optional(),
            disposition: actorDisposition.optional(),
            fact: actorFact.optional(),
            certainty: z.enum(["claimed", "confirmed"]),
            note: z.string().trim().min(1).max(240),
            supersedes: packageId.optional(),
          })
          .strict(),
      )
      .max(MAX_PACKAGE_PROGRESS_ENTRIES)
      .optional(),
    revealedSecretIds: z
      .array(packageId)
      .max(MAX_PACKAGE_PROGRESS_ENTRIES)
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      (value.version === undefined) === (value.records === undefined) &&
      (value.version === undefined) === (value.events === undefined) &&
      (value.version !== undefined ||
        (value.actors === undefined && value.actorEvents === undefined)),
    { message: "version, records and events must all be present or absent." },
  );
