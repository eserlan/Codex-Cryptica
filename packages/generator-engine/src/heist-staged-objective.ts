import type { JsonObject, DraftCheck } from "./staged-runtime";
import type { ResolvedHeist } from "./public-heist";
import { addBannedNameFindings } from "./heist-staged-validation";
import { text } from "./heist-staged-values";
import { formatCasing } from "./heist-staged-formatters";

export function checkHeistObjectiveStage(
  data: JsonObject,
  resolved: ResolvedHeist,
  avoidNames: string[] = [],
): DraftCheck {
  const hard: string[] = [];
  const soft: string[] = [];

  const { title, score, objective, casingRaw, content, hasCasing } =
    checkObjectiveShape(data, resolved, hard);

  // Banned names in title or content
  const namesToCheck = [title];
  addBannedNameFindings(namesToCheck, avoidNames, hard);

  checkObjectiveInvariants(`${objective} ${score} ${content}`, resolved, hard);

  // Soft: vague casing intel without actionable physical/schedule facts
  const casingText = formatCasing(casingRaw) || content;
  const PHYSICAL_SCHEDULE_TERMS =
    /\b(door|doors|lock|locks|vent|vents|guard|guards|patrol|patrols|shift|shifts|hour|hours|key|keys|code|codes|time|timing|schedule|schedules|alarm|alarms|window|windows|route|routes|floor|floors|wall|walls|dock|docks|vault|vaults|alcove|corridor|gate|gates|fence|fences|camera|cameras|sensor|sensors|keeper|clerk|badge|uniform)\b/i;
  if (hasCasing && !PHYSICAL_SCHEDULE_TERMS.test(casingText)) {
    soft.push(
      "Casing intel lacks actionable physical or schedule facts (e.g. routes, shifts, guards, locks).",
    );
  }

  checkObjectiveFidelity(
    `${title} ${score} ${objective} ${content}`.toLowerCase(),
    resolved,
    soft,
  );

  return { hard, soft };
}

function checkObjectiveShape(
  data: JsonObject,
  resolved: ResolvedHeist,
  hard: string[],
) {
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
  const hasCasing = hasCasingIntel(casingRaw, content);
  if (!hasCasing) {
    hard.push("missing required casing intel");
  }

  return { title, score, objective, casingRaw, content, hasCasing };
}

function checkObjectiveInvariants(
  objectiveText: string,
  resolved: ResolvedHeist,
  hard: string[],
): void {
  const rule = objectiveRule(resolved);
  const violation = rule && objectiveText.match(rule.pattern);
  if (rule && violation) {
    hard.push(`${rule.message} ("${violation[0]}").`);
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
}

function checkObjectiveFidelity(
  wholeText: string,
  resolved: ResolvedHeist,
  soft: string[],
): void {
  // Soft: missing seed/context fidelity
  if (resolved.prize) {
    const prizeNormalized = resolved.prize.toLowerCase().trim();
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
    const matchesAny = ctxWords.some((w) => wholeText.includes(w));
    if (ctxWords.length > 0 && !matchesAny) {
      soft.push("Score does not tie into the requested campaign context.");
    }
  }
}

function objectiveRule(resolved: ResolvedHeist) {
  if (resolved.heistType === "Theft" || resolved.heistType === "Swindle")
    return {
      pattern:
        /\b(destroy|destroying|destruction|demolish|demolishing|detonate|detonating|kill|killing|assassinate|assassinating|eliminate|eliminating|obliterate|obliterating)\b/i,
      message: `A ${resolved.heistType} objective must acquire or con the target rather than destroy or kill it`,
    };
  if (resolved.heistType === "Rescue" || resolved.heistType === "Extraction")
    return {
      pattern:
        /\b(kill|killing|assassinate|assassinating|execute|executing|destroy|destroying|murder|murdering)\b/i,
      message: `A ${resolved.heistType} objective must extract or rescue the subject safely, not eliminate or kill them`,
    };
  if (resolved.heistType === "Assassination")
    return {
      pattern:
        /\b(steal|stealing|theft|loot|looting|rob|robbery|carry away)\b/i,
      message: `An Assassination objective must eliminate the target rather than steal an object`,
    };
  if (resolved.heistType === "Plant Evidence")
    return {
      pattern:
        /\b(steal|stealing|theft|retrieve|retrieving|extract|extracting)\b/i,
      message: `A Plant Evidence objective must place or plant evidence rather than retrieve or steal it`,
    };
  return undefined;
}

function hasCasingIntel(casingRaw: unknown, content: string): boolean {
  return (
    (Array.isArray(casingRaw) && casingRaw.length > 0) ||
    (typeof casingRaw === "string" && casingRaw.trim().length > 0) ||
    content.includes("### Casing the Target")
  );
}
