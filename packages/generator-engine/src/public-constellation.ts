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
  seasons: ["Spring", "Summer", "Autumn", "Winter", "Year-round"],
  skyRegions: ["North", "South", "East", "West", "Circumpolar", "Zenith"],
  // Combined with nameNouns to synthesize enough distinct constellation
  // names for a full night sky (up to 15), since the fixed `names` pool
  // alone is too small to guarantee uniqueness at that count.
  nameAdjectives: [
    "Iron",
    "Salt",
    "Ashen",
    "Drowned",
    "Silent",
    "Broken",
    "Ember",
    "Widow's",
  ],
  nameNouns: [
    "Wolf",
    "Crown",
    "Chain",
    "Archer",
    "Serpent",
    "Lantern",
    "Plough",
    "Oar",
  ],
} as const;

export type ConstellationMode = "single" | "night-sky";

export interface ConstellationGeneratorOptions {
  /** "single" (default): one constellation. "night-sky": 8-15 for one culture. */
  mode?: ConstellationMode;
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

export type ConstellationSeason =
  "Spring" | "Summer" | "Autumn" | "Winter" | "Year-round";

export type ConstellationSkyRegion =
  "North" | "South" | "East" | "West" | "Circumpolar" | "Zenith";

/** One constellation as it sits within a coherent full night sky. */
export interface NightSkyConstellationEntry {
  constellation: ConstellationData;
  season: ConstellationSeason;
  skyRegion: ConstellationSkyRegion;
}

/** A coherent set of 8-15 constellations for a single culture's sky. */
export interface NightSkyData {
  culture: string;
  constellations: NightSkyConstellationEntry[];
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

/**
 * Picks a name not already used in this sky and not in `avoidNames`: first
 * from the fixed `names` pool, then falling back to a synthesized
 * adjective+noun combination (64 possible pairs) once that pool is
 * exhausted — needed for a full night sky of up to 15 constellations, where
 * the fixed pool alone can't guarantee uniqueness.
 */
function chooseUniqueName(
  avoidNames: ReadonlySet<string>,
  usedInSky: ReadonlySet<string>,
  rng: Rng,
): string {
  const forbidden = (name: string) =>
    avoidNames.has(name.toLowerCase()) || usedInSky.has(name.toLowerCase());
  const availableFixed = constellationConfig.names.filter(
    (name) => !forbidden(name),
  );
  if (availableFixed.length) return pickFrom(availableFixed, rng);
  for (let attempts = 0; attempts < 40; attempts++) {
    const candidate = `The ${pickFrom(constellationConfig.nameAdjectives, rng)} ${pickFrom(constellationConfig.nameNouns, rng)}`;
    if (!forbidden(candidate)) return candidate;
  }
  // Pool genuinely exhausted (should not happen at <=15 entries): make the
  // fixed pool's first name unique with a numeric suffix rather than crash.
  return `${constellationConfig.names[0]} II`;
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

// ---------------------------------------------------------------------------
// Night Sky mode: 8-15 coherent constellations for a single culture
// ---------------------------------------------------------------------------

/**
 * Renders "## Core Concept" + a by-season index from the single source of
 * truth (the parsed `NightSkyData`), the same derivation pattern as
 * formatConstellationContent() above.
 */
function formatNightSkyContent(skyName: string, data: NightSkyData): string {
  const bySeasonLines = (
    constellationConfig.seasons as readonly ConstellationSeason[]
  )
    .map((season) => {
      const inSeason = data.constellations.filter((c) => c.season === season);
      if (!inSeason.length) return undefined;
      const names = inSeason
        .map((c) => `**${c.constellation.interpretations[0]?.name}**`)
        .join(", ");
      return `- **${season}**: ${names}`;
    })
    .filter((line): line is string => line !== undefined);

  return [
    "## Core Concept",
    `${skyName} is how ${data.culture} read the whole night sky: ${data.constellations.length} constellations spanning every season, sharing one mythology.`,
    "",
    "## Constellations by Season",
    ...bySeasonLines,
  ].join("\n");
}

/** GM-only reference block per constellation, derived the same way as content above. */
function formatNightSkyLore(data: NightSkyData): string {
  return data.constellations
    .map((entry) => {
      const interp = entry.constellation.interpretations[0];
      if (!interp) return "";
      return [
        `### ${interp.name} (${entry.season}, ${entry.skyRegion})`,
        interp.originMyth,
        `- **Practical use**: ${interp.practicalUse}`,
        `- **Cultural meaning**: ${interp.culturalMeaning}`,
        `- **Omen**: ${interp.omen}`,
        `- **Adventure hook**: ${interp.adventureHook}`,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

/** Generate a complete local night-sky draft without network access or vault writes. */
export function generateNightSkyLocal(
  options: ConstellationGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const genre = choose(options.genre, constellationConfig.genres, rng);
  const culture = pickFrom(constellationConfig.cultures, rng);
  const avoidNames = new Set(
    (options.avoidNames ?? []).map((n) => n.trim().toLowerCase()),
  );
  const count = 8 + Math.floor(rng() * 8); // 8-15
  const usedNames = new Set<string>();
  const entries: NightSkyConstellationEntry[] = [];
  const skyName = `The ${culture.replace(/^the /i, "")} Sky`;

  for (let i = 0; i < count; i++) {
    const name = chooseUniqueName(avoidNames, usedNames, rng);
    usedNames.add(name.toLowerCase());
    const visualImpression = pickFrom(
      constellationConfig.visualImpressions,
      rng,
    );
    const practicalUse = pickFrom(constellationConfig.practicalUses, rng);
    const culturalMeaning = pickFrom(constellationConfig.culturalMeanings, rng);
    const season = pickFrom(
      constellationConfig.seasons as readonly ConstellationSeason[],
      rng,
    );
    const skyRegion = pickFrom(
      constellationConfig.skyRegions as readonly ConstellationSkyRegion[],
      rng,
    );

    const pattern = generatePattern(rng);
    const brightestIndex = pattern.stars.findIndex(
      (s) => s.brightness === "bright",
    );
    if (brightestIndex >= 0) {
      pattern.stars[brightestIndex] = {
        ...pattern.stars[brightestIndex],
        name: `${name.split(" ").slice(-1)[0]}'s Eye`,
        notes: `The star ${culture} point to first when teaching the shape to children.`,
      };
    }

    let myth = originMyth(name, visualImpression, culture, rng);
    // Recurring myths: tie some entries back to an earlier one so the sky
    // reads as one connected mythology, not N independent rolls.
    if (entries.length > 0 && rng() < 0.35) {
      const earlierName =
        entries[Math.floor(rng() * entries.length)].constellation
          .interpretations[0]?.name;
      if (earlierName) {
        myth = `${myth} Its story is bound to ${earlierName}: the two are told together, one explaining the other.`;
      }
    }

    const visibility = seasonalVisibility(rng);
    const regionClause =
      skyRegion === "Circumpolar"
        ? "circling the pole year-round"
        : skyRegion === "Zenith"
          ? "passing directly overhead"
          : `toward the ${skyRegion.toLowerCase()}`;

    const interpretation: ConstellationInterpretation = {
      culture,
      name,
      visualImpression,
      originMyth: myth,
      seasonalVisibility: `${visibility} Most prominent in the ${season.toLowerCase() === "year-round" ? "sky year-round" : `${season.toLowerCase()} sky`}, ${regionClause}.`,
      practicalUse: `Used by ${culture} for ${practicalUse.toLowerCase()}.`,
      culturalMeaning: `Regarded by ${culture} as ${culturalMeaning.toLowerCase()}.`,
      omen: omen(culture, rng),
      adventureHook: adventureHook(name, culture, rng),
    };

    entries.push({
      constellation: { pattern, interpretations: [interpretation] },
      season,
      skyRegion,
    });
  }

  const nightSky: NightSkyData = { culture, constellations: entries };
  const content = formatNightSkyContent(skyName, nightSky);
  const lore = formatNightSkyLore(nightSky);

  return {
    type: "note",
    kind: "night-sky",
    title: skyName,
    summary: `${skyName} is a coherent set of ${count} constellations ${culture} read into the stars, spanning every season.`,
    content,
    lore,
    nightSky,
    labels: ["constellation", "night-sky", genreLabel(genre)],
    status: "active",
  };
}

/** Build the dedicated night-sky AI brief; campaign context is prepended by the registry. */
export function buildNightSkyPrompt(
  options: ConstellationGeneratorOptions = {},
): ConstellationPrompt {
  const genre = options.genre?.trim() || "an appropriate genre";
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
      "You are a worldbuilder creating one coherent, culturally meaningful night sky for a single people, not a list of unrelated star names. Return only one valid JSON object.",
    userMessage: `Create a full ${genre} night sky: one specific culture's complete set of named constellations, covering every season.
${formatCampaignContextBlock(options.campaignContext)}

Return JSON with "title" (a name for this sky/tradition as a whole, e.g. "The <Culture> Sky"), "summary", "labels", "connections", a markdown "lore" field, "culture", and "constellations". "culture" is the specific people or group whose sky this is (never "some cultures" or "many people"). "constellations" is an array of 8 to 15 entries, each shaped as {"season": "Spring"|"Summer"|"Autumn"|"Winter"|"Year-round", "skyRegion": "North"|"South"|"East"|"West"|"Circumpolar"|"Zenith", "pattern": {"stars": [{"name": string (optional), "brightness": "bright"|"moderate"|"faint", "x": number, "y": number, "notes": string (optional)}], "lines": [[number, number], ...]}, "interpretation": {"culture": string, "name": string, "visualImpression": string, "originMyth": string, "seasonalVisibility": string, "practicalUse": string, "culturalMeaning": string, "omen": string, "adventureHook": string}}. Every entry's "pattern" follows the same rules as a single constellation (4 to 9 stars, valid "lines" indices only). Every entry's "interpretation.culture" must be the exact same string as the top-level "culture", and "interpretation.name" must be unique across the whole array. Distribute entries across all five seasons and multiple sky regions rather than clustering them in one combination.

At least three entries' "originMyth" must explicitly reference another named constellation in this same array by its exact name (a sibling, a rival, a shared origin), so the sky reads as one connected mythology; the rest can stand alone. Keep the same rules as a single constellation: "practicalUse" stays a genuinely mundane use distinct from "culturalMeaning"/"omen", and not every entry needs a supernatural omen as its main point. Labels must include "constellation" and "night-sky" plus factual tags for the genre. The "lore" field must cover every constellation by name, grouped by season, each with its practical use, cultural meaning, omen and one adventure hook.

${NAME_BAN_PROMPT}${nameRestrictions}

Before returning the JSON, perform one internal validation: confirm "constellations" has between 8 and 15 entries, each with a unique "interpretation.name" and the exact same "interpretation.culture" as top-level "culture"; confirm every entry's "pattern" has 4-9 stars and only valid "lines" indices; confirm at least three entries cross-reference another entry's exact name in their "originMyth"; confirm entries are spread across seasons and sky regions rather than repeating one combination; and re-read every field for wording slips or a name reused inconsistently. Quietly correct any mismatch, then return only the corrected final JSON.`,
  };
}

/** Parse an AI night-sky draft into the public generator output contract. */
export function parseNightSkyResponse(
  text: string,
  avoidNames: readonly string[] = [],
): PublicGeneratorOutput {
  const data = parseFencedJson<{
    title?: unknown;
    summary?: unknown;
    lore?: unknown;
    labels?: unknown;
    culture?: unknown;
    constellations?: unknown;
  }>(text);

  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("Night sky response is missing a title.");
  }
  if (typeof data.lore !== "string" || !data.lore.trim()) {
    throw new Error("Night sky response is missing lore.");
  }
  if (typeof data.culture !== "string" || !data.culture.trim()) {
    throw new Error("Night sky response is missing a culture.");
  }
  const forbidden = new Set(
    [...BANNED_NAMES, ...avoidNames].map((name) => name.trim().toLowerCase()),
  );
  if (forbidden.has(data.title.trim().toLowerCase())) {
    throw new Error("Night sky response uses a banned title.");
  }

  const culture = sanitizeText(data.culture.trim());
  const rawEntries = Array.isArray(data.constellations)
    ? data.constellations
    : [];
  const seenNames = new Set<string>();
  const constellations: NightSkyConstellationEntry[] = [];
  for (const raw of rawEntries) {
    if (typeof raw !== "object" || raw === null) continue;
    const { season, skyRegion, pattern, interpretation } = raw as Record<
      string,
      unknown
    >;
    const validSeason = (
      constellationConfig.seasons as readonly string[]
    ).includes(season as string)
      ? (season as ConstellationSeason)
      : undefined;
    const validRegion = (
      constellationConfig.skyRegions as readonly string[]
    ).includes(skyRegion as string)
      ? (skyRegion as ConstellationSkyRegion)
      : undefined;
    if (!validSeason || !validRegion) continue;
    const parsedPattern = parseConstellationPattern(pattern);
    if (parsedPattern.stars.length < 3) continue;
    const parsedInterpretations = parseConstellationInterpretations([
      interpretation,
    ]);
    if (parsedInterpretations.length < 1) continue;
    const interp = parsedInterpretations[0];
    const key = interp.name.toLowerCase();
    if (seenNames.has(key) || forbidden.has(key)) continue;
    seenNames.add(key);
    constellations.push({
      constellation: {
        pattern: parsedPattern,
        interpretations: [{ ...interp, culture }],
      },
      season: validSeason,
      skyRegion: validRegion,
    });
  }
  if (constellations.length < 8) {
    throw new Error(
      "Night sky response is missing enough usable constellations.",
    );
  }

  const nightSky: NightSkyData = { culture, constellations };
  const title = data.title.trim();
  const labels = [
    "constellation",
    "night-sky",
    ...(Array.isArray(data.labels)
      ? data.labels.filter(
          (label): label is string =>
            typeof label === "string" && !!label.trim(),
        )
      : []),
  ].filter((label, index, all) => all.indexOf(label) === index);

  return {
    type: "note",
    kind: "night-sky",
    title,
    summary: typeof data.summary === "string" ? sanitizeText(data.summary) : "",
    content: formatNightSkyContent(title, nightSky),
    lore: sanitizeText(data.lore.trim()),
    labels,
    status: "active",
    nightSky,
  };
}
