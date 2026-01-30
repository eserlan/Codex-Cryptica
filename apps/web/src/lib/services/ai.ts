import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { searchService } from "./search";
import { vault } from "../stores/vault.svelte";

export const TIER_MODES = {
  lite: "gemini-2.5-flash-lite",
  advanced: "gemini-3-flash-preview",
};

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private currentApiKey: string | null = null;
  private currentModelName: string | null = null;
  private styleCache: string | null = null;

  /**
   * Transforms a conversational query into a standalone search term using the Lite model (FR-004).
   */
  async expandQuery(
    apiKey: string,
    query: string,
    history: any[],
  ): Promise<string> {
    try {
      if (!this.genAI || this.currentApiKey !== apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.currentApiKey = apiKey;
      }

      const liteModel = this.genAI.getGenerativeModel({
        model: TIER_MODES.lite,
      });

      const conversationContext = history
        .slice(-4) // Last 4 messages (2 turns)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

      const prompt = `Given the following conversation history and a new user query, re-write the query into a standalone, descriptive search term that captures the user's intent. 
Focus on resolving pronouns (he, she, it, they, that place) based on the history.
If the query is already standalone, return it as is.

CONVERSATION HISTORY:
${conversationContext}

USER QUERY: ${query}

STANDALONE SEARCH QUERY:`;

      const result = await liteModel.generateContent(prompt);
      const expanded = result.response.text().trim();
      console.log(`[AIService] Expanded query: "${query}" -> "${expanded}"`);
      return expanded;
    } catch (err) {
      console.error("[AIService] Query expansion failed, using original:", err);
      return query;
    }
  }

  /**
   * Concatenates lore and content fields for comprehensive context visibility (FR-006).
   */
  getConsolidatedContext(entity: any): string {
    const parts = [];
    if (entity.lore?.trim()) parts.push(entity.lore.trim());
    if (entity.content?.trim()) parts.push(entity.content.trim());
    return parts.join("\n\n");
  }

  init(apiKey: string, modelName: string) {
    // Re-initialize if key or model has changed
    const currentModelName = (this.model as any)?.modelName;
    const matchesModel =
      currentModelName === modelName ||
      currentModelName === `models/${modelName}`;
    
    if (this.genAI && this.model && this.currentApiKey === apiKey && matchesModel) return;

    console.log(`[AIService] Initializing model: ${modelName}`);
    this.clearStyleCache();
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `You are the Lore Oracle, a wise and creative keeper of the user's personal world records. 
Your primary goal is to provide information from the provided context or conversation history. 

If the user asks you to expand, describe, or fill in the blanks, you should feel free to "weave new threads"—inventing details that are stylistically and logically consistent with the existing lore. 

When providing information, consider two formats:
1. Chronicle / Blurb: A short, focused 2-3 sentence summary. (Default if "blurb", "chronicle", or "short desc" is mentioned)
2. Lore / Notes: An expansive, detailed deep-dive including "hooks", secrets, and background fluff.

Only if you have NO information about the subject in either the new context blocks OR the previous messages, and you aren't asked to invent it, say "I cannot find that in your records." 

If the user asks for a visual, image, portrait, or to see what something looks like, inform them that they can use the "/draw" command to have you visualize it.

      Always prioritize the vault context as the absolute truth.`
    });
    this.currentApiKey = apiKey;
    this.currentModelName = modelName;
  }

  enhancePrompt(query: string, context: string): string {
    if (!context) return query;
    return `You are a world-building artist. 

Use the following context to ground your visualization accurately. 
If a "GLOBAL ART STYLE" is provided, ensure the generated image strictly adheres to that aesthetic style.

${context}

User visualization request: ${query}`;
  }

  async generateImage(apiKey: string, prompt: string): Promise<Blob> {
    // We use gemini-2.5-flash-image (Nano Banana) which is optimized for image generation
    // and available via the standard, CORS-friendly generateContent endpoint.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          // Instruct the model to generate an image
          response_modalities: ["IMAGE"],
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      const message = err.error?.message || response.statusText;
      if (
        message.toLowerCase().includes("safety") ||
        message.toLowerCase().includes("block")
      ) {
        throw new Error(
          "The Oracle cannot visualize this request due to safety policies.",
        );
      }
      throw new Error(`Image Generation Error: ${message}`);
    }

    const data = await response.json();
    // In generateContent multimodal responses, the image is returned in the parts
    const base64Data = data.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData,
    )?.inlineData?.data;

    if (!base64Data) {
      throw new Error("No image data returned from AI");
    }

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: "image/png" });
  }

  async generateResponse(apiKey: string, query: string, history: any[], context: string, modelName: string, onUpdate: (partial: string) => void) {
    this.init(apiKey, modelName);
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

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private findExplicitSubject(query: string): string | undefined {
    const queryLower = query.toLowerCase();
    const entities = Object.values(vault.entities);

    // Find entities whose titles are explicitly mentioned in the query
    // For very short titles (length <= 2), require a word-boundary match to avoid false positives.
    // Sort by title length descending to match "The Forbidden Woods" before "The" or "Woods"
    const matches = entities
      .filter(e => {
        const titleLower = e.title.toLowerCase();
        if (titleLower.length > 2) {
          return queryLower.includes(titleLower);
        }
        const pattern = new RegExp(`\\b${this.escapeRegExp(titleLower)}\\b`);
        return pattern.test(queryLower);
      })
      .sort((a, b) => b.title.length - a.title.length);

    return matches[0]?.id;
  }

  private isFollowUp(query: string): boolean {
    const q = query.toLowerCase().trim();
    const followUpPatterns = [
      /^tell me more$/i,
      /^more$/i,
      /^elaborate$/i,
      /^anything else\??$/i,
      /^and\b/i,
      /^what about (it|him|her|them|that|she|he|they)\??$/i
    ];

    // Short queries are often follow-ups
    const isShort = q.split(/\s+/).length <= 3;
    if (isShort) {
      // Treat queries that are just a pronoun (optionally with ?) as follow-ups,
      // e.g. "it", "her?", "them".
      const pronounOnlyPattern = /^(it|him|her|them|that|she|he|they|his|hers|its)\??$/i;
      if (pronounOnlyPattern.test(q)) return true;
    }

    return followUpPatterns.some(p => p.test(q));
  }

  async retrieveContext(
    query: string,
    excludeTitles: Set<string>,
    lastEntityId?: string,
    isImage: boolean = false,
  ): Promise<{ content: string; primaryEntityId?: string; sourceIds: string[] }> {
    // 1. Style Search: If this is an image request, look for a style guide or aesthetic note
    let styleContext = "";
    if (isImage) {
      if (this.styleCache !== null) {
        styleContext = this.styleCache;
      } else {
        const styleResults = await searchService.search(
          "art style visual aesthetic world guide",
          { limit: 1 },
        );
        if (styleResults.length > 0 && styleResults[0].score > 0.5) {
          const styleEntity = vault.entities[styleResults[0].id];
          if (styleEntity) {
            styleContext = `--- GLOBAL ART STYLE ---\n${this.getConsolidatedContext(styleEntity)}\n\n`;
            this.styleCache = styleContext;
          }
        } else {
          this.styleCache = ""; // Mark as searched but not found
        }
      }
    }

    // 2. Main Context Search
    let results = await searchService.search(query, { limit: 5 });

    // 2b. Fallback 1: if no results, try extracting keywords
    if (results.length === 0) {
      const keywords = query
        .toLowerCase()
        .replace(/[^\w\s']/g, "")
        .split(/\s+/)
        .filter(
          (w) =>
            w.length > 2 &&
            ![
              "the",
              "and",
              "was",
              "for",
              "who",
              "how",
              "did",
              "his",
              "her",
              "they",
              "with",
              "from",
            ].includes(w),
        );

      if (keywords.length > 0) {
        results = await searchService.search(keywords.join(" "), { limit: 5 });
      }
    }

    // 2. Identify the active entity to prioritize it
    const activeId = vault.selectedEntityId;

    // 3. Identification of primary target
    const explicitSubject = this.findExplicitSubject(query);
    const topSearchResult = results[0];
    const isHighConfidenceSearch =
      topSearchResult && topSearchResult.score >= 0.6;
    const isFollowUp = this.isFollowUp(query);

    let primaryEntityId: string | undefined;

    if (explicitSubject) {
      primaryEntityId = explicitSubject;
    } else if (isHighConfidenceSearch) {
      primaryEntityId = topSearchResult.id;
    } else if (isFollowUp && lastEntityId) {
      primaryEntityId = lastEntityId;
    } else {
      primaryEntityId = activeId || topSearchResult?.id;
    }

    // 4. Build Prioritized Context (FR-005, FR-006)
    // Priorities: 1. Selected, 2. Direct Matches, 3. Subjects, 4. Neighbors (later)
    const contextMap = new Map<string, string>();
    const sourceIds: string[] = [];
    const MAX_CHARS = 10000;
    let currentTotal = styleContext.length;

    const addEntityToContext = (id: string, isEnrichment: boolean = false) => {
      if (contextMap.has(id)) return;
      const entity = vault.entities[id];
      if (!entity || excludeTitles.has(entity.title)) return;

      // FR-003: Enrichment uses only content (Chronicle). Fusion uses both for primary.
      const mainContent = isEnrichment 
        ? (entity.content || "").trim() 
        : this.getConsolidatedContext(entity);
      if (!mainContent && !isEnrichment) return;

      const isActive = id === activeId;
      const prefix = isActive ? "[ACTIVE FILE] " : "";
      
      // 4b. Add Connection Context
      let connectionContext = "";
      const outbound = entity.connections.map((c) => {
        const targetEntity = vault.entities[c.target];
        const target =
          targetEntity && targetEntity.title
            ? targetEntity.title
            : `[missing entity: ${c.target}]`;
        return `- ${entity.title} → ${c.label || c.type} → ${target}`;
      });

      const inbound = (vault.inboundConnections[id] || []).map((item) => {
        const sourceEntity = vault.entities[item.sourceId];
        const source =
          sourceEntity && sourceEntity.title
            ? sourceEntity.title
            : `[missing entity: ${item.sourceId}]`;
        return `- ${source} → ${item.connection.label || item.connection.type} → ${entity.title}`;
      });

      if (outbound.length > 0 || inbound.length > 0) {
        connectionContext =
          "\n--- Connections ---\n" + [...outbound, ...inbound].join("\n");
      }

      const header = `--- ${prefix}File: ${entity.title} ---\n`;
      const fullSnippet = `${header}${mainContent}${connectionContext}`;
      
      // Ensure we don't exceed limit
      if (currentTotal + fullSnippet.length > MAX_CHARS) {
        // If it's a primary match, we truncate content but preserve connections
        if (!isEnrichment) {
          const overhead = header.length + connectionContext.length + 50;
          const allowed = MAX_CHARS - currentTotal - overhead;
          if (allowed > 100) {
            const truncated = mainContent.slice(0, allowed) + "... [truncated content]";
            contextMap.set(id, `${header}${truncated}${connectionContext}`);
            sourceIds.push(id);
            currentTotal = MAX_CHARS; 
          }
        }
        return;
      }

      contextMap.set(id, fullSnippet);
      sourceIds.push(id);
      currentTotal += fullSnippet.length + 2; // +2 for newlines
    };

    // Priority 1: Active Entity
    if (activeId) addEntityToContext(activeId);

    // Priority 2: Direct Search Matches
    for (const res of results) {
      if (currentTotal >= MAX_CHARS) break;
      addEntityToContext(res.id);
    }

    // Priority 3: Conversation Subject
    if (lastEntityId && currentTotal < MAX_CHARS) {
      addEntityToContext(lastEntityId);
    }

    // Priority 4: Neighborhood Enrichment (FR-003)
    // Only enrich top 3 results to avoid noise
    const topResults = results.slice(0, 3);
    for (const res of topResults) {
      if (currentTotal >= MAX_CHARS) break;
      const entity = vault.entities[res.id];
      if (!entity) continue;

      // Enrich with outbound neighbors
      for (const conn of entity.connections) {
        if (currentTotal >= MAX_CHARS) break;
        // Neighbors are marked as enrichment to allow harsher truncation if needed
        addEntityToContext(conn.target, true);
      }
    }

    if (sourceIds.length > 0) {
      console.log(
        `[AIService] Consulted ${sourceIds.length} records:`,
        sourceIds,
      );
    }

    // 5. Last resort: If we have NO lore context yet, provide titles
    let finalContent = Array.from(contextMap.values()).join("\n\n");
    if (contextMap.size === 0 && excludeTitles.size === 0) {
      const allTitles = Object.values(vault.entities)
        .map((e) => e.title)
        .join(", ");
      if (allTitles) {
        finalContent = `--- Available Records ---\nYou have records on the following subjects: ${allTitles}. None specifically matched, but they are available.`;
      }
    }

    return {
      content: styleContext + finalContent,
      primaryEntityId: primaryEntityId || undefined,
      sourceIds,
    };
  }

  clearStyleCache() {
    this.styleCache = null;
  }
}

export const aiService = new AIService();