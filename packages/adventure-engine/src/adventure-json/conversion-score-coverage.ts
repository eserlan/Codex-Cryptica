import type { ConversionAnswerKey } from "./conversion-answer-key";
import {
  citesSection,
  type DocLike,
  type Entity,
} from "./conversion-score-document";
import {
  fail,
  type ConversionScoreDimensionResult,
} from "./conversion-score-result";
import { normaliseText, textFoundIn } from "./conversion-score-text";

function sourceAnchors(entities: Entity[]): string[] {
  return entities
    .map((entity) => entity.sourceRef?.anchor)
    .filter((anchor): anchor is string => typeof anchor === "string");
}

function sectionCoverage(
  entities: Entity[],
  key: ConversionAnswerKey,
): string[] {
  const entityIds = new Set(entities.map((entity) => entity.id));
  const anchors = new Set(sourceAnchors(entities));
  const sectionTitles = new Set(
    entities
      .map((entity) => entity.sourceRef?.section)
      .filter((section): section is string => typeof section === "string")
      .map(normaliseText),
  );
  const details: string[] = [];
  for (const s of key.sections.filter((s) => !s.container)) {
    if (
      !entityIds.has(s.sourceId) &&
      !anchors.has(s.sourceId) &&
      !sectionTitles.has(normaliseText(s.title))
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

export function scoreCoverage(
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

export function scoreCitations(
  entities: Entity[],
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const details: string[] = [];
  const validAnchors = new Set(key.sections.map((s) => s.sourceId));
  const anchors = sourceAnchors(entities);
  if (anchors.length === 0)
    details.push("no sourceRef.anchor found in document");
  for (const anchor of anchors) {
    if (!validAnchors.has(anchor)) details.push(`unknown anchor ${anchor}`);
  }
  return fail(details);
}

export function scoreTruncation(
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
