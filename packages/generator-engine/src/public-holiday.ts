import { pickFrom } from "./random-utils";
import { avoidNamesExcludingContext } from "./campaign-context";
import { parseFencedJson } from "./llm-response-utils";
import { factionConfig } from "./public-faction-constants";
import { NAME_BAN_PROMPT } from "./public-npc";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { type Rng, defaultRng } from "./random-utils";

export const holidayConfig = {
  genres: factionConfig.themes,
  scopes: [
    "A local settlement",
    "A region or province",
    "A nation",
    "A culture",
    "A religion",
    "A faction",
  ],
  types: [
    "Religious holy day",
    "Seasonal or agricultural festival",
    "Civic or national holiday",
    "Memorial or remembrance day",
    "Cultural tradition or rite of passage",
    "Market fair or guild day",
    "Celestial observance",
    "Contested, forbidden, or secret day",
    "Local or regional oddity",
  ],
  tones: ["Celebratory", "Solemn", "Eerie", "Political", "Mixed"],
  setSizes: [
    "One observance",
    "A calendar of 6 observances",
    "A calendar of 10 observances",
    "A calendar of 14 observances",
  ],
} as const;

export interface HolidayGeneratorOptions {
  genre?: string;
  scope?: string;
  culture?: string;
  climate?: string;
  religion?: string;
  history?: string;
  importantPeople?: string;
  importantEvents?: string;
  tone?: string;
  setSize?: string;
  includeControversial?: boolean;
  avoidNames?: string[];
}

export interface ResolvedHoliday {
  genre: string;
  scope: string;
  culture: string;
  climate: string;
  religion: string;
  history: string;
  importantPeople: string;
  importantEvents: string;
  tone: string;
  count: number;
  includeControversial: boolean;
  avoidNames: string[];
}

export interface HolidayPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedHoliday;
}

export function resolveHoliday(
  options: HolidayGeneratorOptions = {},
  _rng: Rng = defaultRng,
): ResolvedHoliday {
  const countMatch = options.setSize?.match(/(\d+)/);
  const requestedCount = countMatch ? Number(countMatch[1]) : 1;
  const count =
    Number.isInteger(requestedCount) &&
    requestedCount >= 1 &&
    requestedCount <= 14
      ? requestedCount
      : 1;
  return {
    genre: options.genre?.trim() || "Classic Fantasy",
    scope: options.scope?.trim() || holidayConfig.scopes[0],
    culture: options.culture?.trim() || "",
    climate: options.climate?.trim() || "",
    religion: options.religion?.trim() || "",
    history: options.history?.trim() || "",
    importantPeople: options.importantPeople?.trim() || "",
    importantEvents: options.importantEvents?.trim() || "",
    tone: options.tone?.trim() || "Mixed",
    count,
    includeControversial: options.includeControversial ?? false,
    avoidNames: options.avoidNames ?? [],
  };
}

export function buildHolidayPrompt(
  options: HolidayGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): HolidayPrompt {
  const resolved = resolveHoliday(options, rng);
  const nameBan = avoidNamesExcludingContext(
    resolved.avoidNames,
    resolved.culture,
  );
  const isCalendar = resolved.count > 1;
  const userMessage = `Create ${isCalendar ? `a coherent calendar of exactly ${resolved.count} observances` : "one memorable observance"} for a fictional society.
Context:
- Genre or theme: ${resolved.genre}
- Scope: ${resolved.scope}
- Cultural description: ${resolved.culture || "Invent a concise, internally coherent culture from the available details."}
- Climate and seasons: ${resolved.climate || "Choose conditions that fit the setting."}
- Religion or cosmology: ${resolved.religion || "None specified; do not assume a dominant religion."}
- Political and historical background: ${resolved.history || "None supplied; create only the minimum history needed for cultural causality."}
- Important people: ${resolved.importantPeople || "None supplied."}
- Important events: ${resolved.importantEvents || "None supplied."}
- Tone: ${resolved.tone}
- Include at least one contested, secret, suppressed, or misunderstood observance: ${resolved.includeControversial ? "yes" : "only if it follows naturally"}

Build a specific, internally coherent society before inventing its observances. Missing context is an invitation to make grounded choices, not to default to generic fantasy: establish a distinctive landscape and climate, what people do to live, how communities organise authority and mutual obligation, and what they believe about the world (including a credible secular answer if no religion is specified). Make these details concrete and mutually consistent, and let them shape every observance. Do not present invented details as if the user supplied them.

Use cultural causality rather than novelty for its own sake. Each day must answer why these people care, how their actual geography, livelihood, beliefs, history, or politics shaped it, what behaviour it produces, who benefits, who rejects it, and how its meaning has changed. Give traditions physical and social specificity: what participants do, with what locally meaningful materials or resources, and why. Make food, dress, taboos, public beliefs, variations, and tensions follow from the same culture rather than interchangeable fantasy flavour. Avoid boilerplate such as arbitrary coloured threads, generic preserved food, absent-place rituals, or a standard dispute over an official historical account unless those details are causally earned. In a calendar, vary the observances' origins, social functions, participants, and stakes; avoid repeating names, dates, motifs, or tensions with superficial changes. Supplied people and events are candidates, not a checklist: select only plausible commemorations and do not force every input into the result. Avoid Gregorian dates unless the culture uses that calendar; give seasonal, relative, lunar, or astronomical timing instead.

Return JSON with title, summary, content, lore, labels, status, and observances. The content is the table-facing calendar entry or overview. For each observance include name, type, when, observers, origin, traditions, foodOrDress, taboos, variations, outsiderMisunderstanding, publicBelief, optional hiddenTruth, and tension. Use distinct concepts; dates should be distributed plausibly, with religious, civic, seasonal, memorial and cultural variety where appropriate. Reuse motifs across the set when it makes sense, allow competing groups to reinterpret an event, and do not give every historical event its own holiday. A hook is an invitation, not a required plot.

For a calendar, begin content with a compact overview that names the society's defining cultural motifs and the calendar's varied social functions, then fully expand all ${resolved.count} observances. Every observance must include all requested details: origin, traditions, food or dress, taboos and regional variations, outsider misunderstanding, public belief, and a distinct table-ready tension. Do not abbreviate later entries to headings and metadata. The observances array must contain exactly ${resolved.count} matching entries in the same order as the expanded content. For one observance, provide exactly one fully detailed entry.

Lore may include a short GM-only section on hidden history or a current tension, but omit it when no useful secret exists. Never contradict supplied facts.

${nameBan ? `Already created or used this session — do NOT reuse these names or generate duplicate concepts:\n${nameBan}\n` : ""}${NAME_BAN_PROMPT}
${sessionContext}
Before returning, run a consistency pass: the number of observances in the overview, expanded content, and observances array must equal ${resolved.count}; each array entry must match its expanded observance's name, type, timing, observers, traditions, and tension; calendar dates must be plausibly distributed without duplicate concepts; supplied historical people and events must be used selectively and consistently; any hidden history must not contradict the public account or supplied campaign facts.
Return only the JSON object. Do not include markdown code block formatting.`;
  return {
    systemInstruction:
      "You create culturally grounded, playable fictional observances and return valid JSON.",
    userMessage,
    resolved,
  };
}

export function parseHolidayResponse(
  text: string,
  resolved: ResolvedHoliday,
): PublicGeneratorOutput {
  let data: Record<string, unknown> = {};
  try {
    const parsed = parseFencedJson<unknown>(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to the complete local result for malformed model output.
  }
  const fallback = generateHolidayLocal({
    genre: resolved.genre,
    scope: resolved.scope,
    culture: resolved.culture,
    history: resolved.history,
    importantPeople: resolved.importantPeople,
    importantEvents: resolved.importantEvents,
    climate: resolved.climate,
    religion: resolved.religion,
    avoidNames: resolved.avoidNames,
    tone: resolved.tone,
    setSize:
      resolved.count > 1
        ? `A calendar of ${resolved.count} observances`
        : "One observance",
  });
  const rawObservances = Array.isArray(data.observances)
    ? data.observances
    : [];
  const structuredObservancesAreValid =
    rawObservances.length === resolved.count &&
    rawObservances.every(
      (entry) =>
        entry !== null &&
        typeof entry === "object" &&
        ["name", "type", "when", "observers", "traditions", "tension"].every(
          (key) => {
            const value = (entry as Record<string, unknown>)[key];
            return typeof value === "string" && value.trim().length > 0;
          },
        ),
    ) &&
    typeof data.title === "string" &&
    data.title.trim().length > 0 &&
    typeof data.content === "string" &&
    data.content.trim().length > 0;
  if (!structuredObservancesAreValid) return fallback;
  return {
    type: "note",
    title: data.title as string,
    summary:
      typeof data.summary === "string" && data.summary.trim()
        ? data.summary
        : fallback.summary,
    content: data.content as string,
    lore: typeof data.lore === "string" ? data.lore : fallback.lore,
    labels:
      Array.isArray(data.labels) &&
      data.labels.every((label) => typeof label === "string")
        ? data.labels
        : fallback.labels,
    status: "active",
    observances: rawObservances as PublicGeneratorOutput["observances"],
  };
}

export function generateHolidayLocal(
  options: HolidayGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveHoliday(options, rng);
  const count = resolved.count;
  const usedNames = new Set<string>(
    resolved.avoidNames.map((name) => name.toLocaleLowerCase()),
  );
  const observances = Array.from({ length: count }, (_, index) => {
    const baseName = `${pickFrom(["First", "Last", "High", "Quiet", "Returning", "Shared", "Ember", "Threshold"], rng)} ${pickFrom(["Hearth", "Lanterns", "Tide", "Seed", "Witness", "Names", "Crossing", "Harvest"], rng)}`;
    let name = baseName;
    let suffix = 2;
    while (usedNames.has(name.toLocaleLowerCase()))
      name = `${baseName} ${suffix++}`;
    usedNames.add(name.toLocaleLowerCase());
    const type = pickFrom([...holidayConfig.types], rng);
    const when = pickFrom(
      [
        "the first thaw after the long winter",
        "the third new moon of the planting season",
        "the night the twin moons appear together",
        "the final market day before the rains",
        "the anniversary of the treaty's signing",
        "the first dawn after the harvest",
        "the week when the river falls below the old bridge",
      ],
      rng,
    );
    const observers = `${resolved.scope}; especially families who ${pickFrom(["keep the old river rites", "work the winter fields", "lost kin in the border war", "trade along the high road", "serve the local shrine"], rng)}`;
    const origin = `It recalls ${pickFrom(["a flood survived by sharing seed grain", "a ruler who ended a costly siege", "the first safe return across the mountain pass", "workers who kept the river gate open", "a promise made after the old observatory fell silent"], rng)}. The official account gives the event a single meaning, though different households remember who paid its cost.`;
    const traditions = `At dusk, neighbours ${pickFrom(["leave a place at the table for absent travellers", "carry covered lamps to the river steps", "exchange a tool they have repaired rather than a new gift", "read one name from a shared register", "hang strips of cloth from the market arch"], rng)}. The rite ends when the oldest and youngest participants share the final task.`;
    const tension = pickFrom(
      [
        "This year, the customary route passes through a district whose residents reject the official commemoration.",
        "A newly uncovered record names someone the public rite has always blamed.",
        "An eclipse falls during the ceremony, and rival factions disagree about whether to proceed.",
        "A family asks the party to protect the source of a version of the story the authorities suppress.",
      ],
      rng,
    );
    return {
      name,
      type,
      when,
      observers,
      origin,
      traditions,
      foodOrDress:
        "Participants wear a small blue thread and share preserved fruit or its local equivalent.",
      taboos:
        "Do not speak for someone who is absent, or claim that every household remembers the event in the same way.",
      variations:
        "Officials favour the formal procession; nearby families keep a quieter meal and tell a different part of the story.",
      outsiderMisunderstanding:
        "Visitors often assume the empty place is an invitation. It is kept for those who cannot safely attend.",
      publicBelief: "The day commemorates a hard-won act of mutual protection.",
      ...(index === 0 && resolved.includeControversial
        ? {
            hiddenTruth:
              "The first version of the official account was written by the faction that controlled the surviving records; the shared act happened, but its credited leader did not plan it.",
          }
        : {}),
      tension,
    };
  });
  const title =
    count === 1 ? observances[0]!.name : `${resolved.scope} observances`;
  const content =
    count === 1
      ? `## ${observances[0]!.name}\n\n**Type:** ${observances[0]!.type}\n**When:** ${observances[0]!.when}\n**Observed by:** ${observances[0]!.observers}\n\n### Origin\n${observances[0]!.origin}\n\n### Traditions\n${observances[0]!.traditions}\n\n### Food, dress and symbols\n${observances[0]!.foodOrDress}\n\n### Taboos and variations\n${observances[0]!.taboos} ${observances[0]!.variations}\n\n### What outsiders misunderstand\n${observances[0]!.outsiderMisunderstanding}\n\n### What people believe\n${observances[0]!.publicBelief}\n\n### At the table\n${observances[0]!.tension}`
      : `## Calendar overview\n\n${count} observances across ${resolved.scope}, mixing seasonal, civic, religious, memorial and local traditions. The shared motifs are mutual protection, contested memory and the obligations owed to absent people.\n\n${observances.map((day) => `## ${day.name}\n\n**Type:** ${day.type}\n**When:** ${day.when}\n**Observed by:** ${day.observers}\n\n### Origin\n${day.origin}\n\n### Traditions\n${day.traditions}\n\n### Food, dress and symbols\n${day.foodOrDress}\n\n### Taboos and regional variations\n${day.taboos} ${day.variations}\n\n### What outsiders misunderstand\n${day.outsiderMisunderstanding}\n\n### What people believe\n${day.publicBelief}${day.hiddenTruth ? `\n\n### Hidden history\n${day.hiddenTruth}` : ""}\n\n### At the table\n${day.tension}`).join("\n\n")}`;
  return {
    type: "note",
    title,
    summary:
      count === 1
        ? `${observances[0]!.when}; a ${observances[0]!.type.toLowerCase()} shaped by ${resolved.culture || resolved.genre}.`
        : `${count} connected observances for ${resolved.scope}, shaped by ${resolved.culture || resolved.genre}.`,
    content,
    lore: observances.some((day) => day.hiddenTruth)
      ? `## GM-only history\n\n${observances
          .filter((day) => day.hiddenTruth)
          .map((day) => `- **${day.name}**: ${day.hiddenTruth}`)
          .join("\n")}`
      : `## Use at the table\n\n${observances
          .slice(0, 3)
          .map((day) => `- **${day.name}**: ${day.tension}`)
          .join("\n")}`,
    labels: ["holiday-generator", "observance", "imported-draft"],
    status: "active",
    observances,
  };
}
