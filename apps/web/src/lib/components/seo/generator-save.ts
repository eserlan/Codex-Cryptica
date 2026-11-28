import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import { isPublishedBfrdDoomGuidance } from "generator-engine/tov-mechanics-parser";
import {
  type TovMagicItemMechanics,
  type TovEncounterMechanics,
} from "generator-engine/tov-mechanics-schema";
import type {
  ProvenanceRecord,
  SessionEntity,
} from "generator-engine/session-hub-helpers";
import {
  deduplicateMarkdownSections,
  getGeneratorHandoffLayout,
  usesSourceHandoff,
} from "./generator-document-layout";

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

export class InvalidGeneratorOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGeneratorOutputError";
  }
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

function formatEncounterDoomLine(encounter: TovEncounterMechanics): string {
  const doomText = stripMarkdownImages(encounter.doomNotes ?? "");
  const isHomebrewDoom =
    encounter.isHomebrew || !isPublishedBfrdDoomGuidance(doomText);
  const homebrewTag =
    isHomebrewDoom && !/\bhomebrew\b/i.test(doomText) ? " *(Homebrew)*" : "";
  return `- **Doom Guidance:** ${doomText}${homebrewTag}`;
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
    parts.push(formatEncounterDoomLine(encounter));
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

function usesPrivateBodyAndLore(generatorType?: string) {
  return generatorType === "heist" || usesSourceHandoff(generatorType);
}

function resolveSaveBodyAndLore(
  data: GeneratorOutput,
  layout: GeneratorSaveLayout,
  generatorType?: string,
): { content: string; lore: string } {
  const summaryPrefix = data.summary ? `*${data.summary}*` : "";
  if (usesPrivateBodyAndLore(generatorType)) {
    return {
      content: [summaryPrefix, layout.content].filter(Boolean).join("\n\n"),
      lore: layout.lore,
    };
  }

  if (data.kind === "adventure" || data.labels.includes("adventure")) {
    return {
      content: summaryPrefix,
      lore: [data.content, data.lore].filter(Boolean).join("\n\n"),
    };
  }

  const isEncounter =
    data.labels.includes("encounter") ||
    data.labels.includes("encounter-generator");
  const seenHeadings = new Set<string>();
  const body = isEncounter
    ? deduplicateMarkdownSections(data.content, seenHeadings)
    : layout.content;
  const content = [summaryPrefix, body].filter(Boolean).join("\n\n");
  const lore = isEncounter
    ? data.lore
      ? deduplicateMarkdownSections(data.lore, seenHeadings)
      : layout.lore
    : layout.lore;
  return { content, lore };
}

/** Single Deity mode has the same GM-reference boundary on both routes. */
function singleDeitySaveLayout(
  data: GeneratorOutput,
  layout: GeneratorSaveLayout,
  generatorType?: string,
): GeneratorSaveLayout {
  if (
    data.type !== "character" ||
    (generatorType !== "god-generator" &&
      generatorType !== "pantheon-generator")
  ) {
    return layout;
  }

  const requiredSections = [
    "Deity Description",
    "Divine Portfolio",
    "Worship & Cults",
  ];
  const missingSections = requiredSections.filter(
    (section) => !new RegExp(`^### ${section}\\s*$`, "m").test(data.content),
  );
  if (missingSections.length > 0) {
    throw new InvalidGeneratorOutputError(
      `This deity draft is missing required public sections (${missingSections.join(", ")}). Generate it again or copy the draft manually.`,
    );
  }

  return { content: data.content, lore: data.lore ?? "" };
}

/** The preview's reading layout is not always the vault's secrecy boundary. */
function vaultSaveLayout(
  data: GeneratorOutput,
  layout: GeneratorSaveLayout,
  generatorType?: string,
): GeneratorSaveLayout {
  return generatorType === "quest"
    ? { content: data.content, lore: data.lore ?? "" }
    : getGeneratorHandoffLayout(
        data,
        singleDeitySaveLayout(data, layout, generatorType),
        generatorType,
      );
}

export function buildGeneratorSavePayload(
  data: GeneratorOutput,
  layout: GeneratorSaveLayout,
  mapImageDataUrl?: string,
  generatorType?: string,
): GeneratorSavePayload {
  const isAdventure =
    !usesPrivateBodyAndLore(generatorType) &&
    (data.kind === "adventure" || data.labels.includes("adventure"));
  const { content, lore: initialLore } = resolveSaveBodyAndLore(
    data,
    vaultSaveLayout(data, layout, generatorType),
    generatorType,
  );
  let lore = initialLore;

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
