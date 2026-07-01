import type { DiscoveredEntity } from "@codex/importer";
import type { CreaturePack } from "./types.js";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function renderBody(
  entry: CreaturePack["entries"][number],
  credits?: string,
): string {
  const variantsList = entry.variants.length
    ? entry.variants.map((v) => `- ${v}`).join("\n")
    : "_None noted._";
  const hooksList = entry.hooks.length
    ? entry.hooks.map((h) => `- ${h}`).join("\n")
    : "_None noted._";

  let body = `## Summary\n\n${entry.description}\n\n`;
  body += `## Habitat\n\n${entry.habitat}\n\n`;
  body += `## Behaviour\n\n${entry.behaviour}\n\n`;
  body += `## Threat Level\n\n${entry.threatLevel}\n\n`;
  body += `## Variants\n\n${variantsList}\n\n`;
  body += `## Story Hooks\n\n${hooksList}\n`;
  if (entry.combatNotes) {
    body += `\n## Combat Notes\n\n${entry.combatNotes}\n`;
  }
  if (credits) {
    body += `\n---\n*Credits: ${credits}*\n`;
  }
  return body;
}

export function packToDiscoveredEntities(
  pack: CreaturePack,
  existingTitles?: Map<string, string>,
): DiscoveredEntity[] {
  return pack.entries.map((entry) => {
    const slug = slugify(entry.title);
    const body = renderBody(entry, pack.credits);
    const matchedEntityId = existingTitles?.get(slug);

    return {
      id: `pack-${pack.id}-${slug}`,
      suggestedTitle: entry.title,
      suggestedType: "Creature",
      chronicle: entry.description,
      lore: body,
      content: body,
      frontmatter: {
        labels: ["creature-pack", entry.category],
        ...(entry.image ? { image: entry.image } : {}),
      },
      confidence: 1,
      suggestedFilename: `${slug}.md`,
      matchedEntityId,
      detectedLinks: [],
    } satisfies DiscoveredEntity;
  });
}
