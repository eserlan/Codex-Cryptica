export function buildEnhancePrompt(query: string, context: string): string {
  if (!context) return query;
  return `You are a world-building artist. 

Use the following context to ground your visualization accurately. 
If a "GLOBAL ART STYLE" is provided, ensure the generated image strictly adheres to that aesthetic style.

${context}

User visualization request: ${query}`;
}

export function buildVisualDistillationPrompt(
  query: string,
  context: string,
): string {
  return `--- CONTEXT ---
${context}

--- USER REQUEST ---
${query}

Extract the distilled visual prompt:`;
}
