import type { JsonObject, DraftCheck } from "./staged-runtime";
import type { ResolvedHeist } from "./public-heist";
import { addBannedNameFindings } from "./heist-staged-validation";
import { text } from "./heist-staged-values";
import { extractProperNouns } from "./campaign-context";
import { formatCasing, getRingText } from "./heist-staged-formatters";

export function checkHeistSecurityStage(
  data: JsonObject,
  stage1: JsonObject,
  resolved: ResolvedHeist,
  avoidNames: string[] = [],
): DraftCheck {
  const hard: string[] = [];
  const soft: string[] = [];

  const perimeter = getRingText(data, "perimeter");
  const access = getRingText(data, "access");
  const inner = getRingText(data, "inner", resolved.innerRingLabel);
  const hiddenFactor = text(data.hiddenFactor);

  // Hard: missing any of the 3 rings
  if (!perimeter) hard.push("missing required security ring: Perimeter");
  if (!access) hard.push("missing required security ring: Access");
  if (!inner) {
    hard.push(
      `missing required security ring: ${resolved.innerRingLabel} (Inner)`,
    );
  }

  checkBypass("Perimeter", perimeter, hard);
  checkBypass("Access", access, hard);
  checkBypass(resolved.innerRingLabel || "Inner", inner, hard);

  checkInnerObjective(inner, stage1, resolved, hard);

  // Hard: banned names
  const allText = `${perimeter} ${access} ${inner} ${hiddenFactor}`;
  addBannedNameFindings(extractProperNouns(allText), avoidNames, hard);

  checkCasingPayoff(
    stage1,
    `${perimeter} ${access} ${inner}`.toLowerCase(),
    soft,
  );
  checkSecurityClocks(allText, soft);

  return { hard, soft };
}

function checkBypass(ringName: string, ringText: string, hard: string[]): void {
  if (!ringText) return;
  const bypassMarkers =
    /\b(pass by|ways? past|bypass by|either\b.*?\bor\b|\bor\b|alternatively|another way|approach(?:es)?:|\bcan be bypassed\b|\bcan also\b|\bsecond option\b|\bsecond way\b|\boption(?:s)?\b|\bmethod(?:s)?\b)/i;
  const sentences = ringText
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 10);
  const hasMultipleApproaches =
    bypassMarkers.test(ringText) ||
    (ringText.includes(",") && /\bby\b/i.test(ringText)) ||
    (sentences.length >= 2 &&
      /\b(?:stealth|deception|social|credential|magic|hack|bribe|schedule|disguise|climb|tunnel|force)\b/i.test(
        ringText,
      ));
  if (!hasMultipleApproaches) {
    hard.push(
      `${ringName} ring does not describe at least two distinct bypass approaches.`,
    );
  }
}

function checkInnerObjective(
  inner: string,
  stage1: JsonObject,
  resolved: ResolvedHeist,
  hard: string[],
): void {
  // Hard: inner ring fails to guard the Stage 1 objective/prize
  if (inner) {
    const stage1Keywords = [
      resolved.prize,
      resolved.objectiveHeading,
      text(stage1.title),
      ...resolved.objectiveProtects.split(/\s+/).filter((w) => w.length > 3),
      "target",
      "objective",
      "prize",
      "vault",
      "sanctum",
      "cell",
      "archive",
      "terminal",
      "chamber",
      "custody",
      "strongroom",
    ]
      .filter(Boolean)
      .map((k) => String(k).toLowerCase());

    const innerLower = inner.toLowerCase();
    const guardsObjective = stage1Keywords.some((kw) =>
      innerLower.includes(kw),
    );
    if (!guardsObjective) {
      hard.push(
        `The inner ring (${resolved.innerRingLabel}) must guard the objective or prize established in Stage 1.`,
      );
    }
  }
}

function checkCasingPayoff(
  stage1: JsonObject,
  ringsText: string,
  soft: string[],
): void {
  // Soft: casing intel facts from Stage 1 never paid off in any ring
  const casingText = formatCasing(stage1.casing);
  if (casingText) {
    const casingTerms = casingText
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ""))
      .filter(
        (w) =>
          w.length > 4 &&
          ![
            "entry",
            "vector",
            "known",
            "obstacle",
            "objective",
            "target",
            "detail",
            "sentence",
          ].includes(w),
      );
    const paidOff = casingTerms.some((t) => ringsText.includes(t));
    if (casingTerms.length > 0 && !paidOff) {
      soft.push(
        "Casing intel facts from Stage 1 are not referenced or paid off in any security ring.",
      );
    }
  }
}

function checkSecurityClocks(allText: string, soft: string[]): void {
  // Soft: unanchored clocks without step counts or triggers
  const clockMatches = allText.match(/\b\w+\s+clock\b|\bclock\b/gi);
  if (clockMatches) {
    const hasStepCount =
      /\b(?:\d+|-step|two|three|four|five|six)\s*(?:-step|step|tick|segment)s?\b/i.test(
        allText,
      );
    const hasTrigger =
      /\b(advance|advances|advancing|each time|every|when)\b/i.test(allText);
    if (!hasStepCount || !hasTrigger) {
      soft.push(
        "Security rings introduce a clock without specifying its step count or advance trigger.",
      );
    }
  }
}
