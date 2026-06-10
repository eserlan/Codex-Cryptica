import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

// Content-ownership model (#1283): the center column owns narrative prose,
// the right rail owns compact label/value reference. Each rule lists the lore
// sections that stay in the rail for one generator family; every other lore
// section (including unrecognised AI-invented headings) moves into the main
// document. Generators without a rule keep their lore in the rail untouched.
// Rules are matched in order, so more specific labels come first.
const LAYOUT_RULES: { label: string; railSections: Set<string> }[] = [
  {
    label: "vampire-clan",
    railSections: new Set(["GM Reference Information"]),
  },
  {
    label: "faction-generator",
    railSections: new Set(["At the Table", "Notable NPCs", "Rival Faction"]),
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
    railSections: new Set(["At a Glance", "Faction Connection"]),
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

  for (const section of loreSections) {
    if (rule.railSections.has(section.heading)) {
      railSections.push(section.body);
    } else {
      mainDocumentSections.push(section.body);
    }
  }

  return {
    content: [generatedData.content, ...mainDocumentSections]
      .filter(Boolean)
      .join("\n\n")
      .trim(),
    lore: railSections.join("\n\n").trim(),
  };
}
