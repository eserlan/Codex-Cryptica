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
    const proposals: DiscoveryProposal[] = [];

    // Regex to find **Name** as **Type** or just **Name** followed by descriptive text
    // This is a simplified version of the proactive extraction logic.
    const markerRegex = /\*\*([^*]+)\*\*(?:\s+as\s+\*\*([^*]+)\*\*)?/g;
    let match;

    while ((match = markerRegex.exec(text)) !== null) {
      const name = match[1].trim();
      const rawType = (match[2] || "concept").toLowerCase().trim();

      // Normalize type
      const type = this.normalizeType(rawType);

      // Look for existing entity
      const existing = this.findExistingEntity(name, context.existingEntities);

      // Extract excerpt/lore around the mention (simple heuristic)
      const lore = this.extractLore(text, match.index, name);
      const chronicle = this.extractChronicle(lore);

      proposals.push({
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

    return proposals;
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

  private findExistingEntity(name: string, entities: any[]): any | null {
    const normalizedName = name.toLowerCase();
    // 1. Exact match
    const exact = entities.find(
      (e) => e.title.toLowerCase() === normalizedName,
    );
    if (exact) return exact;

    // 2. Simple fuzzy (contains)
    const fuzzy = entities.find(
      (e) =>
        e.title.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(e.title.toLowerCase()),
    );

    return fuzzy || null;
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
