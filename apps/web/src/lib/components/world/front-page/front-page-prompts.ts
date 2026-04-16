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

  return `Write a high-level world briefing for "${safeName}".

Theme:
- Name: ${themeName}
- Description: ${themeDescription}

Retrieved world context:
${safeContext}

Requirements:
- Write exactly 3 prose paragraphs.
- Do not use bullet points.
- Do not use headings or markdown labels.
- Each paragraph should be 3 to 5 sentences.
- Paragraph 1 should establish the setting, atmosphere, physical world, and daily texture of life.
- Paragraph 2 should explain the power structure, political order, factions, and social hierarchy.
- Paragraph 3 should explain the current disruption, major conflict, or immediate pressure shaping the world right now.
- Use specific details from the context, not generic genre language.
- Make it vivid, compressed, and readable at a glance.
- Match the tone and visual identity of the theme.
- Avoid meta commentary, AI self-reference, and "here is the summary"-style framing.

Style target:
- Write like the opening page of a campaign guide or prestige sourcebook.
- Favor strong nouns, concrete imagery, and confident world-specific phrasing.
- Keep the prose cohesive and cinematic rather than list-like.`;
}
