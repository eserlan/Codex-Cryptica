import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnalysisResult, DiscoveredEntity, OracleAnalyzerEngine, AnalysisOptions } from '../types';
import { EXTRACTION_PROMPT } from './prompt-factory';

export class OracleAnalyzer implements OracleAnalyzerEngine {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyze(text: string, _options?: AnalysisOptions): Promise<AnalysisResult> {
    const prompt = `${EXTRACTION_PROMPT}\n\nInput Text:\n${text}`;

    // Attempt models in order of strength/preference, aligned with app configuration
    const models = [
      'gemini-3-flash-preview', // Advanced Tier
      'gemini-2.5-flash-lite',  // Lite Tier
    ];

    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text();

        // Robust JSON extraction: look for the first '[' and last ']'
        const startIdx = rawText.indexOf('[');
        const endIdx = rawText.lastIndexOf(']');

        if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
          throw new Error('No valid JSON array found in Oracle response');
        }

        const jsonStr = rawText.substring(startIdx, endIdx + 1).trim();
        const parsed = JSON.parse(jsonStr);

        const entities: DiscoveredEntity[] = parsed.map((item: any) => ({
          id: crypto.randomUUID(),
          suggestedTitle: item.title,
          suggestedType: item.type,
          content: item.content || '',
          frontmatter: {
            ...item.frontmatter,
            // Prioritize explicit image URL from AI or input
            image: item.imageURL || item.imageUrl || item.frontmatter?.image
          },
          confidence: 1, // Placeholder
          suggestedFilename: this.slugify(item.title),
          detectedLinks: item.detectedLinks || []
        }));

        return { entities };

      } catch (error) {
        console.warn(`Oracle Analysis failed with model ${modelName}:`, error);
        // Continue to next model
      }
    }

    console.error('Oracle Analysis failed with all available models.');
    return { entities: [] };
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')     // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-')   // Replace multiple - with single -
      + '.md';
  }
}
