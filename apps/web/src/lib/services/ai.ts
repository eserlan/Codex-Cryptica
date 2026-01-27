import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { searchService } from "./search";
import { vault } from "../stores/vault.svelte";

const MODEL_NAME = "gemini-1.5-flash";

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
      const systemPrompt = `You are the Lore Oracle, an expert on the user's personal world. 
Answer the question based ONLY on the provided context if possible. 
If the answer is not in the context, but is a general greeting or unrelated to lore, respond politely as the Oracle.
If it's about lore and not in context, say "I cannot find that in your records."

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
    const results = await searchService.search(query, { limit: 5 });

    // 2. Identify the active entity to prioritize it
    const activeId = vault.selectedEntityId;

    // 3. Build context from both search results and active entity
    const contextIds = new Set(results.map(r => r.id));
    if (activeId) contextIds.add(activeId);

    const contents = Array.from(contextIds)
      .map(id => {
        const entity = vault.entities[id];
        if (!entity || !entity.content) return null;

        // Mark the active file clearly for the AI
        const isActive = id === activeId;
        const prefix = isActive ? "[ACTIVE FILE] " : "";

        // Limit content per file to ~10k characters
        const truncated = entity.content.slice(0, 10000);

        return `--- ${prefix}File: ${entity.title} ---\n${truncated}`;
      })
      .filter((c): c is string => c !== null);

    return contents.join("\n\n");
  }
}

export const aiService = new AIService();