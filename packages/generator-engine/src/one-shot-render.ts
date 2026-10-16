/**
 * Two views of one adventure. The adventure view is for reading through the
 * scenario: situations, clues, people and the finale's shape. The GM running
 * view is for the table: how to adjudicate each scene, the finale procedure,
 * the clock, open threads and timing. Each fact is stated once, in the view
 * where the GM needs it.
 */

import type {
  OneShotAdventure,
  OneShotClue,
  OneShotNpc,
  OneShotRequirement,
  OneShotScene,
} from "./one-shot-types";
import {
  endingWhen,
  routesOut,
  theoriesBlock,
  whereEveryoneIs,
} from "./one-shot-render-state";
import { checkPlayability } from "./one-shot-playability";
import { antagonistOf } from "./one-shot-integrity";
import { coreMinutes } from "./one-shot-validate";
import { renderResources } from "./one-shot-resources";

function hours(minutes: number): string {
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} hours` : `${minutes} minutes`;
}

function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

const lines = (...parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join("\n");

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

/** Ids like "npc-5" are for the data; the text a GM reads names the person. */
function nameIds(adventure: OneShotAdventure, text: string): string {
  return text.replace(/\bnpc-\d+\b/gi, (id) => {
    return adventure.npcs.find((n) => n.id === id.toLowerCase())?.name ?? id;
  });
}

const clueName = (c: OneShotClue) => c.label ?? c.text;
const sceneTag = (s: OneShotScene) =>
  `${s.minutes} min, ${s.essential ? "essential" : "optional"}`;

// ---------------------------------------------------------------------------
// Adventure view
// ---------------------------------------------------------------------------

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
      ? `**Ways in:** ${opening.involvement.join(" ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
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
  return [
    `### ${n}. ${scene.title} (${sceneTag(scene)})`,
    `_${scene.location} · ${names(adventure, scene.npcIds)}_`,
    scene.situation,
    scene.kind === "opening" ? openingBlock(adventure, scene) : "",
    scene.approaches.length
      ? `**Approaches:** ${scene.approaches.join("; ")}.`
      : "",
    clues.length ? `**Clues**\n${bullets(clues)}` : "",
    `**Challenge (${scene.challenge.type}):** ${scene.challenge.description}`,
    scene.kind === "climax"
      ? ""
      : scene.routes?.length
        ? routesOut(adventure, scene)
        : `**Leads to:** ${sceneTitles(adventure, scene.next)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function npcBlock(npc: OneShotNpc, isAntagonist: boolean) {
  return lines(
    `### ${npc.name} — ${npc.role}${isAntagonist ? " (antagonist)" : ""}`,
    npc.backstory && `- **Why:** ${npc.backstory}`,
    `- **Goal:** ${npc.motivation}`,
    `- **Knows:** ${npc.knows}`,
    `- **Reacts:** ${npc.reaction}`,
    npc.tactics && `- **When opposed:** ${npc.tactics}`,
    npc.stopIf && `- **Would stop if:** ${npc.stopIf}`,
    npc.limits && `- **Cannot:** ${npc.limits}`,
    `- **Roleplay:** ${npc.cues}`,
  );
}

function npcsBlock(adventure: OneShotAdventure) {
  const villain = antagonistOf(adventure);
  const ordered = villain
    ? [villain, ...adventure.npcs.filter((n) => n !== villain)]
    : adventure.npcs;
  return ordered.map((n) => npcBlock(n, n === villain)).join("\n\n");
}

function finaleOverview(adventure: OneShotAdventure) {
  const { solution } = adventure;
  if (!solution) return "";
  return `\n## The Finale
${lines(
  solution.summary,
  solution.requirements.length > 0 &&
    `\n**It turns on:** ${solution.requirements.map((r) => `${r.what} (${sceneTitles(adventure, r.sceneIds)})`).join("; ")}.`,
)}
_The full procedure is in the GM cheat sheet._
`;
}

/** Gaps the review could not close, so the GM knows what to prepare. */
function gapsBlock(adventure: OneShotAdventure) {
  const gaps = checkPlayability(adventure);
  if (!gaps.length) return "";
  return `\n## Before You Run It\nThese parts still need a decision from you:\n${bullets(gaps.map((g) => g.message))}\n`;
}

/** The adventure view: for reading through the scenario. */
export function renderOneShotMarkdown(adventure: OneShotAdventure): string {
  return nameIds(adventure, adventureView(adventure));
}

function adventureView(adventure: OneShotAdventure): string {
  const { briefing } = adventure;
  const scenes = adventure.scenes
    .map((s, i) => sceneBlock(adventure, s, i + 1))
    .join("\n\n");
  const endings = adventure.endings
    .map(
      (e) =>
        `- **${e.title}** — ${e.condition} ${e.consequence}${endingWhen(adventure, e)}`,
    )
    .join("\n");
  const core = coreMinutes(adventure);
  const optional = adventure.scenes.filter((s) => !s.essential);

  return `# ${adventure.title}

_${adventure.genre} · ${adventure.system} · ${hours(adventure.durationMinutes)} · ${adventure.partySize} players${adventure.partyLevel ? ` · ${adventure.partyLevel}` : ""} · ${adventure.emphasis}_

## GM Briefing
${lines(
  `**Premise:** ${briefing.premise}`,
  `**Hook:** ${briefing.hook}`,
  `**Player objective:** ${briefing.objective}`,
  `**Central truth:** ${briefing.secret}`,
  briefing.trigger && `**Why now:** ${briefing.trigger}`,
  `**Stakes:** ${briefing.stakes}`,
  `**Prep needed:** ${briefing.prep}`,
  briefing.environment && `**How this place works:** ${briefing.environment}`,
)}
${gapsBlock(adventure)}
## Scenes
_The opening is part of scene 1 and counted in its time._

${scenes}
${finaleOverview(adventure)}
## NPCs
${npcsBlock(adventure)}

## Endings
${endings}${adventure.epilogueHook ? `\n\n**Epilogue hook:** ${adventure.epilogueHook}` : ""}

## Time Budget
${adventure.scenes.map((s) => `- ${s.title}: ${s.minutes} min (${s.essential ? "essential" : "optional"})`).join("\n")}
- Buffer: ${adventure.timeBudget.bufferMinutes} min
- **Total: ${adventure.durationMinutes} min**${optional.length ? `\n- Essential scenes alone: ${core} min plus buffer` : ""}

_Times are planning guidance, not a promise about how your table will pace._
`;
}

// ---------------------------------------------------------------------------
// GM running view
// ---------------------------------------------------------------------------

function runScene(scene: OneShotScene, n: number) {
  const { challenge } = scene;
  return lines(
    `**${n}. ${scene.title}** (${sceneTag(scene)})`,
    challenge.success && `- Success: ${challenge.success}`,
    challenge.opposition && `- Opposition: ${challenge.opposition}`,
    !!challenge.otherApproaches?.length &&
      `- Other approaches: ${challenge.otherApproaches.join(" ")}`,
    `- If they fail: ${challenge.failForward}`,
    `- Short on time: ${scene.shorten}`,
    !scene.essential && scene.skip && `- Skip: ${scene.skip}`,
  );
}

function sheetAntagonist(adventure: OneShotAdventure) {
  const villain = antagonistOf(adventure);
  if (!villain) return "";
  return `\n## ${villain.name}\n${lines(
    `- Goal: ${villain.motivation}`,
    villain.tactics && `- When opposed: ${villain.tactics}`,
    villain.stopIf && `- Would stop if: ${villain.stopIf}`,
  )}\n`;
}

function sheetSolution(adventure: OneShotAdventure) {
  const { solution } = adventure;
  if (!solution) return "";
  const where = (r: OneShotRequirement) =>
    r.kind === "outcome"
      ? "a result of the finale"
      : `${r.kind === "action" ? "done in" : "found in"} ${sceneTitles(adventure, r.sceneIds)}`;
  const needs = solution.requirements.map(
    (r) => `**${r.what}:** ${r.detail} _(${where(r)})_`,
  );
  return `\n## How the Finale Works
${lines(
  needs.length > 0 && `**Needs**\n${bullets(needs)}`,
  `\n**Steps**\n${solution.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`,
  solution.alternatives.length > 0 &&
    `\n**Other ways through**\n${bullets(solution.alternatives)}`,
  solution.mistakes.length > 0 &&
    `\n**If they get it wrong**\n${bullets(solution.mistakes)}`,
)}
_Players succeed by showing the right intent; they never have to recite exact words._
`;
}

function sheetClock(adventure: OneShotAdventure) {
  const { clock } = adventure;
  if (!clock) return "";
  return `\n## ${clock.name}
${lines(
  `**Advances when:** ${clock.advances}`,
  clock.ticks
    .map(
      (t, i) => `${i + 1}. ${t.trigger ? `_${t.trigger}:_ ` : ""}${t.effect}`,
    )
    .join("\n"),
  clock.deadline && `**Point of no return:** ${clock.deadline}`,
  clock.slow && `**Slowing it:** ${clock.slow}`,
)}
`;
}

function sheetThreads(adventure: OneShotAdventure) {
  const threads = adventure.threads ?? [];
  if (!threads.length) return "";
  return `\n## Threads to Pay Off\n${bullets(threads.map((t) => `${t.setup} → ${t.payoff} _(${sceneTitles(adventure, t.sceneIds)})_`))}\n`;
}

function sheetQuestions(adventure: OneShotAdventure) {
  const questions = adventure.briefing.questions ?? [];
  if (!questions.length) return "";
  return `\n## Questions Players Will Ask\n${bullets(questions.map((q) => `**${q.question}** ${q.answer}`))}\n`;
}

/** The GM running view: everything needed to adjudicate at the table. */
export function renderGmSheet(adventure: OneShotAdventure): string {
  return nameIds(adventure, gmSheetView(adventure));
}

function gmSheetView(adventure: OneShotAdventure): string {
  const vital = adventure.clues.filter((c) => c.essential);
  const optional = adventure.scenes.filter((s) => !s.essential);
  return `# ${adventure.title} — GM Cheat Sheet

${lines(
  `**Truth:** ${adventure.briefing.secret}`,
  adventure.briefing.trigger && `**Why now:** ${adventure.briefing.trigger}`,
  adventure.briefing.environment &&
    `**The place:** ${adventure.briefing.environment}`,
  `**Stakes:** ${adventure.briefing.stakes}`,
  `**Session:** ${hours(adventure.durationMinutes)}, ${adventure.timeBudget.bufferMinutes} min buffer${optional.length ? `; essential scenes alone run ${coreMinutes(adventure)} min` : ""}`,
)}

## Timeline
${adventure.scenes.map((s, i) => `${i + 1}. ${s.title} — ${s.minutes} min${s.essential ? "" : " (optional)"} → ${sceneTitles(adventure, s.next)}`).join("\n")}

${whereEveryoneIs(adventure)}
## Running Each Scene
${adventure.scenes.map((s, i) => runScene(s, i + 1)).join("\n\n")}
${sheetAntagonist(adventure)}
## Vital Clues
${vital.map((c) => `- ${clueName(c)} — ${c.routes.map((r) => adventure.scenes.find((s) => s.id === r.sceneId)?.title).join(" / ")}`).join("\n")}
${theoriesBlock(adventure)}${sheetSolution(adventure)}${renderResources(adventure)}${sheetClock(adventure)}${sheetThreads(adventure)}${sheetQuestions(adventure)}
## Endings
${adventure.endings.map((e) => `- **${e.title}:** ${e.condition}${endingWhen(adventure, e)}`).join("\n")}

## Running Late
${bullets(adventure.timeBudget.runningLate)}
${optional.length ? `\n**Safe to cut:** ${optional.map((s) => `${s.title} (${s.minutes} min)`).join(", ")}` : ""}
`;
}
