import type { AIGeneratorGateway } from "generator-engine";
import { aiClientManager } from "$lib/services/ai/client-manager";

/**
 * Extract the first balanced JSON object from a model response, tolerating code
 * fences, leading prose, and trailing garbage (e.g. a degenerate run of "}").
 * Walks the string tracking string literals/escapes so braces inside strings
 * don't throw off the depth count.
 */
export function extractJsonObject(raw: string): string {
  const t = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = t.indexOf("{");
  if (start === -1) return t;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return t.slice(start, i + 1);
    }
  }
  return t.slice(start);
}

export const aiGeneratorGateway: AIGeneratorGateway = {
  async complete(prompt: string, systemInstruction: string): Promise<string> {
    const model = await aiClientManager.getModel(
      "",
      "gemini-3.1-flash-lite",
      systemInstruction,
    );
    // Explicit decoding config: a generous token budget prevents long templated
    // lore from truncating, modest temperature keeps output creative but
    // coherent, and JSON mode reduces parse failures. (Passed as a full request
    // object so generationConfig reaches both the proxy and direct-key paths.)
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });
    // Salvage the JSON object even if the model appends trailing garbage (a
    // known degenerate-repetition failure mode) — JSON mode isn't reliably
    // enforced through the proxy.
    return extractJsonObject(response.response.text());
  },
};
