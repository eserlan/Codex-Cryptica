import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { ProvenanceRecord, SessionEntity } from "generator-engine";

import type {
  TovMagicItemMechanics,
  TovEncounterMechanics,
} from "generator-engine";

export interface GeneratorSaveLayout {
  content: string;
  lore: string;
}

export interface GeneratorSavePayload {
  type: GeneratorOutput["type"];
  kind?: string;
  title: string;
  content: string;
  lore: string;
  labels: string[];
  status: GeneratorOutput["status"];
  systemId?: string;
  mapImageDataUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface HubSaveDraft {
  type: SessionEntity["type"];
  kind?: SessionEntity["kind"];
  title: string;
  content: string;
  lore?: string;
  labels: string[];
  status: SessionEntity["status"];
  references?: string[];
}

function formatTovMagicItemMarkdown(item: TovMagicItemMechanics): string {
  const parts: string[] = ["### Game Statistics (Tales of the Valiant)"];
  parts.push(`- **Rarity & Category:** ${item.rarity} ${item.category}`);
  parts.push(
    `- **Attunement:** ${item.attunement ? (item.attunementRequirement ? `Requires attunement (${stripMarkdownImages(item.attunementRequirement)})` : "Requires attunement") : "No"}`,
  );
  parts.push(`- **Activation:** ${item.activationAction}`);
  if (item.charges) {
    parts.push(
      `- **Charges:** ${item.charges} ${item.rechargeRate ? `(${stripMarkdownImages(item.rechargeRate)})` : ""}`.trim(),
    );
  }
  if (item.savingThrowDc) {
    parts.push(`- **Saving Throw DC:** ${item.savingThrowDc}`);
  }
  if (item.rulesText) {
    parts.push(`\n${stripMarkdownImages(item.rulesText)}`);
  }
  return parts.join("\n");
}

function formatTovEncounterMarkdown(encounter: TovEncounterMechanics): string {
  const parts: string[] = [
    "### Game Mechanics & Challenge Guidance (Tales of the Valiant)",
  ];
  parts.push(
    `- **Challenge Assessment:** ${stripMarkdownImages(encounter.qualitativeDifficulty)}`,
  );
  parts.push(
    `- **Recommended CR Distribution:** ${stripMarkdownImages(encounter.recommendedCrRange)}`,
  );
  if (encounter.suggestedCreatures?.length) {
    parts.push("- **Suggested Participants:**");
    for (const c of encounter.suggestedCreatures) {
      const homebrewTag = c.isHomebrew ? " *(Homebrew)*" : "";
      parts.push(
        `  - ${c.count}x ${stripMarkdownImages(c.name)} (CR ${c.cr}, ${stripMarkdownImages(c.role)})${homebrewTag}`,
      );
    }
  }
  if (encounter.tacticalAdvice) {
    parts.push(
      `- **Tactical Guidance:** ${stripMarkdownImages(encounter.tacticalAdvice)}`,
    );
  }
  if (encounter.doomNotes) {
    parts.push(
      `- **Doom Guidance:** ${stripMarkdownImages(encounter.doomNotes)}`,
    );
  }
  return parts.join("\n");
}

/** Keep untrusted rules text from persisting Markdown or HTML image requests. */
function stripMarkdownImages(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<img\b[^>]*>/gi, "");
}

/** Build the vault payload while keeping adventure-specific layout rules out of the page. */
function resolveMechanicsSaveExtension(
  mechanics: GeneratorOutput["mechanics"],
): {
  markdown?: string;
  metadata?: Record<string, unknown>;
} {
  if (!mechanics) return {};

  if (mechanics.kind === "tov-magic-item") {
    return {
      markdown: formatTovMagicItemMarkdown(mechanics.data),
      metadata: { tovMechanics: mechanics.data },
    };
  }

  if (mechanics.kind === "tov-encounter") {
    return {
      markdown: formatTovEncounterMarkdown(mechanics.data),
      metadata: { tovMechanics: mechanics.data },
    };
  }

  return {};
}

export function buildGeneratorSavePayload(
  data: GeneratorOutput,
  layout: GeneratorSaveLayout,
  mapImageDataUrl?: string,
): GeneratorSavePayload {
  const isAdventure =
    data.kind === "adventure" || data.labels.includes("adventure");
  const content = isAdventure
    ? data.summary
      ? `*${data.summary}*`
      : ""
    : data.summary
      ? `*${data.summary}*\n\n${layout.content}`
      : layout.content;
  let lore = isAdventure
    ? [data.content, data.lore].filter(Boolean).join("\n\n")
    : layout.lore;

  const { markdown, metadata } = resolveMechanicsSaveExtension(data.mechanics);
  if (markdown) {
    lore = lore ? `${lore}\n\n${markdown}` : markdown;
  }

  return {
    type: isAdventure ? "note" : data.type,
    kind: data.kind,
    title: data.title,
    content,
    lore,
    labels: data.labels,
    status: data.status,
    systemId: data.systemId ?? data.mechanics?.systemId,
    ...(mapImageDataUrl ? { mapImageDataUrl } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

/** Resolve session-hub provenance into the references accepted by vault import. */
export function buildHubSaveDrafts(
  entities: SessionEntity[],
  provenance: Record<string, ProvenanceRecord>,
  allEntities: SessionEntity[] = entities,
): HubSaveDraft[] {
  return entities.map((entity) => {
    const record = provenance[entity.id];
    const references = record?.usedEntityIds
      .map((id) => allEntities.find((candidate) => candidate.id === id)?.title)
      .filter((title): title is string => Boolean(title));

    return {
      type: entity.type,
      kind: entity.kind,
      title: entity.title,
      content: entity.content,
      lore: entity.lore,
      labels: entity.labels,
      status: entity.status,
      ...(record && record.usedEntityIds.length > 0 ? { references } : {}),
    };
  });
}
