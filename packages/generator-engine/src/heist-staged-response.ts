import type { JsonObject, DraftCheck } from "./staged-runtime";
import type { ResolvedHeist } from "./public-heist";
import { addBannedNameFindings } from "./heist-staged-validation";
import { rec } from "./heist-staged-values";
import { extractProperNouns } from "./campaign-context";
import {
  formatCasing,
  getRingText,
  formatAlarmTrack,
  formatComplications,
  formatGetaway,
  formatFlashbacks,
} from "./heist-staged-formatters";

export function checkHeistResponseStage(
  data: JsonObject,
  stages1and2: JsonObject,
  resolved: ResolvedHeist,
  avoidNames: string[] = [],
): DraftCheck {
  const hard: string[] = [];
  const soft: string[] = [];

  const alarmTrackRaw = data.alarmTrack;
  const complicationsRaw = data.complications;
  const getawayRaw = data.getaway;
  const flashbacksRaw = data.flashbacks;

  const alarmTrackText = formatAlarmTrack(alarmTrackRaw);
  const complicationsText = formatComplications(complicationsRaw);
  const getawayText = formatGetaway(getawayRaw);
  const flashbacksText = formatFlashbacks(flashbacksRaw);

  checkResponseSections(
    data,
    alarmTrackText,
    complicationsText,
    getawayText,
    flashbacksText,
    hard,
  );
  checkAlarmLevels(alarmTrackRaw, alarmTrackText, hard);
  checkGetawayConstraints(getawayText.toLowerCase(), resolved, hard);

  // Hard: banned names
  const allText = `${alarmTrackText} ${complicationsText} ${getawayText} ${flashbacksText}`;
  addBannedNameFindings(extractProperNouns(allText), avoidNames, hard);

  checkSecurityContinuity(
    stages1and2,
    resolved,
    alarmTrackText,
    getawayText.toLowerCase(),
    soft,
  );
  checkFlashbackOverlap(stages1and2, flashbacksRaw, flashbacksText, soft);

  return { hard, soft };
}

function checkResponseSections(
  data: JsonObject,
  alarmTrackText: string,
  complicationsText: string,
  getawayText: string,
  flashbacksText: string,
  hard: string[],
): void {
  const complicationsRaw = data.complications;
  // Hard: missing alarm track, complications, getaway, or flashbacks
  if (!alarmTrackText) hard.push("missing required alarm track");
  if (!complicationsText) hard.push("missing required complications");
  const defaultComplicationCount = Array.isArray(complicationsRaw)
    ? complicationsRaw.filter((item) =>
        typeof item === "string"
          ? item.includes("(default)")
          : String(rec(item).label || "").includes("(default)"),
      ).length
    : 0;
  if (
    !Array.isArray(complicationsRaw) ||
    complicationsRaw.length !== 3 ||
    defaultComplicationCount !== 1
  ) {
    hard.push(
      "Complications must contain exactly three entries: one default and two alternatives.",
    );
  }
  if (!getawayText) hard.push("missing required getaway section");
  if (!flashbacksText) hard.push("missing required flashback opportunities");
}

function checkAlarmLevels(
  alarmTrackRaw: unknown,
  alarmTrackText: string,
  hard: string[],
): void {
  // Hard: alarm track does not have 5 escalating steps
  let levelCount = 0;
  for (let lvl = 0; lvl <= 4; lvl++) {
    if (
      alarmTrackText.includes(`${lvl} —`) ||
      alarmTrackText.includes(`${lvl}:`) ||
      alarmTrackText.includes(`Level ${lvl}`) ||
      (Array.isArray(alarmTrackRaw) &&
        alarmTrackRaw.some(
          (item) => Number((item as Record<string, unknown>).level) === lvl,
        ))
    ) {
      levelCount++;
    }
  }
  if (levelCount < 5) {
    hard.push(
      "Alarm track must contain all five escalating levels (0 — Quiet through 4 — Lethal Response).",
    );
  }
}

function checkGetawayConstraints(
  getawayLower: string,
  resolved: ResolvedHeist,
  hard: string[],
): void {
  // Hard: getaway ignores heistType / prize transport constraints
  const complicationLabel = resolved.prizeComplicationLabel;
  if (complicationLabel === "Huge") {
    checkHugePrizeRoute(getawayLower, hard);
  } else if (
    complicationLabel === "Fragile" ||
    complicationLabel === "Volatile"
  ) {
    checkFragilePrizeRoute(getawayLower, complicationLabel, hard);
  } else if (
    resolved.heistType === "Rescue" ||
    resolved.heistType === "Extraction"
  ) {
    checkRescueRoute(getawayLower, resolved, hard);
  }
}

function checkHugePrizeRoute(getawayLower: string, hard: string[]): void {
  const narrowPassagePattern =
    /\b(narrow (?:vent|drain|pipe|duct|crawlspace)|crawl through the duct|squeeze through)\b/i;
  if (
    narrowPassagePattern.test(getawayLower) &&
    !/\b(dismantle|parts|pieces|fits|cargo)\b/i.test(getawayLower)
  ) {
    hard.push(
      "Getaway vectors cannot squeeze through narrow passages with a Huge prize without addressing transport constraints.",
    );
  }
}

function checkFragilePrizeRoute(
  getawayLower: string,
  complicationLabel: string,
  hard: string[],
): void {
  const dangerousDropPattern =
    /\b(jump from the roof|leap from the tower|detonate the wall|drop onto the tracks)\b/i;
  if (
    dangerousDropPattern.test(getawayLower) &&
    !/\b(cushion|protect|secure|stabiliz|harness)\b/i.test(getawayLower)
  ) {
    hard.push(
      `Getaway vectors must respect the ${complicationLabel} prize transport constraints.`,
    );
  }
}

function checkRescueRoute(
  getawayLower: string,
  resolved: ResolvedHeist,
  hard: string[],
): void {
  const complicationLabel = resolved.prizeComplicationLabel;
  if (complicationLabel === "Injured" || complicationLabel === "Unwilling") {
    const soloSprintPattern =
      /\b(sprint away alone|leave the hostage behind|abandon the captive)\b/i;
    if (soloSprintPattern.test(getawayLower)) {
      hard.push(
        `Getaway vectors cannot abandon or ignore the ${complicationLabel.toLowerCase()} subject of an ${resolved.heistType}.`,
      );
    }
  }
}

function checkSecurityContinuity(
  stages1and2: JsonObject,
  resolved: ResolvedHeist,
  alarmTrackText: string,
  getawayLower: string,
  soft: string[],
): void {
  // Soft: alarm steps or getaway vectors reference security features absent from Stage 2
  const stage2Text =
    `${getRingText(stages1and2, "perimeter")} ${getRingText(stages1and2, "access")} ${getRingText(stages1and2, "inner", resolved.innerRingLabel)}`.toLowerCase();
  const exoticSecurityTerms = [
    "laser grid",
    "turret",
    "moat",
    "hounds",
    "arcane ward",
    "null-field",
    "forcefield",
    "minefield",
  ];
  for (const term of exoticSecurityTerms) {
    if (
      (alarmTrackText.toLowerCase().includes(term) ||
        getawayLower.includes(term)) &&
      !stage2Text.includes(term)
    ) {
      soft.push(
        `Alarm steps or getaway vectors reference security features absent from Stage 2 ("${term}").`,
      );
      break;
    }
  }
}

function checkFlashbackOverlap(
  stages1and2: JsonObject,
  flashbacksRaw: unknown,
  flashbacksText: string,
  soft: string[],
): void {
  // Soft: flashbacks duplicate already-completed casing actions
  const casingText = formatCasing(stages1and2.casing).toLowerCase();
  const flashbacks = Array.isArray(flashbacksRaw)
    ? flashbacksRaw.map(String)
    : flashbacksText.split("\n").filter((l) => l.startsWith("- "));
  for (const fb of flashbacks) {
    const fbLower = fb.toLowerCase().replace(/^-\s*/, "");
    if (fbLower.length > 15 && casingText.includes(fbLower)) {
      soft.push("Flashback duplicates an already-completed casing action.");
      break;
    }
  }
}
