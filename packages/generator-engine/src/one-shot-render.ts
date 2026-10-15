import type {
  OneShotAdventure,
  OneShotClue,
  OneShotScene,
} from "./one-shot-types";
import { checkPlayability } from "./one-shot-playability";

function hours(minutes: number): string {
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} hours` : `${minutes} minutes`;
}

function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

function names(adventure: OneShotAdventure, ids: string[]): string {
  return (
    ids
      .map((id) => adventure.npcs.find((n) => n.id === id)?.name)
      .filter(Boolean)
      .join(", ") || "None"
  );
}

function sceneTitles(adventure: OneShotAdventure, ids: string[]): string {
  return (
    ids
      .map((id) => adventure.scenes.find((s) => s.id === id)?.title)
      .filter(Boolean)
      .join("; ") || "The end"
  );
}

const clueName = (c: OneShotClue) => c.label ?? c.text;

/** The opening material sits inside scene 1, so its time is counted there. */
function openingBlock(adventure: OneShotAdventure, scene: OneShotScene) {
  const { opening } = adventure;
  return [
    opening.situation && opening.situation !== scene.situation
      ? opening.situation
      : "",
    opening.readAloud ? `> ${opening.readAloud}` : "",
    `**First decision:** ${opening.firstDecision}`,
    opening.involvement.length
      ? `**Ways to get involved**\n${bullets(opening.involvement)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function challengeBlock(scene: OneShotScene) {
  const { challenge } = scene;
  return [
    `**Challenge (${challenge.type}):** ${challenge.description}`,
    challenge.success ? `**What counts as success:** ${challenge.success}` : "",
    challenge.otherApproaches?.length
      ? `**Other approaches**\n${bullets(challenge.otherApproaches)}`
      : "",
    `**If the party fails:** ${challenge.failForward}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function sceneBlock(
  adventure: OneShotAdventure,
  scene: OneShotScene,
  n: number,
) {
  const clues = scene.clueIds
    .map((id) => adventure.clues.find((c) => c.id === id))
    .filter((c): c is OneShotClue => !!c)
    .map((c) => {
      const route = c.routes.find((r) => r.sceneId === scene.id);
      return `${c.label ? `**${c.label}:** ` : ""}${c.text}${route ? ` _(${route.method})_` : ""}`;
    });
  const opening =
    scene.kind === "opening" ? `${openingBlock(adventure, scene)}\n\n` : "";
  return `### ${n}. ${scene.title} (${scene.minutes} min, ${scene.essential ? "essential" : "optional"})

**Purpose:** ${scene.purpose}
**Location:** ${scene.location}
**Key NPCs:** ${names(adventure, scene.npcIds)}

${scene.situation}

${opening}**Likely approaches**
${bullets(scene.approaches)}

**Clues**
${clues.length ? bullets(clues) : "- None here"}

${challengeBlock(scene)}

**Likely outcomes**
${bullets(scene.outcomes)}

**Leads to:** ${sceneTitles(adventure, scene.next)}
**Running short:** ${scene.shorten}${!scene.essential && scene.skip ? `\n**Skip:** ${scene.skip}` : ""}`;
}

function questionsBlock(adventure: OneShotAdventure) {
  const questions = adventure.briefing.questions ?? [];
  if (!questions.length) return "";
  return `\n## Questions Players Will Ask\n${questions.map((q) => `- **${q.question}** ${q.answer}`).join("\n")}\n`;
}

function solutionBlock(adventure: OneShotAdventure) {
  const { solution } = adventure;
  if (!solution) return "";
  const where = (ids: string[]) => sceneTitles(adventure, ids);
  return `\n## How the Finale Works
${solution.summary ? `${solution.summary}\n\n` : ""}**What it needs**
${bullets(solution.requirements.map((r) => `**${r.what}:** ${r.detail} _(found in: ${where(r.sceneIds)})_`))}

**Steps**
${solution.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}${solution.alternatives.length ? `\n\n**Other ways through**\n${bullets(solution.alternatives)}` : ""}${solution.mistakes.length ? `\n\n**If they get it wrong**\n${bullets(solution.mistakes)}` : ""}
`;
}

function clockBlock(adventure: OneShotAdventure) {
  const { clock } = adventure;
  if (!clock) return "";
  return `\n## ${clock.name}
**Advances when:** ${clock.advances}
${clock.ticks.map((t, i) => `${i + 1}. ${t.trigger ? `_${t.trigger}:_ ` : ""}${t.effect}`).join("\n")}${clock.slow ? `\n\n**Slowing it:** ${clock.slow}` : ""}
`;
}

/** Gaps the review could not close, so the GM knows what to prepare. */
function gapsBlock(adventure: OneShotAdventure) {
  const gaps = checkPlayability(adventure);
  if (!gaps.length) return "";
  return `\n## Before You Run It\nThese parts still need a decision from you:\n${bullets(gaps.map((g) => g.message))}\n`;
}

/** The whole adventure as Markdown, in play order. */
export function renderOneShotMarkdown(adventure: OneShotAdventure): string {
  const { briefing } = adventure;
  const scenes = adventure.scenes
    .map((s, i) => sceneBlock(adventure, s, i + 1))
    .join("\n\n");
  const npcs = adventure.npcs
    .map(
      (n) =>
        `### ${n.name} — ${n.role}
- **Wants:** ${n.motivation}
- **Knows:** ${n.knows}
- **Reacts:** ${n.reaction}
- **Roleplay cues:** ${n.cues}`,
    )
    .join("\n\n");
  const endings = adventure.endings
    .map((e) => `- **${e.title}** — ${e.condition} ${e.consequence}`)
    .join("\n");

  return `# ${adventure.title}

_${adventure.genre} · ${adventure.system} · ${hours(adventure.durationMinutes)} · ${adventure.partySize} players${adventure.partyLevel ? ` · ${adventure.partyLevel}` : ""} · ${adventure.emphasis}_

## GM Briefing
**Premise:** ${briefing.premise}
**Hook:** ${briefing.hook}
**Player objective:** ${briefing.objective}
**Central truth:** ${briefing.secret}${briefing.trigger ? `\n**Why now:** ${briefing.trigger}` : ""}
**Stakes:** ${briefing.stakes}
**Prep needed:** ${briefing.prep}
${gapsBlock(adventure)}${questionsBlock(adventure)}
## Scenes
_The opening is part of scene 1 and counted in its time._

${scenes}
${solutionBlock(adventure)}${clockBlock(adventure)}
## NPCs
${npcs}

## Clues
${adventure.clues
  .map(
    (c) =>
      `- **${clueName(c)}**${c.essential ? " (vital)" : ""} — found via: ${c.routes
        .map(
          (r) =>
            `${r.method} in "${adventure.scenes.find((s) => s.id === r.sceneId)?.title ?? "?"}"`,
        )
        .join("; ")}`,
  )
  .join("\n")}

## Endings
${endings}${adventure.epilogueHook ? `\n\n**Epilogue hook:** ${adventure.epilogueHook}` : ""}

## Time Budget
${adventure.scenes.map((s) => `- ${s.title}: ${s.minutes} min (${s.essential ? "essential" : "optional"})`).join("\n")}
- Buffer: ${adventure.timeBudget.bufferMinutes} min
- **Total: ${adventure.durationMinutes} min**

_Times are planning guidance, not a promise about how your table will pace._
`;
}

function sheetSolution(adventure: OneShotAdventure) {
  const { solution } = adventure;
  if (!solution) return "";
  return `\n## Finale\n${solution.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}\n`;
}

function sheetClock(adventure: OneShotAdventure) {
  const { clock } = adventure;
  if (!clock) return "";
  return `\n## ${clock.name}\n${clock.ticks.map((t, i) => `${i + 1}. ${t.effect}`).join("\n")}\n`;
}

/** The one-page GM cheat sheet. */
export function renderGmSheet(adventure: OneShotAdventure): string {
  const vital = adventure.clues.filter((c) => c.essential);
  const optional = adventure.scenes.filter((s) => !s.essential);
  return `# ${adventure.title} — GM Cheat Sheet

**Truth:** ${adventure.briefing.secret}${adventure.briefing.trigger ? `\n**Why now:** ${adventure.briefing.trigger}` : ""}
**Stakes:** ${adventure.briefing.stakes}
**Session:** ${hours(adventure.durationMinutes)}, ${adventure.timeBudget.bufferMinutes} min buffer

## Timeline
${adventure.scenes.map((s, i) => `${i + 1}. ${s.title} — ${s.minutes} min${s.essential ? "" : " (optional)"} → ${sceneTitles(adventure, s.next)}`).join("\n")}

## Key NPCs
${adventure.npcs.map((n) => `- **${n.name}** (${n.role}): ${n.motivation}`).join("\n")}

## Vital clues
${vital.map((c) => `- ${clueName(c)} — ${c.routes.map((r) => adventure.scenes.find((s) => s.id === r.sceneId)?.title).join(" / ")}`).join("\n")}

${sheetSolution(adventure)}${sheetClock(adventure)}
## Endings
${adventure.endings.map((e) => `- **${e.title}:** ${e.condition}`).join("\n")}

## Running late
${bullets(adventure.timeBudget.runningLate)}
${optional.length ? `\n**Safe to cut:** ${optional.map((s) => `${s.title} (${s.minutes} min)`).join(", ")}` : ""}
`;
}
