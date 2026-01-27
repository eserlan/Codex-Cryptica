import { GoogleGenerativeAI, type GenerativeModel, type ChatSession } from "@google/generative-ai";
import { searchService } from "./search";
import { vault } from "../stores/vault.svelte";

const MODEL_NAME = "gemini-3-flash-preview";

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private currentApiKey: string | null = null;
  private chatSession: ChatSession | null = null;
  private sentEntityIds = new Set<string>();

  init(apiKey: string) {
    if (this.genAI && this.model && this.currentApiKey === apiKey) return;

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: `You are the Lore Oracle, a wise and creative keeper of the user's personal world records. 
Your primary goal is to provide information from the provided context. 
However, if the user asks you to expand, describe, or fill in the blanks, you should feel free to "weave new threads"—inventing details that are stylistically and logically consistent with the existing lore. 
Always prioritize the vault context as the absolute truth, but act as a creative collaborator when invited to build upon it. 
If information is completely missing and you aren't asked to invent it, say "I cannot find that in your records."`
    });
    this.currentApiKey = apiKey;
    this.chatSession = null; // Reset session on re-init
  }

  async generateResponse(apiKey: string, query: string, history: any[], onUpdate: (partial: string) => void) {
    this.init(apiKey);
    if (!this.model) throw new Error("AI Model not initialized");

    // Reset session if history is empty
    if (history.length === 0 || !this.chatSession) {
      this.chatSession = this.model.startChat({
        history: history.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }))
      });
      this.sentEntityIds.clear();
    }

    try {
      const { content: context, ids: newIds } = await this.retrieveContext(query, this.sentEntityIds);

      // Add newly sent entities to our tracking set
      newIds.forEach(id => this.sentEntityIds.add(id));

      const finalQuery = context
        ? `[NEW LORE CONTEXT]\n${context}\n\n[USER QUERY]\n${query}`
        : query;

      const result = await this.chatSession.sendMessageStream(finalQuery);

      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        onUpdate(fullText);
      }
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      if (err.message?.includes("429")) {
        throw new Error("API rate limit exceeded. Please wait a moment.");
      }
      throw new Error(`Lore Oracle Error: ${err.message || "Unknown error"}`);
    }
  }

  private async retrieveContext(query: string, excludeIds: Set<string>): Promise<{ content: string; ids: string[] }> {
    // 1. Get search results for relevance
    let results = await searchService.search(query, { limit: 5 });

    // 1b. Fallback 1: if no results, try extracting keywords
    if (results.length === 0) {
      const keywords = query
        .toLowerCase()
        .replace(/[^\w\s']/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'was', 'for', 'who', 'how', 'did', 'his', 'her', 'they', 'with', 'from'].includes(w));

      if (keywords.length > 0) {
        results = await searchService.search(keywords.join(' '), { limit: 5 });
      }
    }

    // 2. Identify the active entity to prioritize it
    const activeId = vault.selectedEntityId;

    // 3. Build context from both search results and active entity
    const potentialIds = new Set(results.map(r => r.id));
    if (activeId) potentialIds.add(activeId);

    // 4. Filter for NEW IDs only
    const newIds: string[] = [];
    const contents = Array.from(potentialIds)
      .map(id => {
        if (excludeIds.has(id)) return null; // Skip already sent

        const entity = vault.entities[id];
        if (!entity) return null;

        const mainContent = entity.content?.trim() || entity.lore?.trim();
        if (!mainContent) return null;

        newIds.push(id);
        const isActive = id === activeId;
        const prefix = isActive ? "[ACTIVE FILE] " : "";
        const truncated = mainContent.slice(0, 10000);

        return `--- ${prefix}File: ${entity.title} ---\n${truncated}`;
      })
      .filter((c): c is string => c !== null);

    // 5. Fallback: If we still have NO lore context at all for this turn, provide titles if nothing ever sent
    if (contents.length === 0 && excludeIds.size === 0) {
      const allTitles = Object.values(vault.entities).map(e => e.title).join(", ");
      if (allTitles) {
        contents.push(`--- Available Records ---\nYou have records on the following subjects: ${allTitles}. None specifically matched, but they are available.`);
      }
    }

    return {
      content: contents.join("\n\n"),
      ids: newIds
    };
  }
}

export const aiService = new AIService();