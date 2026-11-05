import { assembleOutput } from "./mystery-staged-output";
import { checkFoundation, checkCast } from "./mystery-foundation-checks";
import { checkClues } from "./mystery-clue-checks";
import { checkPressure, checkAudit } from "./mystery-pressure-checks";
import { uniqueIds } from "./mystery-stage-validation";
import { mysteryTypeGuidance } from "./mystery-type-guidance";
export {
  allowedThirdRevelationKinds,
  expectedThirdRevelationKind,
  mysteryTypeGuidance,
} from "./mystery-type-guidance";
/** Fixed-truth mystery stages. Each accepted JSON artifact is locked for later stages. */
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { ResolvedMysteryOptions } from "./public-mystery";
import {
  readJsonObject,
  runCheckedStage,
  throwIfAborted,
  type DraftCheck,
  type JsonObject,
} from "./staged-runtime";
import { formatConceptBlock, rollMysteryConcept } from "./concept-dimensions";
import { type ConceptSeed, formatSeedBlock } from "./concept-seed";
import { list, record, text } from "./mystery-obj";
import { normalizeMysteryStage } from "./mystery-staged-normalize";
import { BANNED_NAMES } from "./naming-policy";
import { type Rng, defaultRng } from "./random-utils";
import { StagedProgress, type StagedProgressStep } from "./staged-progress";

export interface MysteryStagedStats {
  outcome: "staged" | "fallback";
  stoppedAt?: string;
  aiCalls: number;
  repairedStages: string[];
}

export interface MysteryStagedDependencies {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  onProgress?: (steps: StagedProgressStep[]) => void;
  onStats?: (stats: MysteryStagedStats) => void;
  contextPrefix?: string;
  /**
   * The case seed chosen before this run (see `concept-seed.ts`). Absent or
   * `null` means the rolled dimensions alone shape the case.
   */
  seed?: ConceptSeed | null;
  /** Source for the rolled concept; injected in tests. */
  rng?: Rng;
}

/**
 * The final pass only reports. Every structural check has already passed by
 * here, so remaining wording-level doubts must not discard a playable case.
 */
const checkFinalAudit = checkAudit;
type Obj = JsonObject;

/** Returns null on an unusable stage so the caller can use its labelled local fallback. */
export async function generateMysteryStaged(
  resolved: ResolvedMysteryOptions,
  deps: MysteryStagedDependencies,
): Promise<{
  output: PublicGeneratorOutput;
  stats: MysteryStagedStats;
} | null> {
  const steps = [
    { id: "mystery-foundation", label: "Case foundation and fixed truth" },
    { id: "mystery-cast", label: "Suspects and locations" },
    { id: "mystery-clues", label: "Clues and independent leads" },
    { id: "mystery-pressure", label: "Pressure and possible outcomes" },
    { id: "mystery-audit", label: "Consistency and spoiler audit" },
    { id: "mystery-repair", label: "Repair flagged case details" },
    { id: "mystery-final-audit", label: "Final consistency check" },
  ] as const;
  const progress = new StagedProgress(steps, deps.onProgress);
  const concept = deps.seed
    ? formatSeedBlock(deps.seed)
    : formatConceptBlock(
        rollMysteryConcept(
          resolved.genre,
          resolved.tone,
          resolved.mysteryType,
          deps.rng ?? defaultRng,
        ),
      );
  const context = [deps.contextPrefix, concept].filter(Boolean).join("\n\n");
  const stats: MysteryStagedStats = {
    outcome: "staged",
    aiCalls: 0,
    repairedStages: [],
  };
  const system =
    "You design fair, playable, system-neutral mysteries for tabletop role-playing games. Return valid JSON only. The case uses Fixed Truth; never change accepted facts or expose GM-only truth in player-facing descriptions." +
    ` Never give any person or the case a name, first name or surname from this banned list (these are overused defaults; invent fresh, genre-fitting names instead): ${[...BANNED_NAMES, ...resolved.avoidNames].join(", ")}.`;
  const run = async (
    id: (typeof steps)[number]["id"],
    message: string,
    check: (data: Obj) => DraftCheck,
    normalize?: (data: Obj) => Obj,
  ) => {
    const complete = normalize
      ? async (systemInstruction: string, userMessage: string) => {
          const reply = await deps.complete(systemInstruction, userMessage);
          const parsed = readJsonObject(reply);
          return parsed ? JSON.stringify(normalize(parsed)) : reply;
        }
      : deps.complete;
    return runCheckedStage(
      complete,
      { progress, stats: stats as never },
      { id, system, message, check },
      deps.signal,
    );
  };
  const guidance = mysteryTypeGuidance(resolved.mysteryType);
  const foundation = await run(
    "mystery-foundation",
    `STAGE 1 OF 7: Case foundation. ${context}\nOptions: ${JSON.stringify(resolved)}\nEstablish a fixed mystery, title, player-safe summary, central question, opening hook, perpetratorId exactly "person-1", truth (perpetratorName, motive, means, opportunity, constraints, ${guidance.keyItemDesc} methodReason: why the method needed what it used, e.g. why a forged pass rather than walking in, and it must agree with the opportunity; it also fixes the physical or magical rules the method relies on, which every later stage must reuse unchanged (if a forged badge opens a door, nothing may later say the badge was never accepted), and mundane steps must be physically plausible (a rubbing of a lock does not copy its key); atStart: where the central subject/evidence, the culprit and anyone taken are at the moment play begins, consistent with the last timeline event; disputedFact: the exact fact the case turns on; victimStatus: if anyone was taken, hurt or lured away, how they are held or incapacitated and how the party can free them, otherwise an empty string; and where a magical object has a function, keep it consistent with the motive, so do not make the object preserve what the culprit means to erase without saying which effect is which), an ordered timeline of at least three events, and at least three revelations with stable ids, a fact stating the actual conclusion and a kind (${guidance.revelationDesc}). Keep the truth private. Do not create suspects, clues, or outcomes yet.\nReturn JSON of exactly this shape (string values are plain strings): {"title":"","summary":"player-safe summary","centralQuestion":"","openingHook":"","perpetratorId":"person-1","truth":{"perpetratorName":"","motive":"","means":"","opportunity":"","constraints":"one string","keyItem":"","keyItemLocation":"","keyItemFate":"","recovery":"","methodReason":"","disputedFact":"","victimStatus":"","atStart":""},"timeline":["one event string each"],"revelations":[{"id":"rev-1","kind":"culprit","fact":""},{"id":"rev-2","kind":"motive","fact":""},{"id":"rev-3","kind":"${guidance.revelationKind}","fact":""}]}.`,
    (data) => checkFoundation(data, resolved),
    normalizeMysteryStage.foundation,
  );
  if (!foundation) return stopped(stats, "foundation");
  const cast = await run(
    "mystery-cast",
    `STAGE 2 OF 7: Suspects and locations. Treat this accepted foundation as locked; do not change its facts, names, IDs, or timeline.\nFOUNDATION: ${JSON.stringify(foundation.data)}\nReturn exactly ${resolved.suspectCount} suspects in "suspects" (people only; never put places there) and the places in "locations". Return exactly ${resolved.suspectCount} suspects with ids person-1 through person-${resolved.suspectCount}; person-1's name must be exactly the locked perpetratorName ${text(record(foundation.data.truth).perpetratorName)}. Each suspect has name, role, publicFace, startLocationId (the id of the one location they are at when play begins; it must not contradict their alibi, and anyone held captive stays where they are held), motive, secret, alibi, knows, believes, approach. Distinguish actual knowledge from belief, lie or omission; no unexplained knowledge or impossible alibis. Return at least three locations with unique stable ids, name, activity and evidence. One location must be where the key item or central subject is now (the foundation's keyItemLocation); return its id as keyItemLocationId. Do not write clues or change the truth.\nReturn JSON of exactly this shape: {"keyItemLocationId":"place-1","suspects":[{"id":"person-1","name":"","role":"","publicFace":"","startLocationId":"place-1","motive":"","secret":"","alibi":"","knows":"","believes":"","approach":""}],"locations":[{"id":"place-1","name":"","activity":"","evidence":""}]}. All values are plain strings.`,
    (data) => checkCast(data, foundation.data, resolved),
    (data) =>
      normalizeMysteryStage.cast(
        data,
        text(record(foundation.data.truth).perpetratorName),
      ),
  );
  if (!cast) return stopped(stats, "cast");
  const clues = await run(
    "mystery-clues",
    `STAGE 3 OF 7: Clue and lead network. FOUNDATION (locked): ${JSON.stringify(foundation.data)}\nCAST AND LOCATIONS (locked): ${JSON.stringify(cast.data)}\nReturn at least six concrete clues, each with id, observation, sourceId, supports (known revelation ids), doesNotProve and leadsTo (known person/place/clue ids). Return independentPaths with at least two paths to EACH revelation; each path must use existing clue ids, connect consecutive clues through leadsTo, contain a clue that supports the revelation, and begin at a distinct clue source. Every revelation must be supported by clues from at least two different sources; the simplest valid independent path is a single clue that supports the revelation, with two such paths from different sources. Include at least two useful investigation routes. The two paths for a revelation must share no clue and begin at different sources. At least one clue must lead to the key item or focal location (keyItemLocationId in the cast) ${guidance.clueGuidance}; that clue's observation must state the specific sign, record or witness account that points the party there (for example who was seen at that place, or what was carried to it), never just a missing item, and the clues must let players deduce the culprit, the motive and where the item or proof is, without a GM declaration. Each route must by itself give enough information to establish its revelation (a clue that only shows something was prepared does not prove a motive), and a revelation must not hinge on one person agreeing to talk: give a route the party can find without that person's help. Keep every person where the cast places them (startLocationId) and refer only to ids that exist. Red herrings are true observations with testable alternative readings, never fabricated evidence.\nReturn JSON of exactly this shape: {"clues":[{"id":"clue-1","observation":"","sourceId":"person-or-place id","supports":["revelation id"],"doesNotProve":"","leadsTo":["person, place or clue id"]}],"independentPaths":[{"revelationId":"","clueIds":["clue-1","clue-2"],"reasoning":"how these clues together establish the conclusion"}]}. A route must collectively contain enough evidence for its conclusion: a single-clue route is valid only when that clue alone establishes it, and a route to the culprit must point to that specific person, not merely show tampering. Write each path's reasoning.`,
    (data) => checkClues(data, foundation.data, cast.data),
    (data) =>
      normalizeMysteryStage.clues(
        data,
        uniqueIds(list(foundation.data.revelations)),
      ),
  );
  if (!clues) return stopped(stats, "clues");
  const pressure = await run(
    "mystery-pressure",
    `STAGE 4 OF 7: Pressure and outcomes. FOUNDATION, CAST and CLUE NETWORK are locked; preserve every name, event, ID and connection.\nFOUNDATION: ${JSON.stringify(foundation.data)}\nCAST: ${JSON.stringify(cast.data)}\nCLUES: ${JSON.stringify(clues.data)}\nReturn an escalation description, a pressureClock with at least three trigger/consequence steps that form a real clock: time-ordered beats that advance whether or not the party acts, all strictly after the moment play begins (the foundation's atStart) and never restating an event already in the timeline (each trigger names a moment or deadline, each consequence makes the situation worse than the step before; never restate a conditional reaction there, those belong in npcResponses), npcResponses keyed to known person ids, and outcomes keyed correct, partial, mistaken, failed and unsolved. Every outcome has condition and consequence; unsolved also has a continuation hook and means the theft or crime stays unresolved because the trail went cold; if the historical truth itself is lost, say so in the consequence, and keep any later discovery in the continuation hook rather than contradicting the lost evidence. A plausible wrong conclusion must be testable before irreversible action, and that test must itself be safe: never offer experimentation as a safe option when a wrong attempt is catastrophic; provide a safe way to check first. Describe a solvable situation, not a walkthrough: return an objective (what must be achieved, and by when), and at least three different approaches the party could take (for example intercept, confront, infiltrate, negotiate or interrupt). State hard constraints and what happens to people present, but never prescribe one mandatory sequence of player actions, and never make a step the objective requires (such as opening a container) count as failure. Outcomes describe what results from success or failure, whichever approach is used. Describe a procedure fully once in the truth or the evidence and refer to it by name elsewhere instead of repeating its steps.\nReturn JSON of exactly this shape: {"escalation":"","pressureClock":[{"trigger":"","consequence":""}],"npcResponses":[{"personId":"person-1","trigger":"","response":""}],"outcomes":{"correct":{"condition":"","consequence":""},"partial":{"condition":"","consequence":""},"mistaken":{"condition":"","consequence":""},"failed":{"condition":"","consequence":""},"unsolved":{"condition":"","consequence":"","continuation":""}},"objective":"","approaches":["", "", ""]}. All values are plain strings.`,
    (data) => checkPressure(data, cast.data, foundation.data, clues.data),
    normalizeMysteryStage.pressure,
  );
  if (!pressure) return stopped(stats, "pressure");
  const audit = await run(
    "mystery-audit",
    `STAGE 5 OF 7: Audit this locked complete case. Do not rewrite or contradict any accepted content.\nFOUNDATION: ${JSON.stringify(foundation.data)}\nCAST: ${JSON.stringify(cast.data)}\nCLUES: ${JSON.stringify(clues.data)}\nPRESSURE AND OUTCOMES: ${JSON.stringify(pressure.data)}\nCheck these invariants and report any that fail: (A) causal consistency: can every significant action happen using the established rules, at the established time and place, and does the pressure clock start after the moment play begins without repeating the timeline; (B) evidence sufficiency: does each claimed route collectively contain enough evidence for its conclusion (a clue that only shows tampering does not identify the culprit; a clue about a group does not establish one person's motive), and is no revelation dependent on one person agreeing to talk; (C) solution flexibility: are the objective and world constraints kept separate from optional methods, with several workable approaches and no single mandatory sequence or self-contradicting failure condition. Also check that the world behaves consistently: items, magical effects, motives, NPC knowledge, timing and consequences agree across stages. Specifically: (1) the method is mechanically possible and its access, timing and tools agree with methodReason and the opportunity; (2) the key item or focal subject has a known location, custody and fate; (3) every revelation has independent evidence that can actually be followed; (4) the culprit can be identified through evidence, not a GM declaration; (5) the true motive can be established; (6) every outcome is reachable with the evidence and actions that exist. Also check cross-stage contradictions, impossible chronology or knowledge, invalid links, false red herrings, missing consequences, and leakage of truth into player-facing fields. Return {"status":"consistent","issues":[]} only if there are no material defects. Otherwise return {"status":"needs-repair","issues":["specific field-level defect", ...]}.`,
    checkAudit,
    normalizeMysteryStage.audit,
  );
  if (!audit) return stopped(stats, "audit");
  let finalCast = cast.data;
  let finalClues = clues.data;
  let finalPressure = pressure.data;
  if (text(audit.data.status) === "needs-repair") {
    const repair = await run(
      "mystery-repair",
      `STAGE 6 OF 7: Make only the targeted repairs listed in the audit. Keep the foundation and all IDs fixed. You may correct suspect knowledge/alibis, clues, and pressure details where the listed defects require it; do not change unrelated details.\nAUDIT ISSUES: ${JSON.stringify(audit.data.issues)}\nFOUNDATION: ${JSON.stringify(foundation.data)}\nCURRENT CAST: ${JSON.stringify(cast.data)}\nCURRENT CLUES: ${JSON.stringify(clues.data)}\nCURRENT PRESSURE: ${JSON.stringify(pressure.data)}\nReturn complete replacement objects {"cast":{...},"clues":{...},"pressure":{...}}. Correct every listed issue; leave unrelated fields unchanged.`,
      (data) => {
        const nextCast = record(data.cast);
        const nextClues = record(data.clues);
        const nextPressure = record(data.pressure);
        const castCheck = checkCast(nextCast, foundation.data, resolved);
        const clueCheck = checkClues(nextClues, foundation.data, nextCast);
        const pressureCheck = checkPressure(
          nextPressure,
          nextCast,
          foundation.data,
          nextClues,
        );
        return {
          hard: [
            ...castCheck.hard.map((issue) => `cast: ${issue}`),
            ...clueCheck.hard.map((issue) => `clues: ${issue}`),
            ...pressureCheck.hard.map((issue) => `pressure: ${issue}`),
          ],
          soft: [],
        };
      },
      (data) =>
        normalizeMysteryStage.repair(data, {
          culpritName: text(record(foundation.data.truth).perpetratorName),
          revelationIds: uniqueIds(list(foundation.data.revelations)),
          previous: {
            cast: cast.data,
            clues: clues.data,
            pressure: pressure.data,
          },
        }),
    );
    // An unusable repair keeps the case as it was: it already passed every check.
    if (repair) {
      finalCast = record(repair.data.cast);
      finalClues = record(repair.data.clues);
      finalPressure = record(repair.data.pressure);
    }
  } else {
    progress.set("mystery-repair", "skipped", "no repair needed");
  }
  const finalAudit = await run(
    "mystery-final-audit",
    `STAGE 7 OF 7: Verify the final locked case. If targeted repairs were requested, confirm they solve every listed issue and preserve all three checks: causal consistency (every action works under the established rules, time and place, and the pressure clock starts after play begins); evidence sufficiency (each route collectively proves its conclusion without any one person's cooperation); and solution flexibility (the objective and constraints are separate from several optional approaches, with no mandatory sequence and no step the objective needs counted as failure). Also recheck item effects versus motive, NPC knowledge and timing after repairs. Confirm player-facing fields still contain no GM-only truth.\nORIGINAL AUDIT ISSUES: ${JSON.stringify(audit.data.issues)}\nFOUNDATION: ${JSON.stringify(foundation.data)}\nCAST: ${JSON.stringify(finalCast)}\nCLUES: ${JSON.stringify(finalClues)}\nPRESSURE AND OUTCOMES: ${JSON.stringify(finalPressure)}\nReturn {"status":"consistent","issues":[]} only when all checks pass; otherwise return {"status":"needs-repair","issues":["specific unresolved issue", ...]}.`,
    checkFinalAudit,
    normalizeMysteryStage.audit,
  );
  if (!finalAudit) return stopped(stats, "final-audit");
  throwIfAborted(deps.signal);
  const output = assembleOutput(
    foundation.data,
    finalCast,
    finalClues,
    finalPressure,
  );
  deps.onStats?.(stats);
  return { output, stats };

  function stopped(state: MysteryStagedStats, stage: string): null {
    state.outcome = "fallback";
    state.stoppedAt = stage;
    deps.onStats?.(state);
    return null;
  }
}
