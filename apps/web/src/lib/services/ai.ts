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

    const context = await this.retrieveContext(query);
    const systemPrompt = `You are the Lore Oracle, an expert on the user's personal world. 
    Answer the question based ONLY on the provided context. 
    If the answer is not in the context, say "I cannot find that in your records."
    
    Context:
    ${context}
    `;

    try {
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
    } catch (err) {
        console.error("Gemini API Error:", err);
        throw err;
    }
  }

  private async retrieveContext(query: string): Promise<string> {
    // Search for relevant files
    const results = await searchService.search(query, { limit: 5 });
    
    // Fetch content from VaultStore
    const contents = results
        .map(result => {
            const entity = vault.entities[result.id];
            if (!entity || !entity.content) return null;
            
            // Limit content per file to ~10k characters to prevent prompt bloat
            // while still providing significant context.
            const truncated = entity.content.slice(0, 10000);
            
            return `--- File: ${entity.title} ---\n${truncated}`;
        })
        .filter((c): c is string => c !== null);

    return contents.join("\n\n");
  }
}

export const aiService = new AIService();