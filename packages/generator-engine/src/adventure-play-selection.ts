export interface SelectedAdventureForPlay {
  origin: {
    kind: "manual";
    manualId: string;
    sourceRecordId?: string;
  };
  playerVisible: {
    title: string;
    openingSituation: string;
    primaryObjective: string;
    startingLocations: string[];
  };
  gmOnly: {
    truth: string;
    ifInvestigated: string;
    npcsAndFactions: string[];
  };
}

export class AdventureSelectionError extends Error {
  constructor(
    readonly reason:
      | "invalid-adventure-draft"
      | "missing-player-section"
      | "missing-gm-section",
  ) {
    super("Cannot select this adventure: " + reason);
    this.name = "AdventureSelectionError";
  }
}

function clampText(value: string, maxLength = 600): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength - 1).trimEnd() + "…";
}

function parseMarkdownSections(markdown: string): Map<string, string> {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const headingRegex = /^#{1,3}\s+(.+)$/gm;
  const matches = [...normalized.matchAll(headingRegex)];
  const sections = new Map<string, string>();

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!;
    const name = match[1]!.trim().toLowerCase();
    const start = match.index! + match[0].length;
    const end = matches[i + 1]?.index ?? normalized.length;
    const body = normalized.slice(start, end).trim();
    sections.set(name, body);
  }

  return sections;
}

function findSection(
  sections: Map<string, string>,
  keywords: readonly string[],
): string | undefined {
  for (const [name, body] of sections.entries()) {
    if (keywords.some((kw) => name.includes(kw))) {
      return body;
    }
  }
  return undefined;
}

function extractItemsOrLines(body: string | undefined): string[] {
  if (!body) return [];
  const bulletLines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);

  if (bulletLines.length > 0) return bulletLines;

  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function selectAdventureForPlay(
  draft: {
    title?: string;
    summary?: string;
    content?: string;
    lore?: string;
  },
  sourceRecordId?: string,
  manualId?: string,
): SelectedAdventureForPlay {
  if (
    !draft ||
    typeof draft.title !== "string" ||
    !draft.title.trim() ||
    typeof draft.content !== "string" ||
    typeof draft.lore !== "string"
  ) {
    throw new AdventureSelectionError("invalid-adventure-draft");
  }

  const contentSections = parseMarkdownSections(draft.content);
  const loreSections = parseMarkdownSections(draft.lore);

  const initialSituation = findSection(contentSections, ["initial situation"]);
  const primaryObjective = findSection(contentSections, [
    "primary objective",
    "objective",
  ]);

  if (!initialSituation || !primaryObjective) {
    throw new AdventureSelectionError("missing-player-section");
  }

  const threats = findSection(contentSections, ["threats", "antagonists"]);
  const discoveries = findSection(contentSections, [
    "clues",
    "secrets",
    "discoveries",
  ]);
  const complications = findSection(loreSections, ["complications"]);
  const rewards = findSection(loreSections, ["rewards", "stakes"]);
  const outcomes = findSection(loreSections, ["outcomes"]);

  if (!threats || !outcomes) {
    throw new AdventureSelectionError("missing-gm-section");
  }

  const keyLocationsBody = findSection(contentSections, [
    "key locations",
    "locations",
  ]);
  const startingLocations = extractItemsOrLines(keyLocationsBody);

  const npcsBody = findSection(contentSections, ["npcs", "factions"]);
  const npcsAndFactions = extractItemsOrLines(npcsBody);

  const truthParts = [
    `Threats: ${threats}`,
    discoveries ? `Discoveries: ${discoveries}` : "",
    complications ? `Complications: ${complications}` : "",
  ].filter(Boolean);
  const truth = clampText(truthParts.join("\n\n"), 600);

  const investigatedParts = [
    `Possible Outcomes: ${outcomes}`,
    rewards ? `Rewards & Stakes: ${rewards}` : "",
  ].filter(Boolean);
  const ifInvestigated = clampText(investigatedParts.join("\n\n"), 600);

  const resolvedManualId = manualId ?? crypto.randomUUID();

  return {
    origin: {
      kind: "manual",
      manualId: resolvedManualId,
      ...(sourceRecordId ? { sourceRecordId } : {}),
    },
    playerVisible: {
      title: clampText(draft.title),
      openingSituation: clampText(initialSituation, 600),
      primaryObjective: clampText(primaryObjective, 600),
      startingLocations,
    },
    gmOnly: {
      truth,
      ifInvestigated,
      npcsAndFactions,
    },
  };
}
