import {
  COMMON_ANCESTRIES,
  extractEntitySubtitle,
  firstMetadataValue,
} from "./entity-card-content";
import { getEntityPrimaryStance } from "./entity-card-stance";

export interface DossierAttribute {
  label: string;
  value: string;
  icon?: string;
}

const DOSSIER_KEYS = [
  "alder",
  "age",
  "opprinnelse",
  "origin",
  "homeland",
  "nåværende lokasjon",
  "naværende lokasjon",
  "lokasjon",
  "location",
  "current location",
  "tilknytning",
  "tilhørighet",
  "affiliation",
  "faction",
  "faksjon",
  "yrke/rolle",
  "yrke",
  "rolle",
  "role",
  "class",
  "klasse",
  "occupation",
  "status",
  "spesielle trekk",
  "trekk",
  "traits",
  "special traits",
  "rase",
  "race",
  "ancestry",
];

function toEnglishAttributeLabel(raw: string): string {
  const lower = raw.trim().toLowerCase();
  const exactLabels: Record<string, string> = {
    alder: "Age",
    age: "Age",
    opprinnelse: "Origin",
    origin: "Origin",
    homeland: "Origin",
    faction: "Affiliation",
    role: "Role",
    class: "Role",
    occupation: "Role",
    status: "Status",
    rase: "Race",
    race: "Race",
    ancestry: "Race",
  };
  if (exactLabels[lower]) return exactLabels[lower];
  const includesLabels: [string[], string][] = [
    [["lokasjon", "location"], "Location"],
    [["tilknyt", "tilhør", "affil", "faksjon"], "Affiliation"],
    [["yrke", "rolle"], "Role"],
    [["trekk", "trait"], "Traits"],
  ];
  const match = includesLabels.find(([needles]) =>
    needles.some((needle) => lower.includes(needle)),
  );
  return match?.[1] ?? raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
}

type DossierAttributeAdder = (
  label: string,
  value: string,
  icon?: string,
) => void;

type DossierEntity = {
  type?: string | null;
  kind?: string | null;
  labels?: string[] | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function extractDossierAttributes(
  content: string | undefined | null,
  metadata?: Record<string, unknown> | null,
  entity?: DossierEntity | null,
): DossierAttribute[] {
  const attributes: DossierAttribute[] = [];
  const seen = new Set<string>();
  const add: DossierAttributeAdder = (label, value, icon) => {
    const englishLabel = toEnglishAttributeLabel(label);
    const normalized = englishLabel.toLowerCase();
    if (seen.has(normalized) || !value.trim()) return;
    seen.add(normalized);
    attributes.push({ label: englishLabel, value: value.trim(), icon });
  };

  addContentAttributes(content, add);
  addMetadataAttributes(metadata, add);
  addFallbackAttributes(attributes, seen, entity, add);
  return attributes;
}

function addContentAttributes(
  content: string | null | undefined,
  add: DossierAttributeAdder,
): void {
  for (const rawLine of content?.split("\n") ?? []) {
    const match = rawLine
      .trim()
      .match(
        /^(?:[-*•]\s*)?\*{0,2}([-A-Za-zæøåÆØÅ\s/_]{2,25})\*{0,2}[:-]\s*(.+)$/,
      );
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .trim();
    if (key.startsWith("#") || !value || value.startsWith("http")) continue;
    const lowerKey = key.toLowerCase();
    if (
      DOSSIER_KEYS.some(
        (candidate) => lowerKey === candidate || lowerKey.startsWith(candidate),
      )
    ) {
      add(key, value, iconForAttribute(lowerKey));
    }
  }
}

function iconForAttribute(key: string): string | undefined {
  const rules: [string[], string][] = [
    [["lokasjon", "location"], "icon-[lucide--map-pin]"],
    [["tilknyt", "tilhør", "affil"], "icon-[lucide--shield]"],
    [["yrke", "role", "class"], "icon-[lucide--swords]"],
    [["status"], "icon-[lucide--badge-check]"],
    [["trekk", "trait"], "icon-[lucide--sparkles]"],
  ];
  return rules.find(([terms]) => terms.some((term) => key.includes(term)))?.[1];
}

function addMetadataAttributes(
  metadata: Record<string, unknown> | null | undefined,
  add: DossierAttributeAdder,
): void {
  if (!metadata) return;
  const fields: [string, string[], string?][] = [
    ["Age", ["age"]],
    ["Origin", ["origin", "opprinnelse", "homeland"]],
    [
      "Location",
      ["location", "lokasjon", "currentLocation", "current_location"],
      "icon-[lucide--map-pin]",
    ],
    [
      "Affiliation",
      ["affiliation", "tilknytning", "tilhørighet", "faction"],
      "icon-[lucide--shield]",
    ],
    [
      "Role",
      ["role", "yrke", "class", "klasse", "occupation"],
      "icon-[lucide--swords]",
    ],
    ["Status", ["status"], "icon-[lucide--badge-check]"],
    [
      "Traits",
      ["traits", "trekk", "specialTraits", "spesielle_trekk"],
      "icon-[lucide--sparkles]",
    ],
  ];
  for (const [label, keys, icon] of fields) {
    const value = firstMetadataValue(metadata, keys);
    if (value) add(label, String(value), icon);
  }
}

const NON_TRAIT_LABELS = [
  "ally",
  "alliert",
  "enemy",
  "fiende",
  "party",
  "partyet",
  "neutral",
  "nøytral",
  "character",
  "female",
  "male",
  "kvinne",
  "mann",
  "human",
  "menneske",
  "elf",
  "alv",
  "dwarf",
  "dverg",
  "halfling",
  "tiefling",
  "orc",
  "ork",
  "gnome",
  "rogue",
  "fighter",
  "wizard",
  "cleric",
];

function addFallbackAttributes(
  attributes: DossierAttribute[],
  seen: Set<string>,
  entity: DossierEntity | null | undefined,
  add: DossierAttributeAdder,
): void {
  if (!entity || attributes.length >= 3) return;
  addRoleAndStatusFallbacks(seen, entity, add);
  addLabelFallbacks(seen, entity.labels ?? [], add);
}

function addRoleAndStatusFallbacks(
  seen: Set<string>,
  entity: DossierEntity,
  add: DossierAttributeAdder,
): void {
  if (!seen.has("role")) {
    const role = extractEntitySubtitle(entity);
    if (role && !["Character", "Unknown", "Note"].includes(role)) {
      add("Role", role, "icon-[lucide--swords]");
    }
  }
  if (!seen.has("status")) {
    const status = getEntityPrimaryStance(entity).badgeText;
    if (status && !["Character", "Unknown"].includes(status)) {
      add("Status", status, "icon-[lucide--badge-check]");
    }
  }
}

function addLabelFallbacks(
  seen: Set<string>,
  labels: string[],
  add: DossierAttributeAdder,
): void {
  if (!seen.has("race")) {
    const race = labels.find((label) =>
      COMMON_ANCESTRIES.some((term) => label.toLowerCase().includes(term)),
    );
    if (race) add("Race", race);
  }
  if (!seen.has("traits")) {
    const traits = labels.filter(
      (label) =>
        !NON_TRAIT_LABELS.some((term) => label.toLowerCase().includes(term)),
    );
    if (traits.length)
      add("Traits", traits.join(", "), "icon-[lucide--sparkles]");
  }
}

export interface DossierSections {
  background?: string;
  goals: string[];
}

export function extractDossierSections(
  content: string | undefined | null,
): DossierSections {
  if (!content) return { goals: [] };

  const sections: DossierSections = { goals: [] };
  const lines = content.split("\n");

  let currentSection: "none" | "background" | "goals" = "none";
  const bgLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headerMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headerMatch) {
      currentSection = classifyDossierSection(headerMatch[1]);
      continue;
    }

    if (currentSection === "goals") appendGoal(line, sections.goals);
    if (currentSection === "background" && isBackgroundText(line))
      bgLines.push(line);
  }

  if (bgLines.length > 0) {
    sections.background = bgLines.join(" ");
  }

  return sections;
}

type DossierSectionName = "none" | "background" | "goals";

function classifyDossierSection(rawHeading: string): DossierSectionName {
  const heading = rawHeading.trim().toLowerCase();
  const backgroundTerms = [
    "bakgrunn",
    "background",
    "overview",
    "lore",
    "beskrivelse",
    "description",
  ];
  const goalTerms = ["mål", "mal", "goal", "motivation", "agenda"];
  if (backgroundTerms.some((term) => heading.includes(term)))
    return "background";
  if (goalTerms.some((term) => heading.includes(term))) return "goals";
  return "none";
}

function appendGoal(line: string, goals: string[]): void {
  const match = line.match(/^[-*•]\s+(.+)$/);
  const goal = match?.[1].replace(/[*_`~]/g, "").trim();
  if (goal) goals.push(goal);
}

function isBackgroundText(line: string): boolean {
  const isAttribute =
    /^(?:[-*•]\s*)?\*{0,2}[-A-Za-zæøåÆØÅ\s/_]{2,25}\*{0,2}[:-]/.test(line);
  return Boolean(line) && !isAttribute && !line.startsWith(">");
}
