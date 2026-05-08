/**
 * Build an AI prompt for generating a world cover image.
 */
export function createWorldCoverPrompt(
  worldName: string,
  themeName: string,
  themeDescription: string,
  briefing: string,
  worldContext: string,
): string {
  const safeBriefing = briefing.trim() || "An unexplored setting.";
  const safeName = worldName.trim() || "this world";
  const safeWorldContext =
    worldContext.trim() || "No additional context was retrieved.";

  return `Create atmospheric portrait cover art for "${safeName}".

Theme:
- Name: ${themeName}
- Thematic scope: ${themeDescription}

World cues:
- Briefing: ${safeBriefing}
- Retrieved context:
${safeWorldContext}

Art direction:
- Portrait composition, vertical framing, approximately 2:3 aspect ratio.
- Focus on the tone, mood, and symbolic atmosphere of the setting.
- Depict the world itself more than a single action scene.
- Emphasize place, tension, and identity through lighting, silhouette, color, and environment.
- Make it feel like the frontispiece to a living world.
- No text, no title lettering, no UI, no borders.`;
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
