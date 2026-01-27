import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { searchService } from "./search";
import { vault } from "../stores/vault.svelte";

const MODEL_NAME = "gemini-3-flash-preview";

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private currentApiKey: string | null = null;

  init(apiKey: string) {
    if (this.genAI && this.model && this.currentApiKey === apiKey) return;

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: `You are the Lore Oracle, a wise and creative keeper of the user's personal world records. 
Your primary goal is to provide information from the provided context or conversation history. 

If the user asks you to expand, describe, or fill in the blanks, you should feel free to "weave new threads"—inventing details that are stylistically and logically consistent with the existing lore. 

When providing information, consider two formats:
1. Chronicle / Blurb: A short, focused 2-3 sentence summary.
2. Lore / Notes: An expansive, detailed deep-dive including "hooks", secrets, and background fluff.

Only if you have NO information about the subject in either the new context blocks OR the previous messages, and you aren't asked to invent it, say "I cannot find that in your records." 

Always prioritize the vault context as the absolute truth.`
    });
    this.currentApiKey = apiKey;
  }

  async generateResponse(apiKey: string, query: string, history: any[], context: string, onUpdate: (partial: string) => void) {
    this.init(apiKey);
    if (!this.model) throw new Error("AI Model not initialized");

    // Create a new session with current history
    const chat = this.model.startChat({
      history: history.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }))
    });

    try {
      const finalQuery = context
        ? `[NEW LORE CONTEXT]\n${context}\n\n[USER QUERY]\n${query}`
        : query;

      const result = await chat.sendMessageStream(finalQuery);

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

  async retrieveContext(query: string, excludeTitles: Set<string>): Promise<{ content: string, primaryEntityId?: string }> {
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
    const potentialIds = Array.from(new Set(results.map(r => r.id)));
    if (activeId && !potentialIds.includes(activeId)) potentialIds.unshift(activeId);

    const primaryEntityId = activeId || potentialIds[0];

    // 4. Filter for NEW titles only
    const contents = potentialIds
      .map(id => {
        const entity = vault.entities[id];
        if (!entity) return null;

        // Skip if this title was already sent in the history
        if (excludeTitles.has(entity.title)) return null;

        const mainContent = entity.content?.trim() || entity.lore?.trim();
        if (!mainContent) return null;

        const isActive = id === activeId;
        const prefix = isActive ? "[ACTIVE FILE] " : "";
        const truncated = mainContent.slice(0, 10000);

        return `--- ${prefix}File: ${entity.title} ---\n${truncated}`;
      })
      .filter((c): c is string => c !== null);

    // 5. Last resort: If we have NO lore context yet in this whole conversation, provide titles
    if (contents.length === 0 && excludeTitles.size === 0) {
      const allTitles = Object.values(vault.entities).map(e => e.title).join(", ");
      if (allTitles) {
        contents.push(`--- Available Records ---\nYou have records on the following subjects: ${allTitles}. None specifically matched, but they are available.`);
      }
    }

    return {
      content: contents.join("\n\n"),
      primaryEntityId
    };
  }
}

export const aiService = new AIService();