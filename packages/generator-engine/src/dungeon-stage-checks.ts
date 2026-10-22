/** Shape checks for the foundation and geography stages. */
import { asArray as arr, asRecord as rec } from "./llm-response-utils";
import { text, textList } from "./dungeon-stage-data";
import { bannedNamesIn, type ResolvedDungeon } from "./public-dungeon";
import type { JsonObject as Json } from "./staged-runtime";
import type { StageCheck } from "./dungeon-staged-types";

const FOUNDATION_FIELDS = [
  "title",
  "summary",
  "throughline",
  "history",
  "currentState",
  "signatureFeature",
  "secret",
] as const;

export function checkFoundation(
  data: Json,
  resolved: ResolvedDungeon,
): StageCheck {
  const hard: string[] = [];
  const missing = FOUNDATION_FIELDS.filter((k) => !text(data[k]));
  if (missing.length > 0) {
    hard.push(`missing required fields: ${missing.join(", ")}`);
  }
  const ids = arr(data.sectorBriefs).map((b) => text(rec(b).id));
  const plan = resolved.sectors.map((s) => s.id);
  if (ids.join("|") !== plan.join("|")) {
    hard.push(
      `sectorBriefs must be exactly ${plan.join(", ")} in that order, got ${ids.join(", ") || "none"}`,
    );
  } else if (arr(data.sectorBriefs).some((b) => !text(rec(b).brief))) {
    hard.push("a sector brief is empty");
  }
  const banned = bannedNamesIn([text(data.title)]);
  if (banned.length > 0)
    hard.push(`title uses banned names: ${banned.join(", ")}`);
  return { hard, soft: [] };
}

function sectorListCountIssues(data: Json): string[] {
  const issues: string[] = [];
  for (const key of ["hazards", "treasures", "hooks"] as const) {
    const count = textList(data[key]).length;
    if (count < 2 || count > 3) {
      issues.push(`${key} must contain 2–3 entries, got ${count}`);
    }
  }
  return issues;
}

function sectorContentIssues(sectors: Json[], avoidNames: string[]): string[] {
  const hard: string[] = [];
  if (sectors.some((s) => !text(s.name) || !text(s.description))) {
    hard.push("a sector is missing its name or description");
  }
  const details = sectors.map((s) => text(s.stockDetail).toLowerCase());
  if (details.some((d) => !d)) hard.push("a sector has no stockDetail");
  else if (new Set(details).size !== details.length) {
    hard.push("two sectors share the same stocked content");
  }
  const names = sectors.map((s) => text(s.name).toLowerCase());
  if (new Set(names).size !== names.length) {
    hard.push("two sectors share the same name");
  }
  const banned = bannedNamesIn(
    sectors.map((s) => text(s.name)),
    avoidNames,
  );
  if (banned.length > 0) {
    hard.push(
      `sector names use banned or already-used names: ${banned.join(", ")}`,
    );
  }
  return hard;
}

export function checkSectors(
  data: Json,
  resolved: ResolvedDungeon,
  avoidNames: string[] = [],
): StageCheck {
  const hard: string[] = [];
  const plan = resolved.sectors;
  const sectors = arr(data.sectors).map(rec);
  const ids = sectors.map((s) => text(s.id));
  if (ids.join("|") !== plan.map((s) => s.id).join("|")) {
    hard.push(
      `sectors must be exactly ${plan.map((s) => s.id).join(", ")} in that order, got ${ids.join(", ") || "none"}`,
    );
  } else {
    hard.push(...sectorContentIssues(sectors, avoidNames));
  }
  hard.push(...sectorListCountIssues(data));
  return { hard, soft: [] };
}
