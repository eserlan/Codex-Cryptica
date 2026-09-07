/**
 * Constellation Generator — a culturally meaningful night-sky lore tool
 * (issue #2811). Produces one named star pattern plus one culture's
 * interpretation of it: shape, origin myth, seasonal visibility, practical
 * use, cultural/religious meaning, an omen, and an adventure hook. Framework-
 * free, for the marketing/SEO generator surface (no login, no vault context)
 * — mirrors the public-world.ts / public-star-system.ts split already used
 * for every other generator with an in-app, vault-grounded sibling (#1935).
 *
 * `pattern` is deliberately separable from `interpretations` (an array, even
 * though this generator only ever populates one entry) so a later "Night
 * Sky"/reinterpretation generator can hand the same star pattern to a second
 * culture without a breaking schema change.
 *
 * Star positions are not astronomically real (issue is explicit this isn't
 * required) — they exist as a normalized 0-100 sky-plane layout so a later
 * star-chart diagram (mirroring star-system-diagram.ts) has something concrete
 * to draw, without committing to a visualisation in this phase.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { parseFencedJson, sanitizeText } from "./llm-response-utils";
import { defaultRng, pickFrom, type Rng } from "./random-utils";
import { BANNED_NAMES, NAME_BAN_PROMPT } from "./public-npc-constants";
import { factionConfig } from "./public-faction-constants";
import {
  avoidNamesExcludingContext,
  formatCampaignContextBlock,
} from "./campaign-context";

export const constellationConfig = {
  genres: factionConfig.themes,
  visualImpressions: [
    "Beast",
    "Hero or Figure",
    "Weapon",
    "Crown or Regalia",
    "Vessel or Ship",
    "Monster",
    "Tool or Instrument",
    "Serpent or Dragon",
  ],
  practicalUses: [
    "Navigation",
    "Planting and harvest timing",
    "Migration timing",
    "Festival or calendar marker",
    "Tidal or seasonal prediction",
    "Timekeeping",
  ],
  culturalMeanings: [
    "A deity or divine figure",
    "An ancestor or founding hero",
    "A taboo or warning sign",
    "An omen-bearer",
    "A legendary beast",
    "A guardian spirit",
  ],
  names: [
    "The Seven Spears",
    "The Prisoner's Chain",
    "The Drowned Crown",
    "The Ember Plough",
    "The Silent Archer",
    "The Widow's Lantern",
    "The Iron Serpent",
    "The Ashen Hound",
    "The Ferryman's Oar",
    "The Broken Wheel",
  ],
  cultures: [
    "the Kesh Riders",
    "the Salt Wardens",
    "the Vantage Cartographers",
    "the Marrow Clans",
    "the Thessan Migrants",
    "the Deepwake Fisherfolk",
    "the Corvane Highwatch",
    "the Idris Pilgrims",
  ],
} as const;

export interface ConstellationGeneratorOptions {
  genre?: string;
  visualImpression?: string;
  practicalUse?: string;
  culturalMeaning?: string;
  /** Free-text world/campaign background from the form's context field. */
  campaignContext?: string;
  /** Existing titles to avoid when making a local fallback. */
  avoidNames?: string[];
}

export interface ConstellationPrompt {
  systemInstruction: string;
  userMessage: string;
}

export interface ConstellationStar {
  name?: string;
  brightness?: "bright" | "moderate" | "faint";
  /** Normalized sky-plane position, 0-100, for a future star-chart diagram. */
  x: number;
  y: number;
  /** Short folklore note for a prominent/named star, not the whole myth. */
  notes?: string;
}

export interface ConstellationPattern {
  stars: ConstellationStar[];
  /** Index pairs into `stars`, drawn as connecting lines. */
  lines: [number, number][];
}

export interface ConstellationInterpretation {
  culture: string;
  name: string;
  visualImpression: string;
  originMyth: string;
  seasonalVisibility: string;
  practicalUse: string;
  culturalMeaning: string;
  omen: string;
  adventureHook: string;
}

export interface ConstellationData {
  pattern: ConstellationPattern;
  /** Length 1 in the current single-constellation generator. */
  interpretations: ConstellationInterpretation[];
}

function choose(
  value: string | undefined,
  choices: readonly string[],
  rng: Rng,
): string {
  return value?.trim() || pickFrom(choices, rng);
}

function chooseName(avoidNames: readonly string[], rng: Rng): string {
  const forbidden = new Set(
    avoidNames.map((name) => name.trim().toLowerCase()),
  );
  const available = constellationConfig.names.filter(
    (name) => !forbidden.has(name.toLowerCase()),
  );
  return pickFrom(
    available.length ? available : constellationConfig.names,
    rng,
  );
}

function genreLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * Generate 4-9 stars in normalized 0-100 sky-plane space, loosely clustered
 * so the resulting shape reads as a coherent figure rather than scattered
 * noise, connected in sequence into a single stick-figure outline. Not
 * astronomically real by design (see file header).
 */
function generatePattern(rng: Rng): ConstellationPattern {
  const count = 4 + Math.floor(rng() * 6); // 4-9
  const centerX = 25 + rng() * 50;
  const centerY = 25 + rng() * 50;
  const stars: ConstellationStar[] = Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2;
    const radius = 8 + rng() * 22;
    const x = Math.max(2, Math.min(98, centerX + Math.cos(angle) * radius));
    const y = Math.max(2, Math.min(98, centerY + Math.sin(angle) * radius));
    const brightness: ConstellationStar["brightness"] =
      rng() < 0.25 ? "bright" : rng() < 0.6 ? "moderate" : "faint";
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      brightness,
    };
  });
  // At least one bright star is guaranteed a name/note further up (in
  // generateConstellationLocal), so the pattern always has an anchor point.
  const lines: [number, number][] = [];
  for (let i = 0; i < stars.length - 1; i++) {
    lines.push([i, i + 1]);
  }
  return { stars, lines };
}

function originMyth(
  title: string,
  visualImpression: string,
  culture: string,
  rng: Rng,
): string {
  const causes = [
    `a founding figure ${culture} still name in oaths, flung into the sky at the end of their final act`,
    `a punishment handed down for a debt the sky itself would not forgive`,
    `a warning left by the ancestors, fixed in place so it could never be forgotten`,
    `a guardian who chose to stand watch from above rather than leave the living undefended`,
  ];
  return `${culture.charAt(0).toUpperCase()}${culture.slice(1)} tell that ${title} is ${pickFrom(causes, rng)}. Its shape, read as a ${visualImpression.toLowerCase()}, is how the story is remembered even by those who have never heard it told in full.`;
}

function seasonalVisibility(rng: Rng): string {
  return pickFrom(
    [
      "Visible low on the horizon after sunset through the cold months, sinking out of sight by early summer.",
      "Overhead only during the harvest weeks, gone from the sky for the rest of the year.",
      "Visible year-round from the northern latitudes, but only a brief window near the horizon further south.",
      "Rises just before dawn in the last weeks of winter, a signal the thaw is close.",
    ],
    rng,
  );
}

function omen(culture: string, rng: Rng): string {
  return pickFrom(
    [
      `${culture} hold that if it dims before its usual season, a debt long thought settled is about to come due.`,
      `Its brightest star flickering is read as a warning against travel until the next new moon.`,
      `A red haze near it is taken as a sign a hidden grudge is about to surface.`,
      `Its early disappearance from the sky is treated as license to break an old promise without shame.`,
    ],
    rng,
  );
}

/**
 * Renders "## Core Concept" + "## Origin Myth" from the single source of
 * truth (the parsed interpretation), the same way star-system's
 * formatMajorBodies() derives its markdown from "bodies" JSON — used by both
 * the local generator and the AI path, so the displayed text can never drift
 * from what "interpretations[0]" actually says.
 */
function formatConstellationContent(
  title: string,
  interpretation: ConstellationInterpretation,
): string {
  return [
    "## Core Concept",
    `${title} is a constellation ${interpretation.culture} read as a ${interpretation.visualImpression.toLowerCase()}. ${interpretation.practicalUse}`,
    "",
    "## Origin Myth",
    interpretation.originMyth,
  ].join("\n");
}

function adventureHook(title: string, culture: string, rng: Rng): string {
  return pickFrom(
    [
      `A member of ${culture} insists ${title} rose out of season this year, and wants the party to find out why before the rest of the camp panics.`,
      `A rival group has started reading ${title} differently, and the disagreement is turning into an actual dispute over whose calendar governs the season's festival.`,
      `Someone has been altering the shrine markers used to track ${title}'s position, and whoever is doing it clearly wants a specific date to arrive unnoticed.`,
      `A dying elder of ${culture} wants the party to carry the true story of ${title} somewhere it hasn't been told, before a rival telling replaces it.`,
    ],
    rng,
  );
}

/** Generate a complete local draft without network access or vault writes. */
export function generateConstellationLocal(
  options: ConstellationGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const genre = choose(options.genre, constellationConfig.genres, rng);
  const visualImpression = choose(
    options.visualImpression,
    constellationConfig.visualImpressions,
    rng,
  );
  const practicalUse = choose(
    options.practicalUse,
    constellationConfig.practicalUses,
    rng,
  );
  const culturalMeaning = choose(
    options.culturalMeaning,
    constellationConfig.culturalMeanings,
    rng,
  );
  const title = chooseName(options.avoidNames ?? [], rng);
  const culture = pickFrom(constellationConfig.cultures, rng);

  const pattern = generatePattern(rng);
  // Name and annotate the single brightest star as the pattern's anchor.
  const brightestIndex = pattern.stars.findIndex(
    (s) => s.brightness === "bright",
  );
  if (brightestIndex >= 0) {
    pattern.stars[brightestIndex] = {
      ...pattern.stars[brightestIndex],
      name: `${title.split(" ").slice(-1)[0]}'s Eye`,
      notes: `The star ${culture} point to first when teaching the shape to children.`,
    };
  }

  const myth = originMyth(title, visualImpression, culture, rng);
  const visibility = seasonalVisibility(rng);
  const omenText = omen(culture, rng);
  const hook = adventureHook(title, culture, rng);

  const interpretation: ConstellationInterpretation = {
    culture,
    name: title,
    visualImpression,
    originMyth: myth,
    seasonalVisibility: visibility,
    practicalUse: `Used by ${culture} for ${practicalUse.toLowerCase()}.`,
    culturalMeaning: `Regarded by ${culture} as ${culturalMeaning.toLowerCase()}.`,
    omen: omenText,
    adventureHook: hook,
  };

  const content = formatConstellationContent(title, interpretation);

  const lore = [
    "## Seasonal Visibility",
    visibility,
    "",
    "## Practical Use",
    interpretation.practicalUse,
    "",
    "## Cultural & Religious Meaning",
    interpretation.culturalMeaning,
    "",
    "## Omens",
    omenText,
    "",
    "## Adventure Hook",
    hook,
  ].join("\n");

  return {
    type: "note",
    kind: "constellation",
    title,
    summary: `${title} is a constellation ${culture} read as a ${visualImpression.toLowerCase()}, tied to ${practicalUse.toLowerCase()}.`,
    content,
    lore,
    pattern,
    interpretations: [interpretation],
    labels: [
      "constellation",
      genreLabel(genre),
      genreLabel(visualImpression),
      genreLabel(practicalUse),
    ],
    status: "active",
  };
}

/** Build the dedicated AI brief; campaign context is prepended by the registry. */
export function buildConstellationPrompt(
  options: ConstellationGeneratorOptions = {},
): ConstellationPrompt {
  const genre = options.genre?.trim() || "an appropriate genre";
  const visualImpression =
    options.visualImpression?.trim() || "an appropriate visual impression";
  const practicalUse =
    options.practicalUse?.trim() || "an appropriate practical use";
  const culturalMeaning =
    options.culturalMeaning?.trim() || "an appropriate cultural meaning";
  const extraAvoidedNames = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    options.campaignContext,
  )
    .map((name) => name.trim())
    .filter(Boolean);
  const nameRestrictions = extraAvoidedNames.length
    ? ` Also do not use these campaign-specific names: ${extraAvoidedNames.join(", ")}.`
    : "";

  return {
    systemInstruction:
      "You are a worldbuilder creating a culturally meaningful night-sky constellation for a GM, not an astronomy reference. Prioritise myth, use, and stakes over scientific accuracy. Return only one valid JSON object.",
    userMessage: `Create a ${genre} constellation whose shape reads as a ${visualImpression}, primarily used for ${practicalUse}, and culturally regarded as ${culturalMeaning}.
${formatCampaignContextBlock(options.campaignContext)}

Return JSON with "title", "summary", "labels", "connections", a markdown "lore" field, "pattern", and "interpretations". "summary" must describe the constellation as a whole in one sentence: what it looks like, who reads it that way, and why it matters. "pattern" is the star layout, shaped as {"stars": [{"name": string (optional, only for a prominent star worth naming), "brightness": "bright"|"moderate"|"faint", "x": number, "y": number, "notes": string (optional, a short folklore note for a named star only)}], "lines": [[number, number], ...]} — "x"/"y" are normalized 0-100 sky-plane coordinates (not astronomically real), "lines" are index pairs into "stars" tracing the shape as a single connected outline; include 4 to 9 stars, name only the one or two most prominent, and make every "lines" index a valid position in "stars". "interpretations" is an array with exactly one entry shaped as {"culture": string, "name": string (matching "title"), "visualImpression": string, "originMyth": string, "seasonalVisibility": string, "practicalUse": string, "culturalMeaning": string, "omen": string, "adventureHook": string} — "culture" is the specific people or group who read the stars this way (never "some cultures" or "many people"), "originMyth" explains concretely why this shape is believed to exist in the sky, "seasonalVisibility" states when and where in the sky it can actually be seen, "practicalUse" is a concrete, mundane use (navigation, planting, migration, festivals, timekeeping) distinct from any supernatural meaning, "culturalMeaning" is its religious or symbolic weight, "omen" is what an unusual event involving it is believed to mean, and "adventureHook" is one concrete, playable hook tied to this specific constellation and culture, not a generic prophecy. The lore must use these exact sections:
## Seasonal Visibility
## Practical Use
## Cultural & Religious Meaning
## Omens
## Adventure Hook

Do not put the origin myth or core concept in "lore" — those belong only in "content" via "## Core Concept" and "## Origin Myth", which are generated separately from "title"/"interpretations" and must not be duplicated in "lore".

Not every constellation needs to be a prophecy or supernatural omen — ground most of its weight in genuinely useful mundane knowledge (navigation, agriculture, migration, timekeeping) with the cultural/omen material as one layer among several, not the whole point. Labels must match the actual generated content: include only factual tags supported by the genre, visual impression, and practical use.

${NAME_BAN_PROMPT}${nameRestrictions}

Before returning the JSON, perform one internal validation: confirm "pattern.stars" has between 4 and 9 entries and every "lines" entry references a valid index; confirm exactly one entry in "interpretations" and that its "name" matches "title"; confirm "culture" names a specific people or group, not a vague generalisation; confirm "practicalUse" describes a genuinely mundane use distinct from "culturalMeaning"/"omen"; confirm "adventureHook" is concrete and specific to this constellation, not a generic premise; and re-read every field for wording slips — duplicated or mismatched punctuation, a name written inconsistently between "title" and "interpretations[0].name". Quietly correct any mismatch, then return only the corrected final JSON.`,
  };
}

/**
 * Validates the AI's structured "pattern" against itself: drops any "lines"
 * entry whose index does not resolve to a real star (a hallucinated or
 * out-of-range reference would otherwise break a future diagram layout
 * rather than just being dropped).
 */
function parseConstellationPattern(raw: unknown): ConstellationPattern {
  if (typeof raw !== "object" || raw === null) return { stars: [], lines: [] };
  const { stars: rawStars, lines: rawLines } = raw as Record<string, unknown>;
  const stars: ConstellationStar[] = Array.isArray(rawStars)
    ? rawStars
        .map((entry): ConstellationStar | undefined => {
          if (typeof entry !== "object" || entry === null) return undefined;
          const { name, brightness, x, y, notes } = entry as Record<
            string,
            unknown
          >;
          if (typeof x !== "number" || !Number.isFinite(x)) return undefined;
          if (typeof y !== "number" || !Number.isFinite(y)) return undefined;
          const validBrightness =
            brightness === "bright" ||
            brightness === "moderate" ||
            brightness === "faint"
              ? brightness
              : undefined;
          return {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
            ...(validBrightness ? { brightness: validBrightness } : {}),
            ...(typeof name === "string" && name.trim()
              ? { name: sanitizeText(name) }
              : {}),
            ...(typeof notes === "string" && notes.trim()
              ? { notes: sanitizeText(notes) }
              : {}),
          };
        })
        .filter((star): star is ConstellationStar => star !== undefined)
    : [];
  const lines: [number, number][] = Array.isArray(rawLines)
    ? rawLines.filter((pair): pair is [number, number] => {
        if (!Array.isArray(pair) || pair.length !== 2) return false;
        const [a, b] = pair;
        return (
          typeof a === "number" &&
          typeof b === "number" &&
          a >= 0 &&
          b >= 0 &&
          a < stars.length &&
          b < stars.length
        );
      })
    : [];
  return { stars, lines };
}

function parseConstellationInterpretations(
  raw: unknown,
): ConstellationInterpretation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): ConstellationInterpretation | undefined => {
      if (typeof entry !== "object" || entry === null) return undefined;
      const {
        culture,
        name,
        visualImpression,
        originMyth: myth,
        seasonalVisibility: visibility,
        practicalUse,
        culturalMeaning,
        omen: omenValue,
        adventureHook: hook,
      } = entry as Record<string, unknown>;
      const required = [
        culture,
        name,
        visualImpression,
        myth,
        visibility,
        practicalUse,
        culturalMeaning,
        omenValue,
        hook,
      ];
      if (required.some((v) => typeof v !== "string" || !v.trim())) {
        return undefined;
      }
      return {
        culture: sanitizeText(culture as string),
        name: sanitizeText(name as string),
        visualImpression: sanitizeText(visualImpression as string),
        originMyth: sanitizeText(myth as string),
        seasonalVisibility: sanitizeText(visibility as string),
        practicalUse: sanitizeText(practicalUse as string),
        culturalMeaning: sanitizeText(culturalMeaning as string),
        omen: sanitizeText(omenValue as string),
        adventureHook: sanitizeText(hook as string),
      };
    })
    .filter(
      (entry): entry is ConstellationInterpretation => entry !== undefined,
    );
}

/** Parse an AI constellation draft into the public generator output contract. */
export function parseConstellationResponse(
  text: string,
  avoidNames: readonly string[] = [],
): PublicGeneratorOutput {
  const data = parseFencedJson<{
    title?: unknown;
    summary?: unknown;
    lore?: unknown;
    labels?: unknown;
    pattern?: unknown;
    interpretations?: unknown;
  }>(text);

  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("Constellation response is missing a title.");
  }
  if (typeof data.lore !== "string" || !data.lore.trim()) {
    throw new Error("Constellation response is missing lore.");
  }
  const forbidden = new Set(
    [...BANNED_NAMES, ...avoidNames].map((name) => name.trim().toLowerCase()),
  );
  if (forbidden.has(data.title.trim().toLowerCase())) {
    throw new Error("Constellation response uses a banned title.");
  }

  const pattern = parseConstellationPattern(data.pattern);
  if (pattern.stars.length < 3) {
    throw new Error("Constellation response is missing a usable star pattern.");
  }
  const interpretations = parseConstellationInterpretations(
    data.interpretations,
  );
  if (interpretations.length < 1) {
    throw new Error(
      "Constellation response is missing a usable interpretation.",
    );
  }

  const labels = [
    "constellation",
    ...(Array.isArray(data.labels)
      ? data.labels.filter(
          (label): label is string =>
            typeof label === "string" && !!label.trim(),
        )
      : []),
  ].filter((label, index, all) => all.indexOf(label) === index);

  const title = data.title.trim();
  return {
    type: "note",
    kind: "constellation",
    title,
    summary: typeof data.summary === "string" ? sanitizeText(data.summary) : "",
    content: formatConstellationContent(title, interpretations[0]),
    lore: sanitizeText(data.lore.trim()),
    labels,
    status: "active",
    pattern,
    interpretations,
  };
}
