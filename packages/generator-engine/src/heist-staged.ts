/**
 * Staged AI generation for the Heist generator (#4222).
 *
 * The one-pass route asks the model to invent an entire 900-1,300-word score at
 * once: objective, practical prize complication, casing intel, three ordered
 * security rings, a five-step alarm track, complications, a compromised getaway,
 * and a flashback menu.
 *
 * This staged route writes the heist in dependency order, each stage seeing
 * only the validated output of the stages before it:
 *
 * 1. objective: title, player-facing hook (content), concrete objective (bound to
 *    heistType), the prize and its practical complication, and actionable casing intel.
 * 2. security: three security rings (Perimeter, Access, Inner) and the hidden
 *    factor, built against the locked target and casing constraints from Stage 1.
 * 3. response: five-step alarm track, triggered complications, compromised getaway,
 *    and player flashback menu anchored to Stages 1-2.
 * 4. coherence: assemble through parseHeistResponse, validate with validateHeist,
 *    and run the bounded semantic audit and targeted repair.
 *
 * Earlier stage facts are locked by construction: later stages cannot rename
 * or overwrite the objective, prize, casing intel, or security rings. If any
 * stage remains unusable after its single retry, it returns null and falls back
 * cleanly to the existing one-pass route. Cancellation aborts immediately.
 */

import {
  avoidNamesExcludingContext,
  extractProperNouns,
  formatCampaignContextBlock,
} from "./campaign-context";
import {
  FIXING_DETAIL,
  ONE_PASS_DETAIL,
  StagedProgress,
  type StagedProgressStep,
} from "./staged-progress";
import {
  isAbort,
  runCheckedStage,
  throwIfAborted,
  type DraftCheck,
  type JsonObject,
} from "./staged-runtime";
import {
  buildHeistAuditPrompt,
  buildHeistRepairPrompt,
  canonicalOptionLabels,
  parseHeistAuditResponse,
  parseHeistResponse,
  type HeistGeneratorOptions,
  type HeistPrompt,
  type HeistSemanticAudit,
  type ResolvedHeist,
} from "./public-heist";
import { validateHeist, type HeistFinding } from "./heist-validation";
import { NAME_BAN_PROMPT } from "./public-npc";
import { bannedNamesIn } from "./naming-policy";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { type Rng } from "./random-utils";

export type HeistStageId = "objective" | "security" | "response" | "coherence";

export interface HeistStagedDeps {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  rng?: Rng;
  /** Caller-supplied context placed before every stage. */
  contextPrefix?: string;
  /** Live step list for the page. */
  onProgress?: (steps: StagedProgressStep[]) => void;
  /** Called once when a run finishes or gives up (not on abort). */
  onStats?: (stats: HeistStagedStats) => void;
  now?: () => number;
}

export interface HeistStagedStats {
  outcome: "staged" | "fell-back";
  stoppedAt?: HeistStageId | "assembly";
  aiCalls: number;
  elapsedMs: number;
  repairedStages: HeistStageId[];
  coherenceRepaired: boolean;
  reviewIssues: string[];
  reviewSkipped: boolean;
  remainingIssues: string[];
}

export interface HeistStagedResult {
  output: PublicGeneratorOutput;
  stats: HeistStagedStats;
}

export function heistStatsLog(stats: HeistStagedStats) {
  return {
    outcome: stats.outcome,
    stoppedAt: stats.stoppedAt,
    aiCalls: stats.aiCalls,
    elapsedMs: stats.elapsedMs,
    repairedStageCount: stats.repairedStages.length,
    coherenceRepaired: stats.coherenceRepaired,
    reviewIssueCount: stats.reviewIssues.length,
    remainingIssueCount: stats.remainingIssues.length,
  };
}

const text = (v: unknown): string => {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    return v
      .filter((x): x is string => typeof x === "string")
      .join(" ")
      .trim();
  }
  return "";
};

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rec = (v: unknown): JsonObject =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as JsonObject) : {};

// ---------------------------------------------------------------------------
// Formatters & Normalizers
// ---------------------------------------------------------------------------

export function formatCasing(casingRaw: unknown): string {
  if (!casingRaw) return "";
  if (typeof casingRaw === "string") {
    return casingRaw.trim();
  }
  if (Array.isArray(casingRaw)) {
    return casingRaw
      .map((item) => {
        if (typeof item === "string") {
          return item.trim().startsWith("- ")
            ? item.trim()
            : `- ${item.trim()}`;
        }
        if (item && typeof item === "object") {
          const r = item as Record<string, unknown>;
          const label = String(r.label || r.title || "Detail")
            .replace(/\*\*/g, "")
            .trim();
          const detail = String(r.detail || r.text || "").trim();
          return `- **${label}**: ${detail}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

// fallow-ignore-next-line complexity
export function getRingText(
  data: JsonObject,
  key: "perimeter" | "access" | "inner",
  innerLabel = "Inner",
): string {
  const rings = rec(data.rings);
  if (typeof rings[key] === "string" && text(rings[key])) {
    return text(rings[key]);
  }
  if (typeof data[key] === "string" && text(data[key])) {
    return text(data[key]);
  }
  if (key === "inner") {
    const directInner =
      rings[innerLabel] ??
      rings[innerLabel.toLowerCase()] ??
      data[innerLabel] ??
      data[innerLabel.toLowerCase()];
    if (typeof directInner === "string" && text(directInner)) {
      return text(directInner);
    }
  }
  // Try extracting from a combined securityRings string
  const combined = text(data.securityRings);
  if (combined) {
    const searchLabel =
      key === "perimeter"
        ? "Perimeter"
        : key === "access"
          ? "Access"
          : innerLabel;
    const match = combined.match(
      new RegExp(
        `-\\s*\\*\\*${searchLabel}\\*\\*:\\s*([^\\n]+(?:\\n(?!-\\s*\\*\\*)[^\\n]+)*)`,
        "i",
      ),
    );
    if (match) return match[1].trim();
  }
  return "";
}

export function formatSecurityRings(
  stage2: JsonObject,
  resolved: ResolvedHeist,
): string {
  if (typeof stage2.securityRings === "string" && text(stage2.securityRings)) {
    return text(stage2.securityRings);
  }
  const perimeter = getRingText(stage2, "perimeter");
  const access = getRingText(stage2, "access");
  const inner = getRingText(stage2, "inner", resolved.innerRingLabel);

  return [
    `- **Perimeter**: ${perimeter}`,
    `- **Access**: ${access}`,
    `- **${resolved.innerRingLabel}**: ${inner}`,
  ].join("\n");
}

export function formatAlarmTrack(alarmTrackRaw: unknown): string {
  if (!alarmTrackRaw) return "";
  if (typeof alarmTrackRaw === "string") return alarmTrackRaw.trim();
  if (Array.isArray(alarmTrackRaw)) {
    const defaultLabels = [
      "Quiet",
      "Suspicion",
      "Alert",
      "Lockdown",
      "Lethal Response",
    ];
    return alarmTrackRaw
      .map((item, index) => {
        if (typeof item === "string") {
          return item.trim().startsWith("- ")
            ? item.trim()
            : `- ${item.trim()}`;
        }
        const r = rec(item);
        const level = r.level !== undefined ? Number(r.level) : index;
        const label = String(
          r.label || defaultLabels[level] || `Level ${level}`,
        );
        const detail = String(r.detail || r.text || "").trim();
        return `- **${level} — ${label}**: ${detail}`;
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

// fallow-ignore-next-line complexity
function formatComplicationItem(
  item: unknown,
  index: number,
  state: { hasDefault: boolean },
): string {
  if (typeof item === "string") {
    let line = item.trim().startsWith("- ") ? item.trim() : `- ${item.trim()}`;
    if (!state.hasDefault && index === 0) {
      line = line.replace(/-\s*\*\*([^*]+)\*\*:/, "- **$1 (default)**:");
      state.hasDefault = true;
    }
    return line;
  }
  const r = rec(item);
  let label = String(
    r.label || r.title || (index === 0 ? "Likely (default)" : "Alternative"),
  );
  if (!state.hasDefault && index === 0 && !label.includes("(default)")) {
    label = `${label} (default)`;
    state.hasDefault = true;
  }
  const detail = String(r.detail || r.text || "").trim();
  return `- **${label}**: ${detail}`;
}

export function formatComplications(complicationsRaw: unknown): string {
  if (!complicationsRaw) return "";
  if (typeof complicationsRaw === "string") {
    let raw = complicationsRaw.trim();
    if (!raw.includes("(default)")) {
      raw = raw.replace(/-\s*\*\*([^*]+)\*\*:/, "- **$1 (default)**:");
    }
    return raw;
  }
  if (Array.isArray(complicationsRaw)) {
    const state = {
      hasDefault: complicationsRaw.some((item) =>
        typeof item === "string"
          ? item.includes("(default)")
          : String((item as Record<string, unknown>).label || "").includes(
              "(default)",
            ),
      ),
    };
    return complicationsRaw
      .map((item, index) => formatComplicationItem(item, index, state))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function formatGetaway(getawayRaw: unknown): string {
  if (!getawayRaw) return "";
  if (typeof getawayRaw === "string") return getawayRaw.trim();
  if (typeof getawayRaw === "object" && !Array.isArray(getawayRaw)) {
    const r = getawayRaw as Record<string, unknown>;
    const lead = text(r.lead ?? r.status ?? "");
    const options = arr(r.options ?? r.routes)
      .map((opt) => {
        if (typeof opt === "string")
          return opt.startsWith("- ") ? opt : `- ${opt}`;
        const ro = rec(opt);
        return `- **${ro.label || "Route"}**: ${ro.detail || ro.text || ""}`;
      })
      .join("\n");
    const pursuit = text(r.pursuit) ? `**Pursuit**: ${text(r.pursuit)}` : "";
    return [lead, options, pursuit].filter(Boolean).join("\n");
  }
  return "";
}

export function formatFlashbacks(flashbacksRaw: unknown): string {
  if (!flashbacksRaw) return "";
  if (typeof flashbacksRaw === "string") {
    let trimmed = flashbacksRaw.trim();
    if (!trimmed.startsWith("Offer these;")) {
      trimmed = `Offer these; never assume the players used them.\n${trimmed}`;
    }
    return trimmed;
  }
  if (Array.isArray(flashbacksRaw)) {
    const lines = flashbacksRaw
      .map((item) => {
        const s = typeof item === "string" ? item.trim() : String(item).trim();
        return s.startsWith("- ") ? s : `- ${s}`;
      })
      .filter(Boolean);
    return `Offer these; never assume the players used them.\n${lines.join("\n")}`;
  }
  return "";
}

// fallow-ignore-next-line complexity
function extractDefaultComplication(complicationsRaw: unknown): string {
  if (typeof complicationsRaw === "string") {
    const match = complicationsRaw.match(/\(default\)\*\*:\s*([^\n]+)/i);
    if (match) return match[1].trim();
  }
  if (Array.isArray(complicationsRaw)) {
    for (const c of complicationsRaw) {
      if (typeof c === "string" && c.includes("(default)")) {
        const match = c.match(/\(default\)\*\*:\s*([^\n]+)/i);
        if (match) return match[1].trim();
        return c.replace(/^[-\s*]+/, "").trim();
      }
      if (c && typeof c === "object") {
        const r = c as Record<string, unknown>;
        if (String(r.label || "").includes("(default)")) {
          return String(r.detail || r.text || "").trim();
        }
      }
    }
  }
  return "";
}

export function formatQuickReference(
  stage3: JsonObject,
  stage1: JsonObject,
  stage2: JsonObject,
  resolved: ResolvedHeist,
): string {
  if (
    typeof stage3.quickReference === "string" &&
    text(stage3.quickReference)
  ) {
    return text(stage3.quickReference)
      .replace(/\s*\(default\)/gi, "")
      .trim();
  }
  const defaultComp =
    extractDefaultComplication(stage3.complications).replace(
      /\s*\(default\)/gi,
      "",
    ) || "Reinforcements seal off primary escape routes.";
  return [
    `- **Objective**: ${text(stage1.summary) || resolved.title}.`,
    `- **Primary obstacle**: Three security layers protecting ${resolved.objectiveProtects}.`,
    `- **Hidden factor**: ${text(stage2.hiddenFactor) || "Intel discrepancy inside the secured perimeter."}`,
    `- **Point of no return**: ${resolved.objectiveCompletion} begins the getaway phase.`,
    `- **Pressure**: ${resolved.pressureSummary}`,
    `- **Default complication**: ${defaultComp}`,
    `- **Escape problem**: The primary route becomes compromised once the alarm triggers.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Stage Validators (Exported Pure Functions)
// ---------------------------------------------------------------------------

// fallow-ignore-next-line complexity
export function checkHeistObjectiveStage(
  data: JsonObject,
  resolved: ResolvedHeist,
  avoidNames: string[] = [],
): DraftCheck {
  const hard: string[] = [];
  const soft: string[] = [];

  const title = text(data.title);
  const score = text(data.score);
  const objective = text(data.objective);
  const casingRaw = data.casing;
  const content = text(data.content);

  // Hard: missing title/hook/objective/casing
  if (!title) hard.push("missing required field: title");
  if (!score && !content.includes("### The Score")) {
    hard.push("missing required player-facing hook: score");
  }
  if (!objective && !content.includes(`### ${resolved.objectiveHeading}`)) {
    hard.push("missing required objective section");
  }
  const hasCasing =
    (Array.isArray(casingRaw) && casingRaw.length > 0) ||
    (typeof casingRaw === "string" && casingRaw.trim().length > 0) ||
    content.includes("### Casing the Target");
  if (!hasCasing) {
    hard.push("missing required casing intel");
  }

  // Banned names in title or content
  const namesToCheck = [title];
  const banned = bannedNamesIn(namesToCheck, avoidNames);
  if (banned.length > 0) {
    hard.push(`banned placeholder name: ${banned.join(", ")}`);
  }

  // Objective violates heistType invariants
  const objectiveText = `${objective} ${score} ${content}`;
  if (resolved.heistType === "Theft" || resolved.heistType === "Swindle") {
    const destroyPattern =
      /\b(destroy|destroying|destruction|demolish|demolishing|detonate|detonating|kill|killing|assassinate|assassinating|eliminate|eliminating|obliterate|obliterating)\b/i;
    const match = objectiveText.match(destroyPattern);
    if (match) {
      hard.push(
        `A ${resolved.heistType} objective must acquire or con the target rather than destroy or kill it ("${match[0]}").`,
      );
    }
  } else if (
    resolved.heistType === "Rescue" ||
    resolved.heistType === "Extraction"
  ) {
    const killPattern =
      /\b(kill|killing|assassinate|assassinating|execute|executing|destroy|destroying|murder|murdering)\b/i;
    const match = objectiveText.match(killPattern);
    if (match) {
      hard.push(
        `A ${resolved.heistType} objective must extract or rescue the subject safely, not eliminate or kill them ("${match[0]}").`,
      );
    }
  } else if (resolved.heistType === "Assassination") {
    const stealPattern =
      /\b(steal|stealing|theft|loot|looting|rob|robbery|carry away)\b/i;
    const match = objectiveText.match(stealPattern);
    if (match) {
      hard.push(
        `An Assassination objective must eliminate the target rather than steal an object ("${match[0]}").`,
      );
    }
  } else if (resolved.heistType === "Plant Evidence") {
    const stealPattern =
      /\b(steal|stealing|theft|retrieve|retrieving|extract|extracting)\b/i;
    const match = objectiveText.match(stealPattern);
    if (match) {
      hard.push(
        `A Plant Evidence objective must place or plant evidence rather than retrieve or steal it ("${match[0]}").`,
      );
    }
  }

  if (resolved.heistType !== "Theft") {
    const removalPattern = /\bthe prize\b|\bprize's\b/i;
    const match = objectiveText.match(removalPattern);
    if (match) {
      hard.push(
        `A ${resolved.heistType} objective has no prize to steal; use the objective's own terms ("${match[0]}").`,
      );
    }
  }

  // Soft: vague casing intel without actionable physical/schedule facts
  const casingText = formatCasing(casingRaw) || content;
  const PHYSICAL_SCHEDULE_TERMS =
    /\b(door|doors|lock|locks|vent|vents|guard|guards|patrol|patrols|shift|shifts|hour|hours|key|keys|code|codes|time|timing|schedule|schedules|alarm|alarms|window|windows|route|routes|floor|floors|wall|walls|dock|docks|vault|vaults|alcove|corridor|gate|gates|fence|fences|camera|cameras|sensor|sensors|keeper|clerk|badge|uniform)\b/i;
  if (hasCasing && !PHYSICAL_SCHEDULE_TERMS.test(casingText)) {
    soft.push(
      "Casing intel lacks actionable physical or schedule facts (e.g. routes, shifts, guards, locks).",
    );
  }

  // Soft: missing seed/context fidelity
  if (resolved.prize) {
    const prizeNormalized = resolved.prize.toLowerCase().trim();
    const wholeText = `${title} ${score} ${objective} ${content}`.toLowerCase();
    if (!wholeText.includes(prizeNormalized)) {
      soft.push(
        `Objective does not incorporate the requested prize '${resolved.prize}'.`,
      );
    }
  }

  if (resolved.campaignContext) {
    const ctxWords = resolved.campaignContext
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
      .filter((w) => w.length > 4);
    const wholeText = `${title} ${score} ${objective} ${content}`.toLowerCase();
    const matchesAny = ctxWords.some((w) => wholeText.includes(w));
    if (ctxWords.length > 0 && !matchesAny) {
      soft.push("Score does not tie into the requested campaign context.");
    }
  }

  return { hard, soft };
}

// fallow-ignore-next-line complexity
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

  // Hard: fewer than two distinct bypass approaches per ring
  const checkBypass = (ringName: string, ringText: string) => {
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
  };

  checkBypass("Perimeter", perimeter);
  checkBypass("Access", access);
  checkBypass(resolved.innerRingLabel || "Inner", inner);

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

  // Hard: banned names
  const allText = `${perimeter} ${access} ${inner} ${hiddenFactor}`;
  const banned = bannedNamesIn(extractProperNouns(allText), avoidNames);
  if (banned.length > 0) {
    hard.push(`banned placeholder name: ${banned.join(", ")}`);
  }

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
    const ringsText = `${perimeter} ${access} ${inner}`.toLowerCase();
    const paidOff = casingTerms.some((t) => ringsText.includes(t));
    if (casingTerms.length > 0 && !paidOff) {
      soft.push(
        "Casing intel facts from Stage 1 are not referenced or paid off in any security ring.",
      );
    }
  }

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

  return { hard, soft };
}

// fallow-ignore-next-line complexity
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

  // Hard: missing alarm track, complications, getaway, or flashbacks
  if (!alarmTrackText) hard.push("missing required alarm track");
  if (!complicationsText) hard.push("missing required complications");
  if (!getawayText) hard.push("missing required getaway section");
  if (!flashbacksText) hard.push("missing required flashback opportunities");

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

  // Hard: getaway ignores heistType / prize transport constraints
  const complicationLabel = resolved.prizeComplicationLabel;
  const getawayLower = getawayText.toLowerCase();
  if (complicationLabel === "Huge") {
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
  } else if (
    complicationLabel === "Fragile" ||
    complicationLabel === "Volatile"
  ) {
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
  } else if (
    resolved.heistType === "Rescue" ||
    resolved.heistType === "Extraction"
  ) {
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

  // Hard: banned names
  const allText = `${alarmTrackText} ${complicationsText} ${getawayText} ${flashbacksText}`;
  const banned = bannedNamesIn(extractProperNouns(allText), avoidNames);
  if (banned.length > 0) {
    hard.push(`banned placeholder name: ${banned.join(", ")}`);
  }

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

  return { hard, soft };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function assembleHeist(
  stage1: JsonObject,
  stage2: JsonObject,
  stage3: JsonObject,
  resolved: ResolvedHeist,
): JsonObject {
  const score = text(stage1.score);
  const objective = text(stage1.objective);
  const casing = formatCasing(stage1.casing);

  const content = `### The Score\n${score}\n\n### ${resolved.objectiveHeading}\n${objective}\n\n### Casing the Target\n${casing}`;

  const quickRef = formatQuickReference(stage3, stage1, stage2, resolved);
  const hiddenFactor = text(stage2.hiddenFactor);
  const securityRings = formatSecurityRings(stage2, resolved);
  const alarmTrack = formatAlarmTrack(stage3.alarmTrack);
  const complications = formatComplications(stage3.complications);
  const moment = text(stage3.moment);
  const getaway = formatGetaway(stage3.getaway);
  const flashbacks = formatFlashbacks(stage3.flashbacks);

  const lore = `### GM Quick Reference\n${quickRef}\n\n### The Hidden Factor\n${hiddenFactor}\n\n### Security Rings\n${securityRings}\n\n### Alarm Track\n${alarmTrack}\n\n### Complications\n${complications}\n\n### ${resolved.momentHeading}\n${moment}\n\n### The Getaway\n${getaway}\n\n### Flashback Opportunities\n${flashbacks}`;

  return {
    title: text(stage1.title) || resolved.title,
    summary: text(stage1.summary) || resolved.title,
    content,
    lore,
    labels: ["heist", "heist-generator", ...canonicalOptionLabels(resolved)],
  };
}

// ---------------------------------------------------------------------------
// Prompt Builders
// ---------------------------------------------------------------------------

function settingBlock(resolved: ResolvedHeist, contextPrefix = ""): string {
  return `${contextPrefix ? `${contextPrefix}\n\n` : ""}Heist Options:
- Genre: ${resolved.genre}
- Heist Type: ${resolved.heistType}
- Target Scale: ${resolved.targetScale}
- Target: ${resolved.targetType}
- Starting position: ${resolved.objectiveStartsWith}
- What the security protects: ${resolved.objectiveProtects}
- Objective transition (not full mission success): ${resolved.objectiveCompletion}
- Possible detection trigger: ${resolved.objectiveEscapeCause}
- Objective Complication: ${resolved.prizeComplication}
- Pressure: ${resolved.pressure}
${resolved.prize ? `- Requested Prize / Objective: ${resolved.prize}\n` : ""}${formatCampaignContextBlock(resolved.campaignContext)}`;
}

function objectiveMessage(
  resolved: ResolvedHeist,
  contextPrefix?: string,
): string {
  return `STAGE 1 OF 3: Target, Objective & Casing.

${settingBlock(resolved, contextPrefix)}

Write the target, objective, player hook, and casing intel that the rest of the score must build on. Later stages add the security rings, alarm track, complications, and getaway; here, establish only:
- title: A single evocative name for this score (3-6 words).
- summary: One sentence preserving the full success condition of The Score.
- score: ONE sentence naming the full success condition, the place, and the deadline, including getting clear with the objective where required — plus at most one more sentence of context.
- objective: At most four sentences covering ${resolved.objectiveFields}, then two bullets:
  - **The catch**: restating the practical complication (${resolved.prizeComplication}) as a concrete physical problem.
  - **Pressure**: stating what that costs and the exact trigger that makes it cost (${resolved.pressure}).
- casing: Exactly three bullets covering ${resolved.objectiveCasing}:
  - **Entry vector**: One sentence detailing a concrete entry vector.
  - **Known obstacle**: One sentence detailing an actionable obstacle or schedule.
  - **The objective**: One sentence describing where the objective sits and how it is handled.

${NAME_BAN_PROMPT}

Do not write the security rings, alarm track, complications, or getaway yet.

Return ONLY a JSON object matching this schema:
{
  "title": "A single evocative name for this score (3-6 words)",
  "summary": "One sentence preserving the full success condition of The Score",
  "score": "The Score player-facing text...",
  "objective": "Details covering location, window, protection, methods, with bullets '- **The catch**: ...' and '- **Pressure**: ...'",
  "casing": [
    { "label": "Entry vector", "detail": "One sentence with physical facts..." },
    { "label": "Known obstacle", "detail": "One sentence with schedule or physical facts..." },
    { "label": "The objective", "detail": "One sentence describing where it sits and how it is handled..." }
  ]
}`;
}

function securityMessage(
  resolved: ResolvedHeist,
  stage1: JsonObject,
  contextPrefix?: string,
): string {
  return `STAGE 2 OF 3: Three Security Rings.

${settingBlock(resolved, contextPrefix)}

Established from Stage 1 (do not change, rename or contradict any of it):
- Title: ${text(stage1.title)}
- Summary: ${text(stage1.summary)}
- The Score: ${text(stage1.score)}
- Objective: ${text(stage1.objective)}
- Casing Intel:
${formatCasing(stage1.casing)}

Build the three ordered security rings against the locked target, casing intel, and physical constraints from Stage 1.
1. Perimeter (Outer): Patrols, grounds, exterior access.
2. Access (Middle): Checkpoints, staff credentials, doors, interior security.
3. ${resolved.innerRingLabel} (Inner): Directly protects the Stage 1 objective / prize.

Rules:
- Each ring MUST describe what protects that layer, then two or three genuinely different ways past it (drawn from stealth, deception, social leverage, stolen credentials, magic or technology, physical infiltration, bribery, prior preparation, exploiting a schedule, or environmental access). Never offer only fighting, and never offer only a single prescribed solution.
- The inner ring (${resolved.innerRingLabel}) MUST guard the specific objective and prize established in Stage 1.
- Pay off or reference the casing intel facts from Stage 1 (entry vector, known obstacle).
- Any clock introduced must have a stated step count and trigger.
- Include "hiddenFactor": At most two sentences naming one thing the crew's casing intel gets wrong, and when it becomes obvious at the table (complicating the plan without invalidating every approach at once).
${NAME_BAN_PROMPT}

Do not write the alarm track, complications, getaway, or flashbacks yet.

Return ONLY a JSON object matching this schema:
{
  "hiddenFactor": "At most two sentences: one thing the casing intel gets wrong and when it becomes obvious.",
  "rings": {
    "perimeter": "What protects the perimeter, then 2-3 genuinely different ways past it.",
    "access": "What protects the access floor/doors, then 2-3 genuinely different ways past it.",
    "inner": "What protects the ${resolved.innerRingLabel}, guarding the Stage 1 objective, then 2-3 genuinely different ways past it."
  }
}`;
}

function responseMessage(
  resolved: ResolvedHeist,
  stage1: JsonObject,
  stage2: JsonObject,
  contextPrefix?: string,
): string {
  return `STAGE 3 OF 3: Alarm Track, Complications, Getaway & Flashbacks.

${settingBlock(resolved, contextPrefix)}

Established from Stages 1 and 2 (do not change or contradict):
- Title: ${text(stage1.title)}
- The Score: ${text(stage1.score)}
- Objective: ${text(stage1.objective)}
- Casing Intel:
${formatCasing(stage1.casing)}
- Hidden Factor: ${text(stage2.hiddenFactor)}
- Security Rings:
${formatSecurityRings(stage2, resolved)}

Build the alarm track, complications, getaway, and flashbacks anchored strictly to Stages 1 and 2:
- Alarm Track: Exactly five levels:
  - 0 — Quiet: Routine holds.
  - 1 — Suspicion: Patrol timings disrupted or guard checking a concern.
  - 2 — Alert: Exits watched, reinforcements summoned.
  - 3 — Lockdown: Primary exits barred or sealed.
  - 4 — Lethal Response: Extremely dangerous but still interactive response.
- Complications: Exactly three bullets: one marked "(default)" and two alternatives.
- ${resolved.momentHeading}: At most two sentences: what changes when the crew completes the objective action, and whether/when security discovers it.
- The Getaway: State whether and until when the entry route remains usable according to "${resolved.momentHeading}", then 2-3 genuinely different escape options, and a '**Pursuit**: ' line naming possible pursuer and tracking trigger. Getaway must respect the prize transport constraints (${resolved.prizeComplication}).
- Flashback Opportunities: 4 to 6 bullets naming preparations players COULD establish. Must attach to obstacles established in Stage 2, and must not duplicate casing intel already completed in Stage 1.
- Quick Reference: Seven short one-line bullets summarising: Objective, Primary obstacle, Hidden factor, Point of no return, Pressure, Default complication, Escape problem.
${NAME_BAN_PROMPT}

Return ONLY a JSON object matching this schema:
{
  "quickReference": "Seven one-line bullets: - **Objective**: ...\\n- **Primary obstacle**: ...\\n- **Hidden factor**: ...\\n- **Point of no return**: ...\\n- **Pressure**: ...\\n- **Default complication**: ...\\n- **Escape problem**: ...",
  "alarmTrack": [
    { "level": 0, "label": "Quiet", "detail": "..." },
    { "level": 1, "label": "Suspicion", "detail": "..." },
    { "level": 2, "label": "Alert", "detail": "..." },
    { "level": 3, "label": "Lockdown", "detail": "..." },
    { "level": 4, "label": "Lethal Response", "detail": "..." }
  ],
  "complications": [
    { "label": "Likely (default)", "detail": "..." },
    { "label": "Alternative", "detail": "..." },
    { "label": "Alternative", "detail": "..." }
  ],
  "moment": "At most two sentences...",
  "getaway": "One sentence on entry route, then 2-3 escape bullets, and '**Pursuit**: ...'",
  "flashbacks": [
    "Flashback preparation 1...",
    "Flashback preparation 2...",
    "Flashback preparation 3...",
    "Flashback preparation 4..."
  ]
}`;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const PROGRESS_STEPS: ReadonlyArray<{ id: HeistStageId; label: string }> = [
  { id: "objective", label: "Target, objective and casing" },
  { id: "security", label: "Three security rings" },
  { id: "response", label: "Alarm track and getaway" },
  { id: "coherence", label: "Coherence and review" },
];

interface RunState {
  stats: HeistStagedStats;
  progress: StagedProgress<HeistStageId>;
  system: string;
}

// fallow-ignore-next-line code-duplication
export async function generateHeistStaged(
  prompt: HeistPrompt,
  options: HeistGeneratorOptions,
  deps: HeistStagedDeps,
): Promise<HeistStagedResult | null> {
  const now = deps.now ?? Date.now;
  const started = now();
  const stats: HeistStagedStats = {
    outcome: "fell-back",
    aiCalls: 0,
    elapsedMs: 0,
    repairedStages: [],
    coherenceRepaired: false,
    reviewIssues: [],
    reviewSkipped: false,
    remainingIssues: [],
  };
  // fallow-ignore-next-line code-duplication
  const result = await runStaged(prompt, options, deps, stats);
  if (result) stats.outcome = "staged";
  stats.elapsedMs = now() - started;
  deps.onStats?.(stats);
  return result ? { output: result, stats } : null;
}

async function runStaged(
  prompt: HeistPrompt,
  options: HeistGeneratorOptions,
  deps: HeistStagedDeps,
  stats: HeistStagedStats,
): Promise<PublicGeneratorOutput | null> {
  const resolved = prompt.resolved;
  const prefix = deps.contextPrefix ?? "";
  const run: RunState = {
    stats,
    progress: new StagedProgress(PROGRESS_STEPS, deps.onProgress),
    system: prompt.systemInstruction,
  };
  const avoid = avoidNamesExcludingContext([], options.campaignContext);
  const stop = (at: HeistStagedStats["stoppedAt"]) => {
    stats.stoppedAt = at;
    return null;
  };

  throwIfAborted(deps.signal);

  // Stage 1: Objective
  const objectiveStage = await runCheckedStage(
    deps.complete,
    run,
    {
      id: "objective",
      system: run.system,
      message: objectiveMessage(resolved, prefix),
      check: (d) => checkHeistObjectiveStage(d, resolved, avoid),
    },
    deps.signal,
  );
  if (!objectiveStage) return stop("objective");

  throwIfAborted(deps.signal);

  // Stage 2: Security Rings
  const securityStage = await runCheckedStage(
    deps.complete,
    run,
    {
      id: "security",
      system: run.system,
      message: securityMessage(resolved, objectiveStage.data, prefix),
      check: (d) =>
        checkHeistSecurityStage(d, objectiveStage.data, resolved, avoid),
    },
    deps.signal,
  );
  if (!securityStage) return stop("security");

  throwIfAborted(deps.signal);

  // Stage 3: Response & Getaway
  const responseStage = await runCheckedStage(
    deps.complete,
    run,
    {
      id: "response",
      system: run.system,
      message: responseMessage(
        resolved,
        objectiveStage.data,
        securityStage.data,
        prefix,
      ),
      check: (d) =>
        checkHeistResponseStage(
          d,
          { ...objectiveStage.data, ...securityStage.data },
          resolved,
          avoid,
        ),
    },
    deps.signal,
  );
  if (!responseStage) return stop("response");

  throwIfAborted(deps.signal);

  // Stage 4: Coherence
  const assembled = assembleHeist(
    objectiveStage.data,
    securityStage.data,
    responseStage.data,
    resolved,
  );

  return finishHeistCoherence(
    deps,
    run,
    assembled,
    resolved,
    prompt.reviewContext ?? prefix,
  );
}

// fallow-ignore-next-line complexity
async function finishHeistCoherence(
  deps: HeistStagedDeps,
  run: RunState,
  assembled: JsonObject,
  resolved: ResolvedHeist,
  reviewContext = "",
): Promise<PublicGeneratorOutput | null> {
  run.progress.set("coherence", "active");
  let output: PublicGeneratorOutput;
  try {
    output = parseHeistResponse(JSON.stringify(assembled), resolved);
    if (!output.content.trim() || !output.lore.trim()) {
      throw new Error("Assembled heist content or lore is empty.");
    }
  } catch {
    run.progress.abandon("coherence", ONE_PASS_DETAIL);
    run.stats.stoppedAt = "assembly";
    return null;
  }

  const before = validateHeist({
    heistType: resolved.heistType,
    genre: resolved.genre,
    content: output.content,
    lore: output.lore,
  });

  throwIfAborted(deps.signal);

  let audit: HeistSemanticAudit | null = null;
  let auditError = false;
  try {
    run.stats.aiCalls++;
    const auditPrompt = buildHeistAuditPrompt(
      output,
      before,
      resolved,
      reviewContext,
    );
    const auditReply = await deps.complete(
      "You are an assistant that audits RPG heist scenarios in JSON format.",
      auditPrompt,
    );
    throwIfAborted(deps.signal);
    audit = parseHeistAuditResponse(auditReply);
  } catch (err) {
    if (isAbort(err, deps.signal)) throw err;
    auditError = true;
  }

  throwIfAborted(deps.signal);

  const needsFixing =
    (audit && (audit.verdict === "repair" || audit.issues.length > 0)) ||
    before.some((f) => f.severity === "structural");

  if (audit && audit.issues) {
    run.stats.reviewIssues = audit.issues.map((i) => i.problem);
  } else if (auditError) {
    run.stats.reviewSkipped = true;
  }

  if (needsFixing) {
    run.progress.set("coherence", "active", FIXING_DETAIL);
    try {
      run.stats.aiCalls++;
      const effectiveAudit: HeistSemanticAudit = audit ?? {
        verdict: "repair",
        fullScore: output.summary || resolved.title,
        transitions: [
          {
            event: "Objective completion",
            stateBefore: "Infiltration",
            stateAfter: "Escape",
            factsChanged: ["objective: completed"],
          },
        ],
        issues: before.map((f, i) => ({
          id: `det-${i + 1}`,
          sections: ["General"],
          problem: f.message,
          requiredFact:
            "Resolve this issue while preserving scenario invariants.",
        })),
      };
      const repairPrompt = buildHeistRepairPrompt(
        effectiveAudit,
        before,
        resolved,
      );
      const repairReply = await deps.complete(
        "You are an assistant that repairs RPG heist scenarios in JSON format.",
        repairPrompt,
      );
      throwIfAborted(deps.signal);
      const repaired = parseHeistResponse(repairReply, resolved);
      const after = validateHeist({
        heistType: resolved.heistType,
        genre: resolved.genre,
        content: repaired.content,
        lore: repaired.lore,
      });

      const structuralCount = (list: HeistFinding[]) =>
        list.filter((f) => f.severity === "structural").length;

      if (structuralCount(after) <= structuralCount(before)) {
        output = repaired;
        run.stats.coherenceRepaired = true;
        run.stats.remainingIssues = after.map((f) => f.message);
      } else {
        run.stats.remainingIssues = before.map((f) => f.message);
      }
    } catch (err) {
      if (isAbort(err, deps.signal)) throw err;
      run.stats.remainingIssues = before.map((f) => f.message);
    }
  } else {
    run.stats.remainingIssues = before.map((f) => f.message);
  }

  run.progress.set("coherence", "done");
  return output;
}
