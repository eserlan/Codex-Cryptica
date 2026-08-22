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
    label: "nomad-clan",
    railSections: new Set(["Clan Profile", "Notable Members", "Rival Faction"]),
    documentBullets: {
      labels: new Set(["Secret", "Immediate Hook"]),
      heading: "Secrets & Hooks",
    },
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
    label: "minor-magic-item",
    railSections: new Set(["Quick Reference"]),
  },
  {
    label: "artifact",
    railSections: new Set(["Quick Reference"]),
  },
  {
    label: "npc-generator",
    railSections: new Set(["At a Glance", "Personality"]),
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
  {
    label: "world",
    railSections: new Set([
      "History",
      "Current Conflicts",
      "Mysteries",
      "Adventure Hooks",
    ]),
  },
  {
    label: "star-system",
    railSections: new Set([
      "History",
      "System-Wide Conflict or Mystery",
      "Adventure Hooks",
    ]),
  },
  {
    label: "bbeg-generator",
    // Lieutenants & Inner Circle and The Villain's Plan are each a full
    // narrative payoff (per-lieutenant paragraphs, per-stage breakdowns) —
    // deliberately NOT in the rail, mirroring council-vote's Council Members
    // exclusion. Only genuinely compact lookup sections stay in the rail.
    railSections: new Set([
      "Discovery Layers",
      "Weakness / Vulnerability",
      "Territory / Lair",
    ]),
  },
  {
    label: "council-vote",
    // Council Members is deliberately NOT in the rail: each entry is a full
    // paragraph (public position, true agenda, persuasion angle, secret),
    // not a compact bullet — it's the generator's narrative payoff, not a
    // quick-lookup reference, so it belongs in the main column.
    railSections: new Set([
      "Voting Procedure",
      "Current Vote Estimate",
      "Antagonist Influence",
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

  // ⚡ Bolt Optimization: Replace Array.from(matchAll).map() with an imperative iterator loop
  // to avoid intermediate array allocations, reducing GC pressure for large documents.
  const iterator = normalized.matchAll(/^#{2,3}\s+(.+)$/gm);
  const sections: MarkdownSection[] = [];
  let prevMatch: RegExpExecArray | null = null;

  for (const match of iterator) {
    if (!prevMatch) {
      const preamble = normalized.slice(0, match.index ?? 0).trim();
      if (preamble) {
        sections.push({ heading: "", body: preamble });
      }
    } else {
      const heading = prevMatch[1]?.trim() ?? "";
      const start = prevMatch.index ?? 0;
      const end = match.index ?? normalized.length;
      sections.push({ heading, body: normalized.slice(start, end).trim() });
    }
    prevMatch = match;
  }

  if (prevMatch) {
    const heading = prevMatch[1]?.trim() ?? "";
    const start = prevMatch.index ?? 0;
    sections.push({ heading, body: normalized.slice(start).trim() });
  }

  return sections;
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
