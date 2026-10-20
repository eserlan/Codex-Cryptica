import type { JsonObject } from "./staged-runtime";
import type { ResolvedHeist } from "./public-heist";
import { formatCampaignContextBlock } from "./campaign-context";
import { NAME_BAN_PROMPT } from "./public-npc";
import { text } from "./heist-staged-values";
import { formatCasing, formatSecurityRings } from "./heist-staged-formatters";

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

export function objectiveMessage(
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

export function securityMessage(
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

export function responseMessage(
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
