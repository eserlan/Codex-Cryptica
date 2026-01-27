import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { searchService } from "./search";
import { vault } from "../stores/vault.svelte";

const MODEL_NAME = "gemini-3-flash";

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private currentApiKey: string | null = null;

  init(apiKey: string) {
    if (this.genAI && this.model && this.currentApiKey === apiKey) return;

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
    this.currentApiKey = apiKey;
  }

  async generateResponse(apiKey: string, query: string, onUpdate: (partial: string) => void) {
    // Re-init if key changed or first time
    this.init(apiKey);

    if (!this.model) throw new Error("AI Model not initialized");

    try {
      const context = await this.retrieveContext(query);
      console.log(`[AIService] Final RAG Context length: ${context.length}`);

      const systemPrompt = `You are the Lore Oracle, an expert on the user's personal world. 
Answer the question based on the provided context. 
If the information is sparse, use what is available to be as helpful as possible.
If the question is a greeting or general, respond politely as the Oracle.
Only if the query is specifically about lore and there is absolutely ZERO relevant information in the context, say "I cannot find that in your records."

Context:
${context}
`;

      const result = await this.model.generateContentStream([
        systemPrompt,
        query
      ]);

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

  private async retrieveContext(query: string): Promise<string> {
    // 1. Get search results for relevance
    let results = await searchService.search(query, { limit: 5 });

    // 1b. Fallback 1: if no results, try extracting keywords
    if (results.length === 0) {
      const keywords = query
        .toLowerCase()
        .replace(/[^\w\s']/g, '') // Keep apostrophes for names/questions
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'was', 'for', 'who', 'how', 'did', 'his', 'her', 'they', 'with', 'from'].includes(w));

      if (keywords.length > 0) {
        results = await searchService.search(keywords.join(' '), { limit: 5 });
      }
    }

    // 2. Identify the active entity to prioritize it
    const activeId = vault.selectedEntityId;

    // 3. Build context from both search results and active entity
    const contextIds = new Set(results.map(r => r.id));
    if (activeId) contextIds.add(activeId);

    const contents = Array.from(contextIds)
      .map(id => {
        const entity = vault.entities[id];
        if (!entity) return null;

        // Use body content, but fallback to lore field if body is empty
        const mainContent = entity.content?.trim() || entity.lore?.trim();
        if (!mainContent) return null;

        const isActive = id === activeId;
        const prefix = isActive ? "[ACTIVE FILE] " : "";
        const truncated = mainContent.slice(0, 10000);

        return `--- ${prefix}File: ${entity.title} ---\n${truncated}`;
      })
      .filter((c): c is string => c !== null);

    // 4. Fallback 2: If we still have almost no context, provide a list of all known entity titles
    if (contents.length === 0 || (contents.length === 1 && !results.length)) {
      const allTitles = Object.values(vault.entities).map(e => e.title).join(", ");
      if (allTitles) {
        contents.push(`--- Available Records ---\nYou have records on the following subjects: ${allTitles}. None of these specifically matched the current query details, but they are the only lore available.`);
      }
    }

    return contents.join("\n\n");
  }
}

export const aiService = new AIService();