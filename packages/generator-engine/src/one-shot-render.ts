import type { OneShotAdventure, OneShotScene } from "./one-shot-types";

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

function sceneBlock(
  adventure: OneShotAdventure,
  scene: OneShotScene,
  n: number,
) {
  const clues = scene.clueIds
    .map((id) => adventure.clues.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => {
      const route = c.routes.find((r) => r.sceneId === scene.id);
      return `${c.text}${route ? ` _(${route.method})_` : ""}`;
    });
  return `### ${n}. ${scene.title} (${scene.minutes} min, ${scene.essential ? "essential" : "optional"})

**Purpose:** ${scene.purpose}
**Location:** ${scene.location}
**Key NPCs:** ${names(adventure, scene.npcIds)}

${scene.situation}

**Likely approaches**
${bullets(scene.approaches)}

**Clues**
${clues.length ? bullets(clues) : "- None here"}

**Challenge (${scene.challenge.type}):** ${scene.challenge.description}
**If the party fails:** ${scene.challenge.failForward}

**Likely outcomes**
${bullets(scene.outcomes)}

**Leads to:** ${sceneTitles(adventure, scene.next)}
**Running short:** ${scene.shorten}${scene.skip ? `\n**Skip:** ${scene.skip}` : ""}`;
}

/** The whole adventure as Markdown, in play order. */
export function renderOneShotMarkdown(adventure: OneShotAdventure): string {
  const { briefing, opening } = adventure;
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
**Central truth:** ${briefing.secret}
**Stakes:** ${briefing.stakes}
**Prep needed:** ${briefing.prep}

## Opening
${opening.situation}

${opening.readAloud ? `> ${opening.readAloud}\n\n` : ""}**First decision:** ${opening.firstDecision}

**Ways to get involved**
${bullets(opening.involvement)}

## Scenes
${scenes}

## NPCs
${npcs}

## Clues
${adventure.clues
  .map(
    (c) =>
      `- **${c.text}**${c.essential ? " (vital)" : ""} — found via: ${c.routes
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

/** The one-page GM cheat sheet. */
export function renderGmSheet(adventure: OneShotAdventure): string {
  const vital = adventure.clues.filter((c) => c.essential);
  const optional = adventure.scenes.filter((s) => !s.essential);
  return `# ${adventure.title} — GM Cheat Sheet

**Truth:** ${adventure.briefing.secret}
**Stakes:** ${adventure.briefing.stakes}
**Session:** ${hours(adventure.durationMinutes)}, ${adventure.timeBudget.bufferMinutes} min buffer

## Timeline
${adventure.scenes.map((s, i) => `${i + 1}. ${s.title} — ${s.minutes} min${s.essential ? "" : " (optional)"} → ${sceneTitles(adventure, s.next)}`).join("\n")}

## Key NPCs
${adventure.npcs.map((n) => `- **${n.name}** (${n.role}): wants ${n.motivation.toLowerCase()}`).join("\n")}

## Vital clues
${vital.map((c) => `- ${c.text} — ${c.routes.map((r) => adventure.scenes.find((s) => s.id === r.sceneId)?.title).join(" / ")}`).join("\n")}

## Endings
${adventure.endings.map((e) => `- **${e.title}:** ${e.condition}`).join("\n")}

## Running late
${bullets(adventure.timeBudget.runningLate)}
${optional.length ? `\n**Safe to cut:** ${optional.map((s) => `${s.title} (${s.minutes} min)`).join(", ")}` : ""}
`;
}
