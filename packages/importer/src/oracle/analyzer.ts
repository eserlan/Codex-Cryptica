import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AnalysisResult,
  DiscoveredEntity,
  OracleAnalyzerEngine,
  AnalysisOptions,
} from "../types";
import { EXTRACTION_PROMPT } from "./prompt-factory";
import { splitTextIntoChunks } from "../utils";

const CHUNK_SIZE = 50000;
const OVERLAP_SIZE = 2000;

export class OracleAnalyzer implements OracleAnalyzerEngine {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyze(
    text: string,
    options?: AnalysisOptions,
  ): Promise<AnalysisResult> {
    const chunks = splitTextIntoChunks(text, CHUNK_SIZE, OVERLAP_SIZE);

    console.log(`[OracleAnalyzer] Split text into ${chunks.length} chunks.`);

    // Process all chunks
    const allEntities: DiscoveredEntity[] = [];
    const completedSet = new Set(options?.completedIndices || []);

    for (let i = 0; i < chunks.length; i++) {
      if (options?.signal?.aborted) {
        console.log("[OracleAnalyzer] Analysis aborted by user.");
        throw new Error("Analysis Aborted");
      }
      const chunk = chunks[i];

      if (completedSet.has(i)) {
        console.log(
          `[OracleAnalyzer] Skipping chunk ${i + 1}/${chunks.length} (Already completed)`,
        );
        if (options?.onProgress) {
          options.onProgress(i + 1, chunks.length);
        }
        continue;
      }

      console.log(
        `[OracleAnalyzer] Processing chunk ${i + 1}/${chunks.length}...`,
      );

      if (options?.onChunkActive) {
        options.onChunkActive(i);
      }

      if (options?.onProgress) {
        options.onProgress(i + 1, chunks.length);
      }

      const result = await this.processChunk(chunk);
      allEntities.push(...result.entities);

      if (options?.onChunkProcessed) {
        options.onChunkProcessed(i, result);
      }
    }

    return this.mergeDuplicates(allEntities);
  }

  private async processChunk(text: string): Promise<AnalysisResult> {
    const prompt = `${EXTRACTION_PROMPT}\n\nInput Text:\n${text}`;

    // Attempt models in order of strength/preference, aligned with app configuration
    const models = [
      "gemini-3-flash-preview", // Advanced Tier
      "gemini-flash-lite-latest", // Lite Tier
    ];

    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text();

        // Robust JSON extraction
        const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!jsonMatch) {
          throw new Error("No valid JSON array found in Oracle response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const entities: DiscoveredEntity[] = parsed.map((item: any) => {
          const rawImage =
            item.imageUrl ||
            item.imageURL ||
            item.image ||
            item.frontmatter?.image;
          const isValidUrl =
            typeof rawImage === "string" &&
            (rawImage.startsWith("http://") || rawImage.startsWith("https://"));

          return {
            id: crypto.randomUUID(),
            suggestedTitle: item.title,
            suggestedType: item.type,
            chronicle: item.chronicle || item.content || "",
            lore: item.lore || "",
            content:
              item.content ||
              `${item.chronicle || ""}\n\n${item.lore || ""}`.trim(),
            frontmatter: {
              ...item.frontmatter,
              // Prioritize explicit image URL from AI or input, only if absolute
              image: isValidUrl ? rawImage : undefined,
            },
            confidence: 1, // Placeholder
            suggestedFilename: this.slugify(item.title),
            detectedLinks: (item.detectedLinks || []).map((link: any) => {
              if (typeof link === "string") return { target: link };
              return {
                target: link.target || link.title || "",
                label: link.label || link.type || "",
              };
            }),
          };
        });

        return { entities };
      } catch (error) {
        console.warn(`Oracle Analysis failed with model ${modelName}:`, error);
        // Continue to next model
      }
    }

    console.error("Oracle Analysis failed with all available models.");
    return { entities: [] };
  }

  private mergeDuplicates(entities: DiscoveredEntity[]): AnalysisResult {
    const map = new Map<string, DiscoveredEntity>();

    for (const entity of entities) {
      const key = entity.suggestedTitle.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, entity);
      } else {
        const existing = map.get(key)!;
        // Merge Content
        if (entity.chronicle) {
          existing.chronicle = [existing.chronicle, entity.chronicle]
            .filter(Boolean)
            .join("\n\n");
        }
        if (entity.lore) {
          existing.lore = [existing.lore, entity.lore]
            .filter(Boolean)
            .join("\n\n");
        }
        if (entity.content) {
          existing.content = [existing.content, entity.content]
            .filter(Boolean)
            .join("\n\n");
        }
        // Merge Image
        existing.frontmatter.image =
          existing.frontmatter.image || entity.frontmatter.image;
        // Merge Links
        const existingLinks = new Map<string, any>();
        [...existing.detectedLinks, ...entity.detectedLinks].forEach((link) => {
          const l = typeof link === "string" ? { target: link } : link;
          const targetKey = l.target.toLowerCase().trim();
          if (
            !existingLinks.has(targetKey) ||
            (!existingLinks.get(targetKey).label && l.label)
          ) {
            existingLinks.set(targetKey, l);
          }
        });
        existing.detectedLinks = Array.from(existingLinks.values());
      }
    }

    return { entities: Array.from(map.values()) };
  }

  private slugify(text: string): string {
    return (
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(/[^\w-]+/g, "") // Remove all non-word chars
        .replace(/--+/g, "-") + // Replace multiple - with single -
      ".md"
    );
  }
}
