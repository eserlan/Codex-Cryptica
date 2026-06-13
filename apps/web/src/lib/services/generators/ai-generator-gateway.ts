import type { AIGeneratorGateway } from "generator-engine";
import { aiClientManager } from "$lib/services/ai/client-manager";

export const aiGeneratorGateway: AIGeneratorGateway = {
  async complete(prompt: string, systemInstruction: string): Promise<string> {
    const model = await aiClientManager.getModel(
      "",
      "gemini-3.1-flash-lite",
      systemInstruction,
    );
    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();
    return text
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
  },
};
