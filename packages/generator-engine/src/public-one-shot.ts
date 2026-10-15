/**
 * Public One-Shot Adventure Builder (#4099) — framework-free.
 *
 * Builds a GM-runnable single-session adventure: a structured result with a
 * checked time budget, essential/optional scenes, multi-route clues and at
 * least two endings. The web page builds the prompt here, runs it through the
 * AI client, parses with parseOneShotResponse and falls back to
 * generateOneShotLocal. Single scenes and NPCs can be regenerated without
 * touching the rest.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { parseFencedJson } from "./llm-response-utils";
import { formatCampaignContextBlock } from "./campaign-context";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems,
  generatePlaceholderName,
} from "./random-utils";
import {
  ONE_SHOT_DURATIONS,
  ONE_SHOT_EMPHASES,
  ONE_SHOT_STRUCTURES,
  type OneShotAdventure,
  type OneShotChallenge,
  type OneShotClue,
  type OneShotGeneratorOptions,
  type OneShotNpc,
  type OneShotScene,
  type OneShotSceneKind,
  type ResolvedOneShot,
} from "./one-shot-types";
export type { ResolvedOneShot };
import {
  ONE_SHOT_KITS,
  ONE_SHOT_SEEDS,
  seedKeyForGenre,
  type OneShotSeed,
} from "./one-shot-seeds";
import {
  allocateMinutes,
  bufferFor,
  normaliseTimeBudget,
  validateOneShot,
} from "./one-shot-validate";
import { renderGmSheet, renderOneShotMarkdown } from "./one-shot-render";
import { checkPlayability } from "./one-shot-playability";
import {
  applyOneShotRepair,
  buildOneShotRepairPrompt,
} from "./one-shot-repair";
import {
  mergeNpcReply,
  mergeSceneReply,
  parseOneShotAdventure,
} from "./one-shot-parse";

export const oneShotConfig = {
  genres: [
    "Classic Fantasy",
    "Dark Fantasy",
    "Sci-Fi / Space Opera",
    "Horror",
    "Cyberpunk",
    "Modern Mystery",
    "Western / Frontier",
    "Post-Apocalyptic",
  ],
  systems: [
    "System-neutral",
    "Tales of the Valiant",
    "D&D 5e",
    "Pathfinder 2e",
    "Call of Cthulhu",
  ],
  durations: [...ONE_SHOT_DURATIONS],
  partySizes: [2, 3, 4, 5, 6],
  emphases: [...ONE_SHOT_EMPHASES],
  structures: [...ONE_SHOT_STRUCTURES],
};

export function resolveOneShot(
  options: OneShotGeneratorOptions,
  rng: Rng = defaultRng,
): ResolvedOneShot {
  const requested = Number(options.durationHours);
  // Clamp so the budget always has room for a buffer and 3+ scenes.
  const hours =
    Number.isFinite(requested) && requested > 0
      ? Math.min(8, Math.max(1, requested))
      : 3;
  const system = options.system?.trim() || "System-neutral";
  return {
    genre: options.genre?.trim() || pickFrom(oneShotConfig.genres, rng),
    system,
    durationMinutes: Math.round(hours * 60),
    partySize: Number.isFinite(Number(options.partySize))
      ? Math.min(8, Math.max(1, Math.round(Number(options.partySize) || 4)))
      : 4,
    partyLevel:
      system !== "System-neutral"
        ? options.partyLevel?.trim() || undefined
        : undefined,
    emphasis: options.emphasis?.trim() || pickFrom(oneShotConfig.emphases, rng),
    structure: options.structure?.trim() || "Three-act",
    tone: options.tone?.trim() || undefined,
    premise: options.premise?.trim() || undefined,
    boundaries: options.boundaries?.trim() || undefined,
    campaignContext: options.campaignContext?.trim() || undefined,
  };
}

/** Scene count: five-room is always five, otherwise one more than the hours. */
export function sceneCountFor(structure: string, durationMinutes: number) {
  if (structure === "Five-room adventure") return 5;
  return Math.min(6, Math.max(3, Math.round(durationMinutes / 60) + 1));
}

function essentialFlags(count: number): boolean[] {
  return Array.from({ length: count }, (_, i) => {
    if (i === 0 || i === count - 1) return true;
    if (count <= 3) return true;
    return i === 2;
  });
}

const FIVE_ROOM = [
  "The Threshold",
  "The Obstacle",
  "The Setback",
  "The Reversal",
  "The Showdown",
];

function sceneLabel(
  structure: string,
  index: number,
  count: number,
  place: string,
) {
  if (structure === "Five-room adventure")
    return `Room ${index + 1}: ${FIVE_ROOM[index]}`;
  if (structure === "Node-based investigation") {
    return index === count - 1
      ? "Final node: The Confrontation"
      : `Node ${index + 1}: ${place}`;
  }
  if (structure === "Flexible / open scenario")
    return `Scene ${index + 1}: ${place}`;
  const act = index === 0 ? "I" : index === count - 1 ? "III" : "II";
  return `Act ${act}: ${place}`;
}

function fill(
  text: string,
  ctx: { patron: string; villain: string; item: string; place: string },
) {
  return text
    .replaceAll("{patron}", ctx.patron)
    .replaceAll("{villain}", ctx.villain)
    .replaceAll("{item}", ctx.item)
    .replaceAll("{place}", ctx.place);
}

/** How to adjudicate each kind of challenge when the kit text is generic. */
const ADJUDICATION: Record<
  OneShotChallenge["type"],
  { success: string; other: string[] }
> = {
  combat: {
    success:
      "The party wins when the opposition breaks, flees or is pinned down. Most foes give up when half of them are down or their leader falls.",
    other: [
      "Talking: an offer of safe passage ends the fight if the party has already shown it can win.",
      "Stealth or tricks: getting past without a fight counts as success, but leaves the enemy behind them.",
    ],
  },
  social: {
    success:
      "The party succeeds when it offers something the NPC wants, shows proof they already know, or names the NPC's fear out loud.",
    other: [
      "Lies: they work once; if caught, the NPC shuts down and the lead has to come from elsewhere.",
      "Threats or force: the NPC talks, but tells the antagonist afterwards.",
      "Magic or tech that compels: the NPC answers truthfully, and is terrified of the party from then on.",
    ],
  },
  exploration: {
    success:
      "The party succeeds when it commits to a route and deals with what is on it; careful searching or a clever shortcut both count.",
    other: [
      "Force: smashing through works, but makes noise and costs time.",
      "Magic, tech or a guide: skips the danger, at the price of a favour or a resource.",
    ],
  },
  puzzle: {
    success:
      "The party succeeds when it explains the answer in its own words; it does not need the exact phrasing.",
    other: [
      "Brute force: breaking the mechanism opens the way, but destroys whatever it protected.",
      "Asking for help: an NPC who appears in this scene can give a hint in exchange for a favour.",
    ],
  },
  hazard: {
    success:
      "The party succeeds when everyone is through or out of danger; a good plan means only one person has to risk it.",
    other: [
      "Waiting it out: the hazard passes, but the clock advances.",
      "Magic or gear: protects one person fully, or everyone partly.",
    ],
  },
};

interface FlavourCtx {
  seed: OneShotSeed;
  emphasis: string;
  patron: string;
  villain: string;
  item: string;
}

function sceneFlavour(
  ctx: FlavourCtx,
  kind: OneShotSceneKind,
  index: number,
  place: string,
  rng: Rng,
) {
  const f = (t: string) => fill(t, { ...ctx, place });
  const kit = ONE_SHOT_KITS[ctx.emphasis] ?? ONE_SHOT_KITS.Action;
  const situation =
    kind === "opening"
      ? f(pickFrom(ctx.seed.hooks, rng))
      : kind === "climax"
        ? f(
            `The party reaches {place}, where {villain} is ${pickFrom(ctx.seed.climaxes, rng)}.`,
          )
        : f(pickFrom(ctx.seed.complications, rng));
  const challenge: OneShotChallenge =
    kind === "climax"
      ? {
          type: kit.challenges.climax.type,
          description: f(kit.challenges.climax.text),
          success: f(
            "The party wins by doing the steps in How the Finale Works, or by any other way through listed there.",
          ),
          otherApproaches: ADJUDICATION[kit.challenges.climax.type].other,
          failForward: f(
            "The party does not lose; {villain} gets part of what they want, and the party chooses which loss to accept before the ending.",
          ),
        }
      : (() => {
          const c = pickFrom(kit.challenges.middle, rng);
          return {
            type: c.type,
            description: f(c.text),
            success: ADJUDICATION[c.type].success,
            otherApproaches: ADJUDICATION[c.type].other,
            failForward: f(
              "The party still gets the lead, but it costs them: time, a favour, or {villain} learns they are coming.",
            ),
          };
        })();
  const purpose = kit.purposes[Math.min(index, kit.purposes.length - 1)];
  return {
    situation,
    purpose: kind === "climax" ? "Resolve the central conflict" : purpose,
    approaches: kit.approaches.map(f),
    challenge,
    outcomes: [
      "Clean success: the party gets what it came for and the story moves on.",
      "Partial success: they progress, but a cost or new complication follows.",
      "Failure forward: the lead arrives anyway, in a worse position.",
    ],
  };
}

function npcFlavour(
  role: string,
  kind: "patron" | "villain" | "witness",
  ctx: FlavourCtx,
  rng: Rng,
) {
  const cues = [
    "Speaks quietly and leans in when lying.",
    "Fidgets with something small and loses their train of thought when pressed.",
    "Never answers the first question directly.",
    "Laughs a half-second too late.",
  ];
  const f = (t: string) => fill(t, { ...ctx, place: "the scene" });
  const data = {
    patron: {
      motivation: f(
        "Wants {item} dealt with, quietly, and wants to stay out of it.",
      ),
      knows: f("Knows who benefits, but is not telling all of it."),
      reaction:
        "Pushes to move fast; gets defensive if asked about their own role.",
    },
    villain: {
      motivation: f(
        "Needs {item} to finish what they started, and believes they are in the right.",
      ),
      knows: f(
        "Knows what the party has learned within a scene or two of them learning it.",
      ),
      reaction:
        "Offers a deal first, threats second. Respects a party that is willing to negotiate.",
    },
    witness: {
      motivation: "Wants to stay safe and be believed.",
      knows: f(
        "Saw something that points toward {villain}, though they do not understand what.",
      ),
      reaction:
        "Opens up when treated kindly, or when shown the party already knows.",
    },
  }[kind];
  return { role, ...data, cues: pickFrom(cues, rng) };
}

function uniqueName(used: Set<string>, rng: Rng): string {
  for (let i = 0; i < 20; i++) {
    const name = generatePlaceholderName(rng);
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const fallback = `${generatePlaceholderName(rng)}${used.size}`;
  used.add(fallback);
  return fallback;
}

export function buildOneShotAdventure(
  resolved: ResolvedOneShot,
  rng: Rng = defaultRng,
): OneShotAdventure {
  const seed = ONE_SHOT_SEEDS[seedKeyForGenre(resolved.genre)];
  const count = sceneCountFor(resolved.structure, resolved.durationMinutes);
  const used = new Set<string>();

  const patronName = uniqueName(used, rng);
  const villainName = uniqueName(used, rng);
  const witnessName = uniqueName(used, rng);
  const item = pickFrom(seed.items, rng);
  const ctx: FlavourCtx = {
    seed,
    emphasis: resolved.emphasis,
    patron: patronName,
    villain: villainName,
    item,
  };
  const npcs: OneShotNpc[] = [
    {
      id: "npc-1",
      name: patronName,
      ...npcFlavour(pickFrom(seed.patronRoles, rng), "patron", ctx, rng),
    },
    {
      id: "npc-2",
      name: villainName,
      ...npcFlavour(pickFrom(seed.villainRoles, rng), "villain", ctx, rng),
    },
    {
      id: "npc-3",
      name: witnessName,
      ...npcFlavour(pickFrom(seed.witnessRoles, rng), "witness", ctx, rng),
    },
  ];

  const places = pickRandomItems(seed.places, count, rng);
  const essential = essentialFlags(count);
  const weights = Array.from({ length: count }, (_, i) =>
    i === count - 1 ? 1.5 : i === 0 ? 0.8 : 1,
  );
  const buffer = bufferFor(resolved.durationMinutes);
  const minutes = allocateMinutes(weights, resolved.durationMinutes - buffer);

  const scenes: OneShotScene[] = places.map((place, i) => {
    const kind: OneShotSceneKind =
      i === 0 ? "opening" : i === count - 1 ? "climax" : "middle";
    const flavour = sceneFlavour(ctx, kind, i, place, rng);
    const next: string[] = [];
    if (i + 1 < count) next.push(`scene-${i + 2}`);
    if (i + 2 < count && !essential[i + 1]) next.push(`scene-${i + 3}`);
    return {
      id: `scene-${i + 1}`,
      title: sceneLabel(resolved.structure, i, count, place),
      kind,
      essential: essential[i],
      minutes: minutes[i],
      location: place,
      npcIds:
        kind === "opening"
          ? ["npc-1", "npc-3"]
          : kind === "climax"
            ? ["npc-2", "npc-1"]
            : ["npc-3", "npc-2"],
      clueIds: [],
      next,
      shorten: `Run it as one decisive beat in about ${Math.max(5, Math.ceil(minutes[i] / 2 / 5) * 5)} minutes: one question, one choice, then move on.`,
      ...flavour,
    };
  });

  const kit = ONE_SHOT_KITS[resolved.emphasis] ?? ONE_SHOT_KITS.Action;
  const f = (t: string) => fill(t, { ...ctx, place: scenes[0].location });
  const truth = f(pickFrom(seed.truths, rng));
  const weakness = f(pickFrom(seed.weaknesses, rng));
  const clueTexts = [
    f(`Evidence that ${villainName} is behind it.`),
    `The truth: ${truth}`,
    `A way to stop ${villainName}: ${weakness}.`,
  ];
  const clueLabels = [
    "Who is behind it",
    "What really happened",
    `How to stop ${villainName}`,
  ];
  const nonClimax = scenes.filter((s) => s.kind !== "climax");
  const essentialNonClimax = nonClimax.filter((s) => s.essential);
  const clues: OneShotClue[] = clueTexts.map((text, k) => {
    const a = essentialNonClimax[k % essentialNonClimax.length];
    const b = nonClimax[(nonClimax.indexOf(a) + 1) % nonClimax.length];
    return {
      id: `clue-${k + 1}`,
      label: clueLabels[k],
      text,
      essential: true,
      routes: [
        { sceneId: a.id, method: kit.approaches[k % kit.approaches.length] },
        {
          sceneId: b.id,
          method: kit.approaches[(k + 1) % kit.approaches.length],
        },
      ],
    };
  });
  for (const clue of clues) {
    for (const route of clue.routes) {
      scenes.find((s) => s.id === route.sceneId)!.clueIds.push(clue.id);
    }
  }
  for (const scene of scenes) {
    if (scene.essential) continue;
    const elsewhere = clues
      .filter((c) => scene.clueIds.includes(c.id))
      .map(
        (c) =>
          scenes.find(
            (s) =>
              s.id === c.routes.find((r) => r.sceneId !== scene.id)!.sceneId,
          )?.title,
      );
    scene.skip = `Skip it entirely. Anything the party would have learned here is also found in ${[...new Set(elsewhere)].join(" or ") || "an essential scene"}.`;
  }

  const optional = scenes.filter((s) => !s.essential);
  const runningLate = [
    ...(optional.length
      ? [
          `Skip ${optional.map((s) => s.title).join(" and ")} (saves ${optional.reduce((a, s) => a + s.minutes, 0)} minutes).`,
        ]
      : []),
    "Cut every remaining middle scene to one beat and head for the finale.",
    "Hand the party the clue they are missing, then go straight to the climax.",
    "Resolve the climax with one decisive choice and narrate the ending in five minutes.",
  ];

  const stake = f(pickFrom(seed.stakes, rng));
  const involvement = [
    `Hired directly by ${patronName}.`,
    "Personally connected to the missing item or the person who lost it.",
    "Witnessed the first sign of trouble and cannot leave it alone.",
  ];
  const prep = [
    "Read the briefing and cheat sheet (about 15 minutes) and open the NPC list.",
    resolved.boundaries ? `Table boundaries: ${resolved.boundaries}.` : "",
    resolved.system !== "System-neutral"
      ? `Choose ${resolved.system} stats and DCs yourself; this adventure does not include them.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const climax = scenes[scenes.length - 1];
  const solution = {
    summary: f(
      `${villainName} is stopped at ${climax.location} by putting the three vital clues to use.`,
    ),
    requirements: clues.map((c) => ({
      what: c.label!,
      detail: c.text,
      sceneIds: c.routes.map((r) => r.sceneId),
    })),
    steps: [
      f(`Reach ${climax.location} before the clock runs out.`),
      f(
        `Show ${villainName} the evidence, or show it to whoever they need on their side.`,
      ),
      `Use the weakness: ${weakness}.`,
      f(`Decide what happens to ${item}.`),
    ],
    alternatives: [
      f(
        `Bargain: ${villainName} stands down if they get part of what they want. This leads to A Costly Bargain.`,
      ),
      f(
        `Expose them: bringing ${patronName} or the witness to testify works without the weakness, but takes longer.`,
      ),
    ],
    mistakes: [
      f(
        `Wrong accusation: ${villainName} gets a free move and the clock advances one step.`,
      ),
      "Using the weakness without the evidence: it works, but the party is blamed for what happened.",
    ],
  };
  const clock = {
    name: f(`${villainName}'s Plan`),
    advances:
      "Each time the party fails a challenge, rests, or the GM uses the running-late path.",
    ticks: [
      {
        trigger: "First step",
        effect: f(
          `${villainName} learns the party is involved and sends a warning.`,
        ),
      },
      {
        trigger: "Second step",
        effect: f(
          `${villainName} moves ${item}; the next scene starts with the trail colder.`,
        ),
      },
      {
        trigger: "Third step",
        effect: f(
          `The plan is nearly done; the finale starts with ${villainName} already prepared.`,
        ),
      },
      {
        trigger: "Last step",
        effect:
          "The plan completes. Go to the Too Late ending, or run the finale as a last stand.",
      },
    ],
    slow: f(
      `Turning ${villainName}'s allies, or getting ahead of them in a scene, takes one step back.`,
    ),
  };
  const trigger = f(
    `${villainName} found out where ${item} was kept and moved on it three days ago.`,
  );
  const questions = [
    { question: "Why now?", answer: trigger },
    {
      question: "Why us?",
      answer: f(
        `${patronName} can't be seen acting openly, and the party has no ties to ${villainName}.`,
      ),
    },
    {
      question: f(`Why doesn't ${patronName} deal with it?`),
      answer: f(
        `${patronName} has something to hide about ${item} and would rather strangers did the digging.`,
      ),
    },
  ];

  const premise =
    resolved.premise ??
    f(
      `${patronName} needs ${item} recovered before ${villainName} can use it, and the trail runs through ${scenes[0].location}.`,
    );

  const adventure: OneShotAdventure = {
    version: 1,
    title: `${titleCase(item)}: A ${resolved.genre} One-Shot`,
    genre: resolved.genre,
    system: resolved.system,
    emphasis: resolved.emphasis,
    structure: resolved.structure,
    tone: resolved.tone,
    durationMinutes: resolved.durationMinutes,
    partySize: resolved.partySize,
    partyLevel: resolved.partyLevel,
    briefing: {
      premise,
      hook: f(pickFrom(seed.hooks, rng)),
      objective: f(`Recover ${item} and stop ${villainName}.`),
      secret: truth,
      trigger,
      stakes: stake,
      prep,
      questions,
    },
    opening: {
      situation: scenes[0].situation,
      readAloud: pickFrom(seed.readAloud, rng),
      firstDecision: `Accept ${patronName}'s offer as it stands, or ask for more before taking the job?`,
      involvement,
    },
    scenes,
    npcs,
    clues,
    endings: [
      {
        id: "end-1",
        title: "The Truth Out",
        condition:
          "The party gathers the vital clues and defeats or exposes the antagonist.",
        consequence: f(
          `${item} is recovered, and ${patronName} owes the party.`,
        ),
      },
      {
        id: "end-2",
        title: "A Costly Bargain",
        condition:
          "The party takes a deal with the antagonist or loses the key evidence.",
        consequence: f(
          `${villainName} keeps part of what they wanted, and the party leaves with a debt.`,
        ),
      },
      {
        id: "end-3",
        title: "Too Late",
        condition: "Time runs out before the party reaches the climax.",
        consequence: f(
          `${villainName} finishes the plan, and the next adventure begins with the fallout.`,
        ),
      },
    ],
    solution,
    clock,
    epilogueHook: f(`Someone else has been asking about ${item}.`),
    timeBudget: { bufferMinutes: buffer, runningLate },
  };
  return adventure;
}

function titleCase(text: string) {
  return text
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function oneShotToOutput(
  adventure: OneShotAdventure,
): PublicGeneratorOutput {
  return {
    type: "note",
    kind: "one-shot",
    title: adventure.title,
    summary: adventure.briefing.premise,
    content: renderOneShotMarkdown(adventure),
    lore: renderGmSheet(adventure),
    labels: ["one-shot", "adventure", "one-shot-generator", "imported-draft"],
    status: "active",
    oneShot: adventure,
  };
}

export function generateOneShotLocal(
  options: OneShotGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  return oneShotToOutput(
    buildOneShotAdventure(resolveOneShot(options, rng), rng),
  );
}

// ---------------------------------------------------------------------------
// AI prompt + parse
// ---------------------------------------------------------------------------

export interface OneShotPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedOneShot;
}

export function buildOneShotPrompt(
  options: OneShotGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): OneShotPrompt {
  const resolved = resolveOneShot(options, rng);
  const count = sceneCountFor(resolved.structure, resolved.durationMinutes);
  const buffer = bufferFor(resolved.durationMinutes);
  const userMessage = `Generate a run-ready, single-session RPG one-shot adventure as JSON.
Options:
- Genre: ${resolved.genre}
- System: ${resolved.system}${resolved.system === "System-neutral" ? " (no stat blocks, DCs or rules text)" : " (do NOT invent stat blocks, DCs or rules; leave mechanics to the GM)"}
- Session length: ${resolved.durationMinutes} minutes
- Players: ${resolved.partySize}${resolved.partyLevel ? `, ${resolved.partyLevel}` : ""}
- Emphasis: ${resolved.emphasis}
- Structure: ${resolved.structure}
${resolved.tone ? `- Tone: ${resolved.tone}\n` : ""}${resolved.premise ? `- Starting premise (keep it): ${resolved.premise}\n` : ""}${resolved.boundaries ? `- Content boundaries (never violate): ${resolved.boundaries}\n` : ""}${formatCampaignContextBlock(resolved.campaignContext)}

Rules:
- Exactly ${count} scenes. The first has kind "opening", the last "climax", the rest "middle".
- Scene "minutes" are multiples of 5 and, with a ${buffer}-minute buffer, must add up to ${resolved.durationMinutes}. Give the climax the largest share.
- Mark each scene essential or optional. Only optional scenes get a "skip" instruction (leave it "" on essential scenes); skipping must not lose any vital clue.
- Every vital clue (3 of them) must be discoverable in at least two different scenes, one of them an essential scene BEFORE the climax. Optional scenes add depth or an advantage, never the only early source. Never gate completion behind one check.
- A clue's "label" is a 2–5 word name; its "text" is the actual fact, stated outright.
- Every scene needs a challenge with "success" (what the party must actually do or say, including any answer, name or passage), "otherApproaches" (how force, lies, magic or an unexpected plan play out) and "failForward". Failure must never stop the adventure.
- "solution" is how the finale is resolved: every component with its real content (actual names, words, passages, objects, order) and the earlier scenes where it is found, the steps, at least one other way through, and what each kind of mistake costs.
- "clock" is the threat's countdown: what advances it, 3–6 ticks with what each triggers, and how the party can slow it.
- "briefing.trigger" is the concrete event that set this off now. "briefing.questions" answers 3–5 questions players will obviously ask (why now, why us, why doesn't the patron handle it, why would the antagonist do this).
- At least two endings, each reached by a player decision. NPCs get motivations, what they know, how they react and a roleplay cue — no biographies. An NPC's motivation must explain what they do in the scenes. If an NPC appears in several scenes, that scene's situation says why they are there; NPCs met in the opening return or pay off later.
- "next" lists the scene ids a scene can lead to (branching allowed); scene ids are "scene-1".."scene-${count}", NPC ids "npc-1"..., clue ids "clue-1"...

Return JSON with exactly this shape:
{
  "title": "...",
  "briefing": { "premise": "", "hook": "", "objective": "", "secret": "", "trigger": "", "stakes": "", "prep": "", "questions": [{ "question": "", "answer": "" }] },
  "opening": { "situation": "", "readAloud": "optional", "firstDecision": "", "involvement": ["", ""] },
  "scenes": [{ "id": "scene-1", "title": "", "kind": "opening", "essential": true, "minutes": 30, "purpose": "", "situation": "", "location": "", "npcIds": ["npc-1"], "approaches": [""], "challenge": { "type": "social", "description": "", "success": "", "otherApproaches": [""], "failForward": "" }, "outcomes": [""], "next": ["scene-2"], "shorten": "", "skip": "" }],
  "npcs": [{ "id": "npc-1", "name": "", "role": "", "motivation": "", "knows": "", "reaction": "", "cues": "" }],
  "clues": [{ "id": "clue-1", "label": "", "text": "", "essential": true, "routes": [{ "sceneId": "scene-1", "method": "" }, { "sceneId": "scene-2", "method": "" }] }],
  "endings": [{ "id": "end-1", "title": "", "condition": "", "consequence": "" }],
  "solution": { "summary": "", "requirements": [{ "what": "", "detail": "", "sceneIds": ["scene-2"] }], "steps": [""], "alternatives": [""], "mistakes": [""] },
  "clock": { "name": "", "advances": "", "ticks": [{ "trigger": "", "effect": "" }], "slow": "" },
  "epilogueHook": "",
  "runningLate": ["steps to finish on time, most painless first"]
}
Before returning, run a consistency pass: scene minutes plus buffer equal the session length; every clue route points to a real scene that can plausibly reveal it; every npcId exists; the climax is reachable from every path; and no ending depends on a single roll.
Then walk through running it as the GM, scene by scene. At every decision, check the adventure tells you what you need to adjudicate it; if a fact, answer, solution or motivation would have to be invented at the table, write it in.
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;
  return {
    systemInstruction:
      "You are an experienced game master writing playable, system-neutral one-shot adventures in JSON format.",
    userMessage,
    resolved,
  };
}

/** Parse an AI reply into a checked adventure; throws if it is not playable. */
export function parseOneShotResponse(
  text: string,
  resolved: ResolvedOneShot,
): PublicGeneratorOutput {
  return oneShotToOutput(parseOneShotAdventure(text, resolved));
}

// ---------------------------------------------------------------------------
// Single scene / NPC regeneration
// ---------------------------------------------------------------------------

export type OneShotRegenTarget = { kind: "scene" | "npc"; id: string };

export interface OneShotRegenResult {
  adventure: OneShotAdventure;
  /** Messages for the GM when the change may contradict the rest. */
  warnings: string[];
}

function ctxFor(adventure: OneShotAdventure): FlavourCtx {
  const seed = ONE_SHOT_SEEDS[seedKeyForGenre(adventure.genre)];
  return {
    seed,
    emphasis: adventure.emphasis,
    patron: adventure.npcs[0]?.name ?? "the patron",
    villain: adventure.npcs[1]?.name ?? "the antagonist",
    item:
      adventure.briefing.objective
        .replace(/^Recover\s+/, "")
        .replace(/ and stop.*$/, "") || "the prize",
  };
}

function finishRegen(
  before: OneShotAdventure,
  after: OneShotAdventure,
): OneShotRegenResult {
  const warnings = validateOneShot(after).map((i) => i.message);
  const prior = new Set(validateOneShot(before).map((i) => i.message));
  return { adventure: after, warnings: warnings.filter((w) => !prior.has(w)) };
}

/**
 * Re-roll one scene's content (situation, approaches, challenge, outcomes)
 * or one NPC's motivation and cues. Ids, times, essential flags, links, clue
 * routes, locations and NPC names and roles stay exactly as they were.
 */
export function regenerateOneShotLocal(
  adventure: OneShotAdventure,
  target: OneShotRegenTarget,
  rng: Rng = defaultRng,
): OneShotRegenResult {
  const ctx = ctxFor(adventure);
  if (target.kind === "scene") {
    const index = adventure.scenes.findIndex((s) => s.id === target.id);
    if (index < 0)
      return { adventure, warnings: ["That scene no longer exists."] };
    const scene = adventure.scenes[index];
    const fresh = sceneFlavour(ctx, scene.kind, index, scene.location, rng);
    const next = {
      ...adventure,
      scenes: adventure.scenes.map((s) =>
        s.id === scene.id
          ? {
              ...s,
              situation: fresh.situation,
              approaches: fresh.approaches,
              challenge: fresh.challenge,
              outcomes: fresh.outcomes,
            }
          : s,
      ),
    };
    return finishRegen(
      adventure,
      index === 0
        ? { ...next, opening: { ...next.opening, situation: fresh.situation } }
        : next,
    );
  }
  const npcIndex = adventure.npcs.findIndex((n) => n.id === target.id);
  if (npcIndex < 0)
    return { adventure, warnings: ["That NPC no longer exists."] };
  const kind =
    npcIndex === 0 ? "patron" : npcIndex === 1 ? "villain" : "witness";
  const fresh = npcFlavour(adventure.npcs[npcIndex].role, kind, ctx, rng);
  return finishRegen(adventure, {
    ...adventure,
    npcs: adventure.npcs.map((n) =>
      n.id === target.id
        ? {
            ...n,
            motivation: fresh.motivation,
            knows: fresh.knows,
            reaction: fresh.reaction,
            cues: fresh.cues,
          }
        : n,
    ),
  });
}

export function buildOneShotRegenPrompt(
  adventure: OneShotAdventure,
  target: OneShotRegenTarget,
  instruction = "",
): { systemInstruction: string; userMessage: string } {
  const locked =
    target.kind === "scene"
      ? "Keep the scene's id, title, location, minutes, essential flag, NPCs, clue connections and links unchanged. Every clue listed for this scene must still be discoverable here. Only rewrite situation, approaches, challenge and outcomes. State facts outright: the challenge's success says what the party must actually do or say, and otherApproaches covers force, lies and magic."
      : "Keep the NPC's id, name and role unchanged. Only rewrite motivation, knows, reaction and cues, and stay consistent with the scenes the NPC appears in.";
  const item =
    target.kind === "scene"
      ? adventure.scenes.find((s) => s.id === target.id)
      : adventure.npcs.find((n) => n.id === target.id);
  const shape =
    target.kind === "scene"
      ? `{ "situation": "", "approaches": [""], "challenge": { "type": "social", "description": "", "success": "", "otherApproaches": [""], "failForward": "" }, "outcomes": [""] }`
      : `{ "motivation": "", "knows": "", "reaction": "", "cues": "" }`;
  return {
    systemInstruction:
      "You are an experienced game master revising one part of a one-shot adventure without breaking the rest of it.",
    userMessage: `Rewrite one ${target.kind} of this one-shot, keeping the rest of the adventure and its core truth intact.
Core truth: ${adventure.briefing.secret}
Antagonist: ${adventure.npcs[1]?.name ?? "unknown"}
Current ${target.kind}: ${JSON.stringify(item)}
${locked}
${instruction.trim() ? `GM request (follow it within the rules above): ${instruction.trim().slice(0, 500)}\n` : ""}Return only JSON shaped like: ${shape}`,
  };
}

function applySceneReply(
  adventure: OneShotAdventure,
  id: string,
  data: unknown,
): OneShotRegenResult {
  const scene = adventure.scenes.find((s) => s.id === id);
  if (!scene) return { adventure, warnings: ["That scene no longer exists."] };
  const updated = mergeSceneReply(scene, data);
  const warnings = scene.npcIds
    .map((npcId) => adventure.npcs.find((n) => n.id === npcId))
    .filter((npc) => npc && !JSON.stringify(updated).includes(npc.name))
    .map((npc) => `${npc!.name} is no longer mentioned in "${scene.title}".`);
  const next = {
    ...adventure,
    scenes: adventure.scenes.map((s) => (s.id === id ? updated : s)),
  };
  const result = finishRegen(
    adventure,
    scene.kind === "opening"
      ? { ...next, opening: { ...next.opening, situation: updated.situation } }
      : next,
  );
  return { ...result, warnings: [...warnings, ...result.warnings] };
}

/** Apply an AI reply for one scene or NPC, keeping everything else locked. */
export function applyOneShotRegenResponse(
  adventure: OneShotAdventure,
  target: OneShotRegenTarget,
  text: string,
): OneShotRegenResult {
  const data = parseFencedJson(text);
  if (target.kind === "scene")
    return applySceneReply(adventure, target.id, data);
  if (!adventure.npcs.some((n) => n.id === target.id)) {
    return { adventure, warnings: ["That NPC no longer exists."] };
  }
  return finishRegen(adventure, {
    ...adventure,
    npcs: adventure.npcs.map((n) =>
      n.id === target.id ? mergeNpcReply(n, data) : n,
    ),
  });
}

export {
  renderGmSheet,
  renderOneShotMarkdown,
  validateOneShot,
  normaliseTimeBudget,
  checkPlayability,
  buildOneShotRepairPrompt,
  applyOneShotRepair,
};
