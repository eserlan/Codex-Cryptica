import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

interface LayoutRule {
  label: string;
  // Lore sections that stay in the right rail; everything else moves into the
  // main document.
  railSections: Set<string>;
  // Bullets inside rail sections whose `- **Label**:` matches are lifted out
  // of the rail and grouped under `heading` in the main document. Use this for
  // verbose, story-bearing bullets (secrets, hooks) embedded in stat blocks.
  documentBullets?: { labels: Set<string>; heading: string };
}

// Content-ownership model (#1283): the center column owns narrative prose,
// the right rail owns compact label/value reference. Every lore section not
// claimed by a rule's railSections (including unrecognised AI-invented
// headings) moves into the main document. Generators without a rule keep
// their lore in the rail untouched. Rules are matched in order, so more
// specific labels come first.
const LAYOUT_RULES: LayoutRule[] = [
  {
    label: "vampire-clan",
    railSections: new Set(["GM Reference Information"]),
  },
  {
    label: "faction-generator",
    railSections: new Set(["At the Table", "Notable NPCs", "Rival Faction"]),
    documentBullets: {
      labels: new Set(["Secret", "Immediate Hook"]),
      heading: "Secrets & Hooks",
    },
  },
  {
    label: "quest-generator",
    railSections: new Set(["Core Fields", "Key NPC"]),
  },
  {
    label: "rpg-item",
    railSections: new Set(["GM Reference Information", "Magical Properties"]),
  },
  {
    label: "npc-generator",
    railSections: new Set(["At a Glance"]),
    documentBullets: {
      labels: new Set(["Secret", "Immediate Hook"]),
      heading: "Secrets & Hooks",
    },
  },
  {
    label: "kingdom-generator",
    railSections: new Set([
      "At a Glance",
      "Major Factions",
      "Rumours & Hooks",
      "Entity Seeds",
    ]),
    documentBullets: {
      labels: new Set(["Hidden Problem", "Immediate Hook"]),
      heading: "Secrets & Hooks",
    },
  },
  {
    label: "nation-generator",
    railSections: new Set([
      "At a Glance",
      "Power Blocs",
      "Rumours & Hooks",
      "Entity Seeds",
    ]),
    documentBullets: {
      labels: new Set(["Hidden Problem", "Immediate Hook"]),
      heading: "Secrets & Hooks",
    },
  },
  {
    label: "social-hub-generator",
    railSections: new Set([
      "At a Glance",
      "Notable Regulars",
      "Rumours",
      "Entity Seeds",
    ]),
    documentBullets: {
      labels: new Set(["Hidden Problem", "Immediate Hook"]),
      heading: "Secrets & Hooks",
    },
  },
  {
    label: "tavern-generator",
    railSections: new Set([
      "At a Glance",
      "Notable Patrons",
      "Rumours",
      "Entity Seeds",
    ]),
    documentBullets: {
      labels: new Set(["Hidden Problem", "Immediate Hook"]),
      heading: "Secrets & Hooks",
    },
  },
  {
    label: "deity-generator",
    railSections: new Set(["At a Glance", "Rituals & Taboos"]),
    documentBullets: {
      labels: new Set(["Secret", "Immediate Hook"]),
      heading: "Secrets & Hooks",
    },
  },
  {
    label: "pantheon-generator",
    railSections: new Set([
      "At a Glance",
      "Deities of the Pantheon",
      "Entity Seeds",
    ]),
    documentBullets: {
      labels: new Set(["Hidden Problem", "Immediate Hook"]),
      heading: "Secrets & Hooks",
    },
  },
  {
    label: "rpg-location",
    railSections: new Set([
      "GM Reference Information",
      "Points of Interest",
      "Controlling Factions",
    ]),
  },
];

interface MarkdownSection {
  heading: string;
  body: string;
}

function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const normalized = markdown.trim();
  if (!normalized) return [];

  const matches = Array.from(normalized.matchAll(/^###\s+(.+)$/gm));
  if (matches.length === 0) {
    return [];
  }

  const sections: MarkdownSection[] = [];

  const preamble = normalized.slice(0, matches[0].index ?? 0).trim();
  if (preamble) {
    sections.push({ heading: "", body: preamble });
  }

  return sections.concat(
    matches.map((match, index) => {
      const heading = match[1]?.trim() ?? "";
      const start = match.index ?? 0;
      const end =
        index + 1 < matches.length
          ? (matches[index + 1].index ?? normalized.length)
          : normalized.length;

      return {
        heading,
        body: normalized.slice(start, end).trim(),
      };
    }),
  );
}

function extractBullets(body: string, labels: Set<string>) {
  const kept: string[] = [];
  const moved: string[] = [];

  for (const line of body.split("\n")) {
    const match = line.match(/^-\s+\*\*(.+?)\*\*/);
    if (match && labels.has(match[1].trim())) {
      moved.push(line.trim());
    } else {
      kept.push(line);
    }
  }

  return { kept: kept.join("\n").trim(), moved };
}

export function getGeneratorDocumentLayout(
  generatedData: GeneratorOutput | null,
) {
  if (!generatedData) {
    return { content: "", lore: "" };
  }

  const labels = Array.isArray(generatedData.labels)
    ? generatedData.labels
    : [];

  const rule = LAYOUT_RULES.find((r) => labels.includes(r.label));
  if (!rule) {
    return {
      content: generatedData.content || "",
      lore: generatedData.lore || "",
    };
  }

  const loreSections = splitMarkdownSections(generatedData.lore || "");
  if (loreSections.length === 0) {
    return {
      content: generatedData.content || "",
      lore: generatedData.lore || "",
    };
  }

  const mainDocumentSections: string[] = [];
  const railSections: string[] = [];
  const liftedBullets: string[] = [];

  for (const section of loreSections) {
    if (!rule.railSections.has(section.heading)) {
      mainDocumentSections.push(section.body);
      continue;
    }

    if (rule.documentBullets) {
      const { kept, moved } = extractBullets(
        section.body,
        rule.documentBullets.labels,
      );
      liftedBullets.push(...moved);
      if (kept) railSections.push(kept);
    } else {
      railSections.push(section.body);
    }
  }

  if (liftedBullets.length > 0 && rule.documentBullets) {
    mainDocumentSections.push(
      `### ${rule.documentBullets.heading}\n${liftedBullets.join("\n")}`,
    );
  }

  return {
    content: [generatedData.content, ...mainDocumentSections]
      .filter(Boolean)
      .join("\n\n")
      .trim(),
    lore: railSections.join("\n\n").trim(),
  };
}
