import type { EntityType } from "schema";
import type { ChatMessage, DiscoveryProposal } from "./types";

export interface DiscoveryContext {
  existingEntities: any[]; // Simplified for engine logic
  history: ChatMessage[];
}

export class DraftingEngine {
  /**
   * Proposes entities based on text content and context.
   * Matches markers like **Valerius** as **NPC** or **The Azure Wastes** as **Location**.
   */
  async propose(
    text: string,
    context: DiscoveryContext,
  ): Promise<DiscoveryProposal[]> {
    const proposalsMap = new Map<string, DiscoveryProposal>();

    // Regex to find **Name** as **Type** or just **Name** followed by descriptive text
    const markerRegex = /\*\*([^*]+)\*\*(?:\s+as\s+\*\*([^*]+)\*\*)?/g;
    let match;

    while ((match = markerRegex.exec(text)) !== null) {
      const name = match[1].trim();
      const rawType = match[2]?.toLowerCase().trim();

      if (this.shouldSuppressCandidate(name)) {
        continue;
      }

      // Extract excerpt/lore around the mention
      const lore = this.extractLore(text, match.index, name);
      if (this.shouldSuppressCandidate(name, lore)) {
        continue;
      }

      const chronicle = this.extractChronicle(lore);
      const existing = this.findExistingEntity(name, context.existingEntities);
      const type = this.resolveType(rawType, existing, name, lore);
      const identityKey = existing?.id || `new:${name.toLowerCase()}`;

      const existingProposal = proposalsMap.get(identityKey);
      if (existingProposal) {
        // Merge lore if multiple mentions
        if (!existingProposal.draft.lore.includes(lore)) {
          existingProposal.draft.lore += "\n\n" + lore;
        }
      } else {
        proposalsMap.set(identityKey, {
          entityId: existing?.id,
          title: name,
          type: type,
          draft: {
            lore,
            chronicle,
          },
          confidence: existing ? 0.95 : 0.8,
        });
      }
    }

    return Array.from(proposalsMap.values());
  }

  private normalizeType(rawType: string): string {
    const validTypes = [
      "character",
      "npc",
      "faction",
      "location",
      "item",
      "event",
      "concept",
    ];
    if (validTypes.includes(rawType)) return rawType;
    if (rawType === "person") return "character";
    if (rawType === "place") return "location";
    return "concept";
  }

  private shouldSuppressCandidate(name: string, lore = ""): boolean {
    const normalizedName = this.normalizeLookupValue(name);
    const suppressedNames = new Set([
      "name",
      "type",
      "chronicle",
      "lore",
      "content",
      "summary",
      "description",
    ]);

    if (suppressedNames.has(normalizedName)) {
      return true;
    }

    const normalizedLore = this.normalizeLookupValue(lore);
    const structuredFieldPattern =
      /\bname\b.*\btype\b.*\bchronicle\b.*\blore\b/;

    return structuredFieldPattern.test(normalizedLore);
  }

  private resolveType(
    rawType: string | undefined,
    existing: any,
    name: string,
    lore: string,
  ): EntityType {
    if (rawType) {
      return this.normalizeType(rawType) as EntityType;
    }

    if (existing?.type) {
      return this.normalizeType(
        String(existing.type).toLowerCase(),
      ) as EntityType;
    }

    return this.inferType(name, lore);
  }

  private inferType(name: string, lore: string): EntityType {
    const normalizedName = name.trim();
    const nameWords = normalizedName
      .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
    const canonicalNameWords = nameWords.filter(
      (word) => !["the", "a", "an"].includes(word.toLowerCase()),
    );
    const lowerName = normalizedName.toLowerCase();
    const focusedLore = this.extractMentionSentence(lore, normalizedName);
    const lowerLore = focusedLore.toLowerCase();
    const combined = `${lowerName} ${lowerLore}`;

    const eventTerms = [
      "war",
      "battle",
      "siege",
      "festival",
      "cataclysm",
      "coronation",
      "rebellion",
      "crusade",
      "uprising",
      "sundering",
      "spellplague",
    ];
    const factionTerms = [
      "order",
      "legion",
      "guild",
      "council",
      "enclave",
      "enclaves",
      "wizards",
      "knights",
      "priests",
      "cult",
      "tribe",
      "clan",
      "house",
      "army",
      "host",
      "brotherhood",
      "resurrection",
      "imperialists",
      "researchers",
    ];
    if (
      factionTerms.some((term) => lowerName.includes(term)) ||
      /\b(faction|followers|loyalists|members|forces|ranks)\b/.test(lowerLore)
    ) {
      return "faction";
    }

    const characterTitleTerms = [
      "lord",
      "lady",
      "king",
      "queen",
      "prince",
      "princess",
      "duke",
      "duchess",
      "lich",
      "wizard",
      "alchemist",
      "captain",
      "regent",
      "emperor",
      "priest",
      "scholar",
      "witch",
      "sage",
    ];
    const hasStrongNonCharacterNoun =
      factionTerms.some((term) => lowerName.includes(term)) ||
      [
        "mount",
        "mountain",
        "tower",
        "citadel",
        "keep",
        "forest",
        "woods",
        "wastes",
        "sea",
        "lake",
        "river",
        "vale",
        "kingdom",
        "realm",
        "city",
        "village",
        "isle",
        "island",
        "plateau",
        "throne",
        "thaymount",
        "sword",
        "staff",
        "crown",
        "blade",
        "ring",
        "amulet",
        "artifact",
        "relic",
        "orb",
        "tome",
        "banner",
        "shield",
        "helm",
        "chalice",
      ].some((term) => lowerName.includes(term));
    const looksLikePersonName =
      canonicalNameWords.length >= 2 &&
      canonicalNameWords.length <= 3 &&
      canonicalNameWords.every((word) => /^[A-Z][\p{L}'-]*$/u.test(word)) &&
      !hasStrongNonCharacterNoun;
    if (
      looksLikePersonName ||
      characterTitleTerms.some((term) => lowerName.includes(term)) ||
      /\b(he|she|they|who|whose)\b/.test(lowerLore)
    ) {
      return "npc";
    }

    if (eventTerms.some((term) => combined.includes(term))) {
      return "event";
    }

    const locationTerms = [
      "mount",
      "mountain",
      "tower",
      "citadel",
      "keep",
      "forest",
      "woods",
      "wastes",
      "sea",
      "lake",
      "river",
      "vale",
      "kingdom",
      "realm",
      "city",
      "village",
      "isle",
      "island",
      "plateau",
      "throne",
      "thaymount",
    ];
    if (
      locationTerms.some((term) => lowerName.includes(term)) ||
      /\b(in|at|from|within|across|north of|south of|east of|west of)\b/.test(
        lowerLore,
      )
    ) {
      return "location";
    }

    const itemTerms = [
      "sword",
      "staff",
      "crown",
      "blade",
      "ring",
      "amulet",
      "artifact",
      "relic",
      "orb",
      "tome",
      "banner",
      "shield",
      "helm",
      "chalice",
    ];
    if (
      itemTerms.some((term) => lowerName.includes(term)) ||
      /\b(wielded|carried|artifact|relic|conduit)\b/.test(lowerLore)
    ) {
      return "item";
    }

    return "concept";
  }

  private extractMentionSentence(lore: string, name: string): string {
    const sentences = lore
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const normalizedName = this.normalizeLookupValue(name);

    const matchingSentence = sentences.find((sentence) =>
      this.normalizeLookupValue(sentence).includes(normalizedName),
    );

    return matchingSentence || lore;
  }

  private findExistingEntity(name: string, entities: any[]): any | null {
    const normalizedName = this.normalizeLookupValue(name);
    const exact = entities.find(
      (e) => this.normalizeLookupValue(e.title) === normalizedName,
    );
    if (exact) return exact;

    const fuzzy = entities.find(
      (e) =>
        this.normalizeLookupValue(e.title).includes(normalizedName) ||
        normalizedName.includes(this.normalizeLookupValue(e.title)),
    );

    return fuzzy || null;
  }

  private normalizeLookupValue(value: string): string {
    return value
      .toLowerCase()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
      .replace(/\b(the|a|an)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  private extractLore(text: string, index: number, name: string): string {
    // In a real implementation, this might use more context or AI.
    // For now, take the paragraph containing the mention.
    const paragraphs = text.split(/\n\n+/);
    const targetParagraph = paragraphs.find((p) => p.includes(`**${name}**`));
    return targetParagraph || text.slice(Math.max(0, index - 100), index + 300);
  }

  private extractChronicle(lore: string): string {
    const firstSentence = lore.split(/[.!?\n]/)[0];
    return firstSentence.length > 100
      ? firstSentence.slice(0, 97) + "..."
      : firstSentence;
  }
}

export const draftingEngine = new DraftingEngine();
