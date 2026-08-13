import { composeImagePrompt } from "schema";

/**
 * Build an AI prompt for generating a world cover image.
 */
export function createWorldCoverPrompt(
  worldName: string,
  themeName: string,
  themeDescription: string,
  briefing: string,
  worldContext: string,
  themeId?: string,
): string {
  const safeBriefing = briefing.trim() || "An unexplored setting.";
  const safeName = worldName.trim() || "this world";
  const safeWorldContext =
    worldContext.trim() || "No additional context was retrieved.";
  // The cover category already supplies portrait framing, the quiet upper
  // third, and the theme's medium and palette, so none of that is restated
  // below. The world name is stripped from the subject and used only as
  // context for the model writing the scene.
  const { prompt: artDirection, negativeTerms } = composeImagePrompt({
    subject: safeBriefing,
    category: "cover",
    theme: themeId,
    subjectOptions: { names: [safeName], descriptor: "this setting" },
  });

  return `Create cover art for a world described below.

Theme:
- Name: ${themeName}
- Thematic scope: ${themeDescription}

World cues:
- Briefing: ${safeBriefing}
- Retrieved context:
${safeWorldContext}

Art direction:
${artDirection}

Requirements:
- Depict the world itself more than a single action scene.
- Do not render the world's name or any other lettering.
- Avoid: ${negativeTerms.join(", ")}.`;
}

/**
 * Build an AI prompt for generating a world briefing.
 */
export function createWorldBriefingPrompt(
  worldName: string,
  themeName: string,
  themeDescription: string,
  retrievedWorldContext: string,
): string {
  const safeName = worldName.trim() || "this world";
  const safeContext =
    retrievedWorldContext.trim() || "No additional context was retrieved.";

  return `Write a high-level briefing for "${safeName}".

Theme:
- Name: ${themeName}
- Description: ${themeDescription}

Requirements:
- Write exactly three paragraphs of evocative prose.
- Paragraph 1: Set the scene, tone, and physical reality of the world.
- Paragraph 2: Describe the central conflict, current tension, or immediate premise.
- Paragraph 3: Provide a hook or call to action that defines what it's like to inhabit this setting.
- Use specific details from the world context instead of generic language.
- Do not use bullet points, headings, or meta-commentary.
- Do not mention that you are an AI.

Retrieved context:
${safeContext}

Match the briefing to the theme atmosphere and visual identity, and focus on what a player or GM needs to know at a glance.`;
}
