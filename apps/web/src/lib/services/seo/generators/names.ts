import type { DefaultAIClientManager } from "$lib/services/ai/client-manager";
import { NAME_BAN_PROMPT } from "./banned-names";
import { type GeneratorOutput, nameGeneratorConfig } from "./base";

export async function generateNames(
  clientManager: DefaultAIClientManager,
  options: {
    theme?: string;
    culture?: string;
    gender?: string;
    nameType?: string;
    count?: string;
    context?: string;
    useAI?: boolean;
  } = {},
): Promise<GeneratorOutput> {
  const culture = options.culture || nameGeneratorConfig.cultures[0];
  const gender = options.gender || nameGeneratorConfig.genders[0];
  const nameType = options.nameType || nameGeneratorConfig.nameTypes[0];
  const count = Math.max(1, parseInt(options.count || "10", 10) || 10);
  const context = options.context?.trim();

  const entityType: GeneratorOutput["type"] =
    nameType === "Place"
      ? "location"
      : nameType === "Faction"
        ? "faction"
        : nameType === "Item"
          ? "item"
          : "character";

  if (options.useAI !== false) {
    try {
      const prompt = `Generate ${count} ${nameType.toLowerCase()} names for a tabletop RPG in JSON format.
Options:
${options.theme ? `- Setting / Genre: ${options.theme} — names must fit this genre's conventions.\n` : ""}- Culture / Style: ${culture}
- Gender / Presentation: ${gender}
- Name Type: ${nameType}
- Count: ${count}
${context ? `- Context: ${context}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "content": "A brief lead sentence describing the naming style, followed by a markdown list of all ${count} names. Format each name as '- **Name**: one-sentence flavour note'.",
  "lore": "GM notes (markdown formatted) with sections for Culture, Style, and Usage Suggestions covering how to use these names in a campaign.",
  "labels": ["fantasy-name", "name-generator", "imported-draft"]
}
${NAME_BAN_PROMPT}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

      const model = await clientManager.getModel(
        "",
        "gemini-3.1-flash-lite",
        "You are an assistant that generates detailed RPG campaign elements in JSON format.",
      );
      const response = await model.generateContent(prompt);
      const text = response.response.text().trim();
      const cleanText = text
        .replace(/^```json\s*/i, "")
        .replace(/```$/, "")
        .trim();
      const data = JSON.parse(cleanText);

      return {
        type: entityType,
        title: `${culture} Names — ${nameType}`,
        content: data.content || "",
        lore: data.lore || "",
        labels: Array.isArray(data.labels)
          ? data.labels
          : ["fantasy-name", "name-generator", "imported-draft"],
        status: "active",
      };
    } catch (err) {
      console.warn("AI generation failed, falling back to local tables:", err);
    }
  }

  const prefixes =
    nameGeneratorConfig.culturePrefixes[culture] ||
    nameGeneratorConfig.culturePrefixes["Generic Fantasy"];
  const suffixes =
    nameGeneratorConfig.cultureSuffixes[culture] ||
    nameGeneratorConfig.cultureSuffixes["Generic Fantasy"];

  const generated: string[] = [];
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    generated.push(prefix.charAt(0).toUpperCase() + prefix.slice(1) + suffix);
  }

  const nameList = generated.map((n) => `- ${n}`).join("\n");

  const content = `${culture} ${nameType.toLowerCase()} names in a ${gender.toLowerCase()} register.

${nameList}`;

  const lore = `### Generator Settings
- **Culture**: ${culture}
- **Gender / Presentation**: ${gender}
- **Name Type**: ${nameType}

### Usage Suggestions
Use these names for any ${nameType.toLowerCase()} in a ${culture.toLowerCase()}-influenced setting. Combine or modify them freely — drop a syllable, add a prefix, or append a title or epithet for variation.`;

  return {
    type: entityType,
    title: `${culture} Names — ${nameType}`,
    content,
    lore,
    labels: ["fantasy-name", "name-generator", "imported-draft"],
    status: "active",
  };
}
