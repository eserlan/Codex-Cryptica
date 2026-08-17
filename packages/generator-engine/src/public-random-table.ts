/**
 * Random Table Generator Prompt Builder, Response Parser, and Local Fallback.
 *
 * Implements world-grounded random roll table generation for Codex Cryptica (#2250).
 */

import {
  type GeneratedTableOutput,
  type RandomTableGenerationContext,
} from "./campaign-generator-types";
import { formatCampaignContextBlock } from "./campaign-context";

export interface RandomTablePrompt {
  systemInstruction: string;
  userPrompt: string;
  temperature: number;
}

const BASE_SYSTEM_INSTRUCTION = `You are a worldbuilding assistant and RPG table designer.
Your task is to generate immersive, evocative, and grounded random roll table entries for tabletop roleplaying games.

Rules:
1. Generate specific, actionable, atmospheric table rows. Avoid generic clichés.
2. Ground each row in the world lore, NPCs, factions, and locations provided.
3. If existing sub-table or deck names are provided, naturally incorporate them as \`{table_name}\` tokens where a slot should draw from that sub-table. Do not invent non-existent sub-table tokens.
4. Keep entity names natural and clean (e.g., "Sera Voight", not "[[Sera Voight]]").
5. Output valid JSON in the requested format with title, optional description, and an entries array.`;

/**
 * Build the system instruction and user prompt for random table generation.
 */
export function buildRandomTablePrompt(
  context: RandomTableGenerationContext,
): RandomTablePrompt {
  const count = Math.max(2, Math.min(50, context.count ?? 10));
  const topic = context.topic.trim();
  const theme = context.theme ?? "fantasy";

  let userPrompt = `Generate a random roll table with exactly ${count} entries.
Theme/Genre: ${theme}
Table Topic / Brief: "${topic}"\n`;

  // Grounding entities from vault search
  if (context.worldEntities && context.worldEntities.length > 0) {
    userPrompt += `\n### Relevant World Entities from Vault (use and reference these naturally):\n`;
    for (const entity of context.worldEntities) {
      const cat = entity.category ? ` (${entity.category})` : "";
      const summary = entity.summary ? `: ${entity.summary}` : "";
      userPrompt += `- ${entity.title}${cat}${summary}\n`;
    }
  }

  // Available sub-tables for nested {reference} emission
  if (context.availableTables && context.availableTables.length > 0) {
    userPrompt += `\n### Existing Vault Random Tables & Decks (emit \`{table_name}\` tokens when an entry references one of these):\n`;
    for (const table of context.availableTables) {
      userPrompt += `- \`{${table}}\`\n`;
    }
  }

  // Highest priority campaign context block
  if (context.campaignContext?.trim()) {
    userPrompt += `\n${formatCampaignContextBlock(context.campaignContext)}\n`;
  }

  userPrompt += `
Format your response as a JSON object:
\`\`\`json
{
  "title": "A concise, evocative title for the table",
  "description": "A 1-sentence summary of when to roll this table",
  "entries": [
    { "text": "Entry text 1" },
    { "text": "Entry text 2 with {sub_table} if applicable" }
  ]
}
\`\`\`
Return only the JSON object.`;

  return {
    systemInstruction: BASE_SYSTEM_INSTRUCTION,
    userPrompt,
    temperature: 0.85,
  };
}

/**
 * Parse LLM response into structured table output.
 */
export function parseRandomTableResponse(
  responseText: string,
): GeneratedTableOutput {
  const trimmed = responseText.trim();

  // 1. Try extracting from markdown code block ```json ... ```
  const jsonMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  const candidateJson = jsonMatch ? jsonMatch[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(candidateJson);
    if (parsed && Array.isArray(parsed.entries) && parsed.entries.length > 0) {
      return {
        title: typeof parsed.title === "string" ? parsed.title : "Random Table",
        description:
          typeof parsed.description === "string"
            ? parsed.description
            : undefined,
        entries: parsed.entries
          .map((entry: any) => {
            if (typeof entry === "string") {
              return { text: entry.trim(), weight: 1 };
            }
            if (entry && typeof entry.text === "string") {
              return {
                text: entry.text.trim(),
                weight:
                  typeof entry.weight === "number" && entry.weight > 0
                    ? entry.weight
                    : 1,
              };
            }
            return null;
          })
          .filter(
            (
              e: { text: string; weight: number } | null,
            ): e is { text: string; weight: number } =>
              e !== null && e.text.length > 0,
          ),
      };
    }
  } catch {
    // Fall back to line-by-line parsing if JSON parse fails
  }

  // 2. Line-by-line fallback parsing
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("```"));

  const entries: Array<{ text: string; weight: number }> = [];

  for (const line of lines) {
    // Strip leading numbers or bullets (e.g., "1. ", "- ", "01-05: ")
    const cleanText = line
      .replace(/^(?:\d+[.-]|\d+\s*-\s*\d+[:.-]?|\*|-)\s*/, "")
      .trim();
    if (cleanText.length > 0) {
      entries.push({ text: cleanText, weight: 1 });
    }
  }

  return {
    title: "Generated Random Table",
    entries:
      entries.length > 0
        ? entries
        : [{ text: "No entries generated", weight: 1 }],
  };
}

/**
 * Deterministic local fallback generator when offline or in tests.
 */
export function generateRandomTableLocal(
  context: RandomTableGenerationContext,
): GeneratedTableOutput {
  const count = Math.max(2, Math.min(50, context.count ?? 10));
  const topic = context.topic.trim() || "Encounters & Events";
  const subTableRef =
    context.availableTables && context.availableTables.length > 0
      ? `{${context.availableTables[0]}}`
      : undefined;

  const templates = [
    `A strange omen is observed involving ${subTableRef ?? "a wandering traveler"}.`,
    `Local rumors spread regarding recent movements of notable figures.`,
    `An unexpected discovery made near the outskirts during ${subTableRef ?? "the evening watch"}.`,
    `Tension rises as rivals cross paths unexpectedly.`,
    `A courier delivers an urgent message meant for someone else.`,
    `Mysterious activity spotted under cover of darkness.`,
    `An uncommon opportunity presents itself to those observant enough to notice.`,
    `A sudden dispute breaks out over valuable trade goods or secrets.`,
  ];

  const entries: Array<{ text: string; weight: number }> = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    entries.push({
      text: `${topic}: ${template} (Variation ${i + 1})`,
      weight: 1,
    });
  }

  return {
    title: topic,
    description: `A collection of outcomes and events for ${topic}.`,
    entries,
  };
}
