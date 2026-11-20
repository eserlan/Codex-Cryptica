import { z } from "zod";
import {
  RumourTruthSchema,
  SourceReferenceSchema,
  type SourceReference,
} from "./schema";
import { validateAdventureJson } from "./validator";

const text = z.string().min(1);
const citedSourceReference = SourceReferenceSchema.refine(
  (sourceRef) => Object.keys(sourceRef).length > 0,
  { message: "sourceRef must identify a known source location" },
);

const ConflictingClaimSchema = z
  .object({
    text,
    distinguishingTerm: text,
    sourceRef: citedSourceReference,
  })
  .strict();

function idGroupsAreUnique(groups: string[][]): boolean {
  return groups.every((ids) => new Set(ids).size === ids.length);
}

export const ACTIONABLE_DETAIL_CATEGORIES = [
  "read-aloud",
  "situation",
  "interaction",
  "trigger",
  "actor-reaction",
  "clue",
  "alternate-outcome",
  "consequence",
  "gm-only",
] as const;

/**
 * A short paraphrase of a fact the source states in one section. Details are
 * never invented mechanics, transitions or fields outside adventure-json/v1.
 * A converter should record unsupported inferences in the coverage report or in
 * `unresolved`; a detail recorded only in `unresolved` still counts as missing.
 */
export const ActionableDetailSchema = z
  .object({
    sourceId: text,
    category: z.enum(ACTIONABLE_DETAIL_CATEGORIES),
    detail: text,
  })
  .strict();

export type ActionableDetail = z.infer<typeof ActionableDetailSchema>;

export const ConversionAnswerKeySchema = z
  .object({
    adventureFile: text,
    sections: z
      .array(
        z
          .object({
            sourceId: text,
            title: text,
            container: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1),
    npcs: z.array(
      z.object({ name: text, motivation: text, sourceId: text }).strict(),
    ),
    secrets: z.array(
      z
        .object({ id: text, text, gmOnly: z.boolean(), sourceId: text })
        .strict(),
    ),
    sceneConditions: z.array(
      z.object({ sourceId: text, condition: text }).strict(),
    ),
    branch: z
      .object({ sourceId: text, description: text, optional: z.literal(true) })
      .strict(),
    alternativeSolution: z
      .object({
        obstacleSourceId: text,
        description: text,
        socialBypassOfCombat: z.boolean(),
        sourceId: text,
      })
      .strict(),
    missableClue: z
      .object({ clue: text, primarySourceId: text, alternativeSourceId: text })
      .strict()
      .refine((c) => c.primarySourceId !== c.alternativeSourceId, {
        message: "clue source IDs must differ",
      }),
    conclusions: z
      .array(
        z
          .object({
            id: text,
            statement: text,
            clues: z.array(z.object({ text, sourceId: text }).strict()).min(3),
          })
          .strict(),
      )
      .optional(),
    testimonies: z
      .array(
        z
          .object({
            id: text,
            npc: text,
            claim: text,
            truth: RumourTruthSchema,
            canonicalFact: text,
            sourceId: text,
          })
          .strict(),
      )
      .optional(),
    sourceAuthority: z
      .array(
        z
          .object({
            id: text,
            expectedText: text,
            expectedTerm: text,
            supersededText: text,
            supersededTerm: text,
            correctionSource: citedSourceReference,
            expectedTitle: text,
            expectedItemCount: z.number().int().min(0).optional(),
          })
          .strict(),
      )
      .optional(),
    conflicts: z
      .array(
        z
          .object({
            id: text,
            claims: z.array(ConflictingClaimSchema).min(2),
          })
          .strict(),
      )
      .optional(),
    endings: z
      .array(z.object({ id: text, description: text, sourceId: text }).strict())
      .min(2),
    actionableDetails: z.array(ActionableDetailSchema).optional(),
  })
  .strict()
  .refine(
    (k) =>
      idGroupsAreUnique([
        k.sections.map((s) => s.sourceId),
        k.secrets.map((s) => s.id),
        k.endings.map((e) => e.id),
        (k.conclusions ?? []).map((c) => c.id),
        (k.testimonies ?? []).map((t) => t.id),
      ]),
    {
      message:
        "section sourceIds, secret ids, ending ids, conclusion ids and testimony ids must be unique",
    },
  )
  .refine(
    (k) => {
      const sourceIds = new Set(k.sections.map((s) => s.sourceId));
      return (k.actionableDetails ?? []).every((d) =>
        sourceIds.has(d.sourceId),
      );
    },
    { message: "actionableDetails sourceId must be a sections sourceId" },
  );

export type ConversionAnswerKey = z.infer<typeof ConversionAnswerKeySchema>;

export const CONVERSION_SCORE_DIMENSIONS = [
  "schema",
  "references",
  "secrets",
  "sourceAuthority",
  "conflicts",
  "coverage",
  "authoredVsRumour",
  "branches",
  "citations",
  "truncation",
  "fidelity",
] as const;

export type ConversionScoreDimension =
  (typeof CONVERSION_SCORE_DIMENSIONS)[number];

export interface ConversionScoreDimensionResult {
  status: "pass" | "fail" | "n/a";
  details: string[];
}

export interface ConversionScoreResult {
  overall: "pass" | "fail";
  repairIterations: number | null;
  dimensions: Record<ConversionScoreDimension, ConversionScoreDimensionResult>;
}

type Entity = {
  id: string;
  epistemicStatus?: string | undefined;
  sourceRef?: SourceReference | undefined;
  [key: string]: unknown;
};

type DocLike = Record<string, unknown> & {
  [K in (typeof ENTITY_COLLECTIONS)[number]]: Entity[];
};

const ENTITY_COLLECTIONS = [
  "locations",
  "actors",
  "factions",
  "scenes",
  "encounters",
  "clues",
  "rumours",
  "items",
  "secrets",
  "endings",
  "unresolved",
] as const;

function tokens(s: string): Set<string> {
  const normalized = s.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return new Set(normalized.split(" ").filter((t) => t.length >= 4));
}

/** Key text A is "found" in B when ≥60% of A's distinct tokens appear in B. */
export function textFoundIn(a: string, b: string): boolean {
  const aTokens = tokens(a);
  if (aTokens.size === 0) return false;
  const bTokens = tokens(b);
  let found = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) found += 1;
  }
  return found / aTokens.size >= 0.6;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function citesSection(
  entity: Entity,
  section: { sourceId: string; title: string },
): boolean {
  if (entity.id === section.sourceId) return true;
  if (entity.sourceRef?.anchor === section.sourceId) return true;
  const refSection = entity.sourceRef?.section;
  return (
    typeof refSection === "string" && norm(refSection) === norm(section.title)
  );
}

function allEntities(doc: DocLike): Entity[] {
  return ENTITY_COLLECTIONS.flatMap((name) => doc[name] ?? []);
}

function premiseStrings(
  doc: Record<string, unknown>,
  push: (field: string, value: unknown) => void,
): void {
  push("title", doc["title"]);
  push("description", doc["description"]);
  const premise = doc["premise"] as Record<string, unknown> | undefined;
  if (!premise || typeof premise !== "object") return;
  push("premise.background", premise["background"]);
  push("premise.hook", premise["hook"]);
  push("premise.tone", premise["tone"]);
  const theme = premise["theme"];
  if (Array.isArray(theme))
    theme.forEach((t, i) => push(`premise.theme[${i}]`, t));
}

function recordStrings(
  name: string,
  rec: Record<string, unknown>,
  push: (field: string, value: unknown) => void,
): void {
  const id = typeof rec["id"] === "string" ? rec["id"] : "?";
  const walk = (field: string, value: unknown): void => {
    if (typeof value === "string") push(field, value);
    else if (Array.isArray(value))
      value.forEach((v, i) => walk(`${field}[${i}]`, v));
    else if (value && typeof value === "object")
      for (const [key, v] of Object.entries(value)) walk(`${field}.${key}`, v);
  };
  for (const [key, value] of Object.entries(rec))
    walk(`${name} ${id}.${key}`, value);
}

function collectionStrings(
  doc: Record<string, unknown>,
  push: (field: string, value: unknown) => void,
): void {
  for (const name of ENTITY_COLLECTIONS) {
    const items = doc[name];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      if (rec["visibility"] === "player-visible")
        recordStrings(name, rec, push);
    }
  }
}

function playerVisibleStrings(
  doc: Record<string, unknown>,
): Array<{ field: string; value: string }> {
  const out: Array<{ field: string; value: string }> = [];
  const push = (field: string, value: unknown): void => {
    if (typeof value === "string") out.push({ field, value });
  };
  premiseStrings(doc, push);
  collectionStrings(doc, push);
  return out;
}

const NOT_CHECKED = "not checked: schema invalid";

function pass(): ConversionScoreDimensionResult {
  return { status: "pass", details: [] };
}

function fail(details: string[]): ConversionScoreDimensionResult {
  return { status: details.length === 0 ? "pass" : "fail", details };
}

function finish(
  dims: Record<ConversionScoreDimension, ConversionScoreDimensionResult>,
  repairIterations: number | null,
): ConversionScoreResult {
  const overall = CONVERSION_SCORE_DIMENSIONS.every(
    (name) => dims[name]!.status === "pass" || dims[name]!.status === "n/a",
  )
    ? "pass"
    : "fail";
  return { overall, repairIterations, dimensions: dims };
}

function scoreSecrets(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const details: string[] = [];
  const keySecrets = key.secrets.filter((s) => s.gmOnly);
  const docSecrets = (value.secrets ?? []) as Entity[];
  for (const s of keySecrets) {
    const matched = docSecrets.some(
      (d) => d.id === s.id || textFoundIn(s.text, String(d["text"] ?? "")),
    );
    if (!matched) details.push(`missing secret ${s.id}`);
  }
  const pvStrings = playerVisibleStrings(value);
  for (const s of keySecrets) {
    const leak = pvStrings.find((p) => textFoundIn(s.text, p.value));
    if (leak) details.push(`leaked secret ${s.id} in ${leak.field}`);
  }
  return fail(details);
}

function containsTokens(value: string, expected: string): boolean {
  const expectedTokens = tokens(expected);
  if (expectedTokens.size === 0) return false;
  const valueTokens = tokens(value);
  return [...expectedTokens].every((token) => valueTokens.has(token));
}

function entityTextStrings(entity: Entity): string[] {
  const strings: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === "string") strings.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object")
      Object.values(value).forEach(walk);
  };
  for (const [field, value] of Object.entries(entity)) {
    if (
      field !== "id" &&
      field !== "sourceRef" &&
      field !== "epistemicStatus"
    ) {
      walk(value);
    }
  }
  return strings;
}

function sourceReferenceMatches(
  actual: SourceReference | undefined,
  expected: SourceReference,
): boolean {
  if (!actual) return false;
  return Object.entries(expected).every(
    ([field, value]) => actual[field as keyof SourceReference] === value,
  );
}

function hasScoredText(
  entity: Entity,
  expectedText: string,
  distinguishingTerm: string,
): boolean {
  return entityTextStrings(entity).some(
    (value) =>
      textFoundIn(expectedText, value) &&
      containsTokens(value, distinguishingTerm),
  );
}

type SourceAuthorityCase = NonNullable<
  ConversionAnswerKey["sourceAuthority"]
>[number];

function authorityTitleDetails(
  value: DocLike,
  authority: SourceAuthorityCase,
): string[] {
  return value["title"] === authority.expectedTitle
    ? []
    : [
        `${authority.id}: expected adventure title "${authority.expectedTitle}"`,
      ];
}

function authorityItemCountDetails(
  value: DocLike,
  authority: SourceAuthorityCase,
): string[] {
  if (authority.expectedItemCount === undefined) return [];
  const itemCount = (value["items"] ?? []).length;
  return itemCount === authority.expectedItemCount
    ? []
    : [
        `${authority.id}: expected ${authority.expectedItemCount} item entries, found ${itemCount}`,
      ];
}

function hasExplicitAuthorityClaim(
  entity: Entity,
  expectedText: string,
  expectedTerm: string,
): boolean {
  return (
    entity.epistemicStatus === "explicit" &&
    hasScoredText(entity, expectedText, expectedTerm)
  );
}

function correctedClaimDetails(
  entities: Entity[],
  authority: SourceAuthorityCase,
): string[] {
  const correctedClaims = entities.filter((entity) =>
    hasExplicitAuthorityClaim(
      entity,
      authority.expectedText,
      authority.expectedTerm,
    ),
  );
  if (correctedClaims.length === 0) {
    return [`${authority.id}: missing explicit corrected claim`];
  }
  const citesCorrection = correctedClaims.some((entity) =>
    sourceReferenceMatches(entity.sourceRef, authority.correctionSource),
  );
  return citesCorrection
    ? []
    : [`${authority.id}: corrected claim does not cite the correction source`];
}

function supersededClaimDetails(
  entities: Entity[],
  authority: SourceAuthorityCase,
): string[] {
  const remainsExplicit = entities.some((entity) =>
    hasExplicitAuthorityClaim(
      entity,
      authority.supersededText,
      authority.supersededTerm,
    ),
  );
  return remainsExplicit
    ? [`${authority.id}: superseded claim remains explicit`]
    : [];
}

function scoreSourceAuthority(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const cases = key.sourceAuthority ?? [];
  if (cases.length === 0) return { status: "n/a", details: [] };

  const details: string[] = [];
  const entities = allEntities(value);
  for (const authority of cases) {
    details.push(
      ...authorityTitleDetails(value, authority),
      ...authorityItemCountDetails(value, authority),
      ...correctedClaimDetails(entities, authority),
      ...supersededClaimDetails(entities, authority),
    );
  }
  return fail(details);
}

function scoreConflicts(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const conflicts = key.conflicts ?? [];
  if (conflicts.length === 0) return { status: "n/a", details: [] };

  const details: string[] = [];
  const entities = allEntities(value);
  const unresolved = value.unresolved ?? [];
  for (const conflict of conflicts) {
    const recordedConflict = unresolved.some(
      (entry) =>
        (entry.epistemicStatus === "ambiguous" ||
          entry.epistemicStatus === "unresolved") &&
        conflict.claims.every((claim) =>
          hasScoredText(entry, claim.text, claim.distinguishingTerm),
        ),
    );
    if (!recordedConflict) {
      details.push(`${conflict.id}: missing unresolved record of the conflict`);
    }

    for (const claim of conflict.claims) {
      const matching = entities.filter((entity) =>
        hasScoredText(entity, claim.text, claim.distinguishingTerm),
      );
      if (matching.some((entity) => entity.epistemicStatus === "explicit")) {
        details.push(`${conflict.id}: claim is selected as explicit`);
      }
      const preserved = matching.some(
        (entity) =>
          (entity.epistemicStatus === "ambiguous" ||
            entity.epistemicStatus === "unresolved") &&
          sourceReferenceMatches(entity.sourceRef, claim.sourceRef),
      );
      if (!preserved) {
        details.push(
          `${conflict.id}: missing ambiguous or unresolved claim at its source location (${claim.distinguishingTerm})`,
        );
      }
    }
  }
  return fail(details);
}

function sectionCoverage(
  entities: Entity[],
  key: ConversionAnswerKey,
): string[] {
  const entityIds = new Set(entities.map((entity) => entity.id));
  const anchors = new Set(
    entities
      .map((entity) => entity.sourceRef?.anchor)
      .filter((anchor): anchor is string => typeof anchor === "string"),
  );
  const sectionTitles = new Set(
    entities
      .map((entity) => entity.sourceRef?.section)
      .filter((section): section is string => typeof section === "string")
      .map(norm),
  );
  const details: string[] = [];
  for (const s of key.sections.filter((s) => !s.container)) {
    if (
      !entityIds.has(s.sourceId) &&
      !anchors.has(s.sourceId) &&
      !sectionTitles.has(norm(s.title))
    ) {
      details.push(`missing section ${s.sourceId}`);
    }
  }
  return details;
}

function npcCoverage(value: DocLike, key: ConversionAnswerKey): string[] {
  const actors = (value.actors ?? []) as Array<{ name?: string }>;
  const details: string[] = [];
  for (const npc of key.npcs) {
    const found = actors.some(
      (a) => a.name?.toLowerCase() === npc.name.toLowerCase(),
    );
    if (!found) details.push(`missing npc ${npc.name}`);
  }
  return details;
}

function endingCoverage(value: DocLike, key: ConversionAnswerKey): string[] {
  const docEndings = (value.endings ?? []) as Entity[];
  const details: string[] = [];
  for (const ending of key.endings) {
    const section = key.sections.find((s) => s.sourceId === ending.sourceId);
    const found = docEndings.some((e) => e.id === ending.id);
    const cited = section
      ? docEndings.some((e) => citesSection(e, section))
      : docEndings.some((e) => e.sourceRef?.anchor === ending.sourceId);
    if (!found && !cited) details.push(`missing ending ${ending.id}`);
  }
  return details;
}

function clueCoverage(value: DocLike, key: ConversionAnswerKey): string[] {
  const docClues = (value.clues ?? []) as Array<{ text?: string }>;
  const keyClues: string[] = [
    key.missableClue.clue,
    ...(key.conclusions ?? []).flatMap((c) => c.clues.map((cl) => cl.text)),
  ];
  const details: string[] = [];
  for (const clue of keyClues) {
    const found = docClues.some(
      (c) => typeof c.text === "string" && textFoundIn(clue, c.text),
    );
    if (!found) details.push(`missing clue ${clue}`);
  }
  return details;
}

function scoreCoverage(
  value: DocLike,
  entities: Entity[],
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  return fail([
    ...sectionCoverage(entities, key),
    ...npcCoverage(value, key),
    ...endingCoverage(value, key),
    ...clueCoverage(value, key),
  ]);
}

function scoreAuthoredVsRumour(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const testimonies = key.testimonies ?? [];
  if (testimonies.length === 0) return { status: "n/a", details: [] };
  const details: string[] = [];
  const rumours = (value.rumours ?? []) as Array<{
    text?: string;
    truth?: string;
  }>;
  const docSecrets = (value.secrets ?? []) as Array<{ text?: string }>;
  for (const t of testimonies) {
    const found = rumours.some(
      (r) =>
        typeof r.text === "string" &&
        r.truth === t.truth &&
        textFoundIn(t.claim, r.text),
    );
    if (!found) details.push(`missing testimony ${t.id}`);
    const inSecret = docSecrets.some(
      (s) => typeof s.text === "string" && textFoundIn(t.claim, s.text),
    );
    if (inSecret) details.push(`testimony ${t.id} found in secret`);
  }
  return fail(details);
}

type SceneLike = {
  id: string;
  optional?: boolean;
  branches?: Array<{ targetSceneId?: string; optional?: boolean }>;
  sourceRef?: { anchor?: string; section?: string };
};

type EncounterLike = {
  id: string;
  sceneId?: string;
  alternativeSolutions?: Array<{ socialBypassOfCombat?: boolean }>;
  sourceRef?: { anchor?: string; section?: string };
};

function optionalPathDetails(
  scenes: SceneLike[],
  key: ConversionAnswerKey,
): string[] {
  const branchSection = key.sections.find(
    (s) => s.sourceId === key.branch.sourceId,
  );
  const citingScenes = branchSection
    ? scenes.filter((sc) => citesSection(sc as Entity, branchSection))
    : [];
  const optionalScene = citingScenes.some((sc) => sc.optional === true);
  const optionalTarget = scenes.some((sc) =>
    (sc.branches ?? []).some(
      (b) =>
        b.optional === true &&
        citingScenes.some((c) => c.id === b.targetSceneId),
    ),
  );
  return optionalScene || optionalTarget
    ? []
    : [`missing optional path ${key.branch.sourceId}`];
}

function alternativeSolutionDetails(
  value: DocLike,
  scenes: SceneLike[],
  key: ConversionAnswerKey,
): string[] {
  const encounters = (value.encounters ?? []) as EncounterLike[];
  const obstacleSection = key.sections.find(
    (s) => s.sourceId === key.alternativeSolution.obstacleSourceId,
  );
  const sceneById = new Map(scenes.map((sc) => [sc.id, sc]));
  const obstacleEncounter = obstacleSection
    ? encounters.find((enc) => {
        if (citesSection(enc as Entity, obstacleSection)) return true;
        const scene = enc.sceneId ? sceneById.get(enc.sceneId) : undefined;
        return scene ? citesSection(scene as Entity, obstacleSection) : false;
      })
    : undefined;
  if (!obstacleEncounter) {
    return [
      `missing alternative solution encounter ${key.alternativeSolution.obstacleSourceId}`,
    ];
  }
  const solutions = obstacleEncounter.alternativeSolutions ?? [];
  if (key.alternativeSolution.socialBypassOfCombat) {
    return solutions.some((s) => s.socialBypassOfCombat === true)
      ? []
      : [`missing social bypass for encounter ${obstacleEncounter.id}`];
  }
  return solutions.length >= 2
    ? []
    : [
        `missing second alternative solution for encounter ${obstacleEncounter.id}`,
      ];
}

function scoreBranches(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const scenes = (value.scenes ?? []) as SceneLike[];
  return fail([
    ...optionalPathDetails(scenes, key),
    ...alternativeSolutionDetails(value, scenes, key),
  ]);
}

function scoreCitations(
  entities: Entity[],
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const details: string[] = [];
  const validAnchors = new Set(key.sections.map((s) => s.sourceId));
  const anchors = entities
    .map((e) => e.sourceRef?.anchor)
    .filter((a): a is string => typeof a === "string");
  if (anchors.length === 0)
    details.push("no sourceRef.anchor found in document");
  for (const anchor of anchors) {
    if (!validAnchors.has(anchor)) details.push(`unknown anchor ${anchor}`);
  }
  return fail(details);
}

function scoreTruncation(
  entities: Entity[],
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const nonContainer = key.sections.filter((s) => !s.container);
  const trailing: string[] = [];
  for (let i = nonContainer.length - 1; i >= 0; i -= 1) {
    const section = nonContainer[i]!;
    if (entities.some((e) => citesSection(e, section))) break;
    trailing.unshift(`uncited trailing section ${section.sourceId}`);
  }
  return fail(trailing);
}

function recordHasText(rec: Entity, detail: string): boolean {
  let found = false;
  recordStrings("", rec, (_field, value) => {
    if (typeof value === "string" && textFoundIn(detail, value)) found = true;
  });
  return found;
}

/**
 * Each key detail must appear in at least one string field of a record that
 * cites its section. `unresolved` records never count, so a note that a detail
 * was dropped cannot hide the omission.
 */
function scoreFidelity(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const details = key.actionableDetails ?? [];
  if (details.length === 0) return { status: "n/a", details: [] };
  const records = ENTITY_COLLECTIONS.filter(
    (name) => name !== "unresolved",
  ).flatMap((name) => value[name] ?? []);
  const findings: string[] = [];
  for (const d of details) {
    const section = key.sections.find((s) => s.sourceId === d.sourceId);
    if (!section) continue;
    const citing = records.filter((r) => citesSection(r, section));
    if (citing.some((r) => recordHasText(r, d.detail))) continue;
    const cited =
      citing.length > 0
        ? `cited by: ${citing.map((r) => r.id).join(", ")}`
        : "no record cites this section";
    findings.push(
      `missing ${d.category} detail in ${section.sourceId} "${section.title}" (${cited}): ${d.detail}`,
    );
  }
  return fail(findings);
}

function schemaFailedDims(validation: {
  errors: Array<{ code: string; path?: string }>;
}): Pick<
  Record<ConversionScoreDimension, ConversionScoreDimensionResult>,
  | "references"
  | "secrets"
  | "sourceAuthority"
  | "conflicts"
  | "coverage"
  | "authoredVsRumour"
  | "branches"
  | "citations"
  | "truncation"
  | "fidelity"
> {
  const refErrors = validation.errors.filter(
    (e) => e.code === "UNRESOLVED_REFERENCE" || e.code === "SELF_REFERENCE",
  );
  const references: ConversionScoreDimensionResult =
    refErrors.length > 0
      ? {
          status: "fail",
          details: refErrors.map((e) =>
            e.path ? `${e.code} at ${e.path}` : e.code,
          ),
        }
      : { status: "fail", details: [NOT_CHECKED] };
  const blocked = (): ConversionScoreDimensionResult => ({
    status: "fail",
    details: [NOT_CHECKED],
  });
  return {
    references,
    secrets: blocked(),
    sourceAuthority: blocked(),
    conflicts: blocked(),
    coverage: blocked(),
    authoredVsRumour: blocked(),
    branches: blocked(),
    citations: blocked(),
    truncation: blocked(),
    fidelity: blocked(),
  };
}

export function scoreAdventureConversion(
  doc: unknown,
  key: ConversionAnswerKey,
  options?: { repairIterations?: number },
): ConversionScoreResult {
  const repairIterations = options?.repairIterations ?? null;
  const validation = validateAdventureJson(doc);
  const schema: ConversionScoreDimensionResult = validation.ok
    ? pass()
    : {
        status: "fail",
        details: validation.errors.map((e) =>
          e.path ? `${e.code} at ${e.path}` : e.code,
        ),
      };
  if (!validation.ok) {
    return finish(
      { schema, ...schemaFailedDims(validation) },
      repairIterations,
    );
  }
  const value = validation.value as unknown as DocLike;
  const entities = allEntities(value);
  return finish(
    {
      schema,
      // references: a fully valid document has no reference errors
      references: pass(),
      secrets: scoreSecrets(value, key),
      sourceAuthority: scoreSourceAuthority(value, key),
      conflicts: scoreConflicts(value, key),
      coverage: scoreCoverage(value, entities, key),
      authoredVsRumour: scoreAuthoredVsRumour(value, key),
      branches: scoreBranches(value, key),
      citations: scoreCitations(entities, key),
      truncation: scoreTruncation(entities, key),
      fidelity: scoreFidelity(value, key),
    },
    repairIterations,
  );
}
