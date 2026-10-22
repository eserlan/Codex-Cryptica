/** Framework-free contracts and local fallback for the mystery generator. */
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import {
  avoidNamesExcludingContext,
  formatCampaignContextBlock,
} from "./campaign-context";
import { bannedNamesIn } from "./naming-policy";
import { factionConfig } from "./public-faction-constants";

export const mysteryConfig = {
  genres: factionConfig.themes,
  tones: ["Grounded", "Eerie", "Tense", "Pulpy", "Bleak", "Hopeful"],
  types: [
    "Disappearance",
    "Murder",
    "Theft",
    "Conspiracy",
    "Strange phenomenon",
    "Other",
  ],
  scopes: ["One-shot case", "Multi-session investigation"],
  complexities: [
    "Lean (3 suspects)",
    "Standard (4 suspects)",
    "Dense (5 suspects)",
  ],
  clueDensities: ["Focused", "Balanced", "Generous"],
  pressures: ["Low", "Moderate", "High"],
} as const;

export interface MysteryGeneratorOptions {
  genre?: string;
  tone?: string;
  mysteryType?: string;
  scope?: string;
  complexity?: string;
  clueDensity?: string;
  pressure?: string;
  campaignContext?: string;
  avoidNames?: string[];
}

export interface ResolvedMysteryOptions {
  genre: string;
  tone: string;
  mysteryType: string;
  scope: string;
  complexity: string;
  clueDensity: string;
  pressure: string;
  suspectCount: number;
  campaignContext: string;
  avoidNames: string[];
}

export function resolveMystery(
  options: MysteryGeneratorOptions = {},
): ResolvedMysteryOptions {
  const complexity = options.complexity ?? mysteryConfig.complexities[1];
  return {
    genre: options.genre ?? mysteryConfig.genres[0],
    tone: options.tone ?? mysteryConfig.tones[1],
    mysteryType: options.mysteryType ?? mysteryConfig.types[0],
    scope: options.scope ?? mysteryConfig.scopes[0],
    complexity,
    clueDensity: options.clueDensity ?? mysteryConfig.clueDensities[1],
    pressure: options.pressure ?? mysteryConfig.pressures[1],
    suspectCount: complexity.startsWith("Lean")
      ? 3
      : complexity.startsWith("Dense")
        ? 5
        : 4,
    campaignContext: options.campaignContext ?? "",
    avoidNames: options.avoidNames ?? [],
  };
}

export function buildMysteryPrompt(
  options: MysteryGeneratorOptions = {},
  sessionContext = "",
): {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedMysteryOptions;
} {
  const resolved = resolveMystery(options);
  const avoid = avoidNamesExcludingContext(
    resolved.avoidNames,
    resolved.campaignContext,
  );
  const context = [resolved.campaignContext, sessionContext]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n\n");
  const userMessage = `Create a playable, system-neutral mystery investigation as JSON. This MVP uses Fixed Truth: establish one canonical GM-only solution and keep it stable throughout the case. It is not an emergent-solution case.

Options: ${JSON.stringify({ genre: resolved.genre, tone: resolved.tone, mysteryType: resolved.mysteryType, scope: resolved.scope, complexity: resolved.complexity, clueDensity: resolved.clueDensity, pressure: resolved.pressure })}
${formatCampaignContextBlock(context)}
${avoid.length ? `Already used names — do not reuse: ${avoid.join(", ")}` : ""}
${NAME_BAN_PROMPT}

Return a JSON object with title, summary, centralQuestion, openingHook, truth (perpetratorName, motive, means, opportunity, constraints), timeline (ordered events), suspects (exactly ${resolved.suspectCount}, each with id, name, role, motive, secret, alibi, knows, believes, and approach), locations (at least 3, each with id, name, activity, evidence), revelations (at least 3, each with id and fact), clues (at least 6, each with id, observation, sourceId, supports revelation ids, doesNotProve, and leadsTo ids), independentPaths (at least 2 distinct source routes to every essential revelation), pressureClock (at least 3 steps with triggers and consequences), and outcomes (correct, partial, mistaken, failed, and unsolved).

All IDs must be stable and cross-references valid. Every essential revelation needs two independent paths from distinct evidence sources. Clues state what is observed, what they support, what they do not prove, and where to investigate next. Red herrings must be true observations with testable alternative explanations. The unsolved outcome is allowed only when evidence was legitimately lost or made irrecoverable; provide consequences and a continuation hook. Keep all solution details in a separate GM-only section. Never put the perpetrator, solution, or hidden facts in player-facing text. Check names, chronology, knowledge, alibis, source IDs, revelation coverage, and player/GM spoiler separation before returning. Return only JSON.`;
  return {
    systemInstruction:
      "You are an experienced mystery designer for tabletop role-playing games. Create fair, playable investigations with a stable truth, multiple evidence routes, and explicit player/GM information boundaries. Return valid JSON only.",
    userMessage,
    resolved,
  };
}

function string(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

/** Remove remote image requests from untrusted generated Markdown before saving. */
export function stripMysteryMarkdownImages(text: string): string {
  return text
    .replace(/!\[([^\]]*)\](?:\([^)]*\)|\[[^\]]*\])?/g, "$1")
    .replace(/<img\b[^>]*>/gi, "");
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function parseMysteryResponse(
  text: string,
): PublicGeneratorOutput | null {
  let data: unknown;
  try {
    data = parseFencedJson<unknown>(text);
  } catch {
    return null;
  }
  const root = object(data);
  const title = string(root.title);
  const summary = string(root.summary);
  const playerContent = string(root.playerContent, string(root.content));
  const gmTruth = string(root.gmTruth, string(root.lore));
  if (!title || !summary || !playerContent || !gmTruth) return null;
  return {
    type: "note",
    title,
    summary,
    content: stripMysteryMarkdownImages(playerContent),
    lore: stripMysteryMarkdownImages(gmTruth),
    labels: ["mystery", "investigation", "mystery-generator"],
    status: "draft",
  };
}

export function generateMysteryLocal(
  options: MysteryGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveMystery(options);
  const usedNames = new Set<string>();
  const name = (index: number) => {
    for (let attempt = 0; attempt < 32; attempt++) {
      const candidate = generatePlaceholderName(rng);
      if (
        !usedNames.has(candidate.toLocaleLowerCase()) &&
        bannedNamesIn([candidate], resolved.avoidNames).length === 0
      ) {
        usedNames.add(candidate.toLocaleLowerCase());
        return candidate;
      }
    }
    let fallbackIndex = index + 1;
    for (let attempt = 0; attempt < 32; attempt++) {
      const fallback = `Case Witness ${fallbackIndex++}`;
      if (
        !usedNames.has(fallback.toLocaleLowerCase()) &&
        bannedNamesIn([fallback], resolved.avoidNames).length === 0
      ) {
        usedNames.add(fallback.toLocaleLowerCase());
        return fallback;
      }
    }
    throw new Error(
      "Could not generate a mystery name that avoids existing names.",
    );
  };
  const culprit = name(0);
  const suspects = Array.from(
    { length: resolved.suspectCount },
    (_, index) => ({
      id: `person-${index + 1}`,
      name: index === 0 ? culprit : name(index),
      role: [
        "records keeper",
        "healer",
        "courier",
        "watch officer",
        "archivist",
      ][index % 5],
      motive:
        index === 0
          ? "Conceal a damaging truth before it becomes public."
          : "Protect a personal interest that creates a plausible alternative lead.",
      alibi:
        index === 0
          ? "A witness can confirm part of the account, but not the critical interval."
          : "Their account is partly corroborated and can be tested against the timeline.",
    }),
  );
  const locations = [
    "The public hall",
    "The private archive",
    "The riverside storehouse",
  ];
  const clueLines = [
    "A fresh scrape on the archive latch supports recent access, but does not identify who opened it; compare the tool marks and access log.",
    "A witness recalls the bell sounding early, supporting a shifted timeline, but not proving who caused it; check the clock mechanism and other witnesses.",
    "A delivery seal was replaced with the wrong wax, supporting interference with the evidence chain, but not proving the contents changed; find the matching seal at the storehouse.",
    "A ledger entry was copied in a different ink, supporting a later alteration, but not proving who made it; compare the ink with the archive supplies.",
    "The courier route was changed that evening, supporting an opportunity window, but not proving a meeting occurred; ask who authorised the change.",
    "A damp footprint ends at a dry threshold, supporting a staged trail, but not proving who staged it; compare the tread with the storehouse floor.",
  ];
  const playerContent = `## Opening Hook\n${resolved.mysteryType} at ${pickFrom(locations, rng)} has left a question the authorities cannot answer. The party is asked to establish what happened before the next public deadline.\n\n## Central Question\nWhat happened, and which account survives the evidence?\n\n## People to Question\n${suspects.map((person) => `- **${person.name} — ${person.role}:** ${person.motive} Their account can be tested: ${person.alibi}`).join("\n")}\n\n## Places to Investigate\n${locations.map((location) => `- **${location}:** Search for activity records, overlooked traces, and people whose accounts can be checked.`).join("\n")}\n\n## Evidence\n${clueLines.map((clue, index) => `- **Lead ${index + 1}:** ${clue}`).join("\n")}\n\n## Pressure and Outcomes\nEach delay changes who controls the evidence and who is willing to speak. The case can end with a supported accusation, a partial account, a mistaken conclusion the party can test, or a legitimately unsolved mystery with lasting consequences.`;
  const lore = `## GM-Only Fixed Truth\n${culprit} is responsible. Their motive is to conceal an earlier act that would expose their role in the ${resolved.mysteryType.toLowerCase()}. They used routine access and a manipulated timeline; the physical traces above are genuine and independently testable.\n\n## Timeline\n1. The evidence was moved before the public account was given.\n2. The culprit created a plausible access window.\n3. The party discovers conflicting but testable accounts.\n\n## Running the Case\nKeep the truth fixed. Do not make a clue false to force suspense. If the party loses a critical lead, use the unsolved outcome and its consequences rather than adding an unearned rescue.`;
  return {
    type: "note",
    title: `${pickFrom(["The Missing Ledger", "A Bell Out of Time", "The Sealed Room", "Ashes in the Archive"], rng)}`,
    summary: `${resolved.tone} ${resolved.genre.toLowerCase()} case about a ${resolved.mysteryType.toLowerCase()} with evidence the players can test.`,
    content: playerContent,
    lore,
    labels: ["mystery", "investigation", "mystery-generator"],
    status: "draft",
  };
}
