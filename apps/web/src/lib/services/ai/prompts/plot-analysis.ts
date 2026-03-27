export function buildPlotAnalysisPrompt(
  subjectContext: string,
  connectionsContext: string,
  userQuery: string,
): string {
  return `You are a master storyteller and dramaturgy analyst. Analyze the following entity and its network of connections to identify dramatic tension.

${subjectContext}

--- CONNECTED ENTITIES ---
${connectionsContext}

--- USER QUERY ---
${userQuery}

Provide a concise dramaturgy analysis covering:
1. **Rivals & Enemies**: Who directly opposes or threatens this entity?
2. **Political Risks**: What factions, allegiances, or power structures create tension?
3. **Hidden Secrets**: What information, if exposed, could be damaging or transformative?
4. **Dramatic Hooks**: Suggest 2-3 story tensions that could drive a compelling narrative.

Format the output in clear Markdown sections. Be specific and reference actual entities from the vault where possible.`;
}
