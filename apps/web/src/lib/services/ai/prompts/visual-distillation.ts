import { u } from "./user-content";

export function buildVisualCanonResolutionPrompt(
  query: string,
  context: string,
): string {
  return `You are the Visual Canon Interpreter for the Lore Oracle. Your task is to resolve established artistic direction and visual motifs from the vault before any image is generated.

VAULT CONTEXT:
${u(context)}

USER REQUEST:
${u(query)}

Search the vault context for established:
- art direction
- visual motifs
- faction aesthetics
- cultural styling
- architecture and heraldry
- materials and symbols
- clothing traditions
- creature design language
- environmental tone
- and category-specific visual guidance

Priority order:
1. Entity-specific visual canon
2. Faction or cultural visual canon
3. Regional visual canon
4. Related category patterns
5. Logical stylistic inference

If established visual direction exists, preserve it consistently.
If no direct guidance exists, infer stylistically from related vault records, maintain internal consistency, and avoid generic fantasy defaults.

Visual identity is part of canonical continuity. 

Output a distilled "Visual Canon Summary" that will be used to generate the final image prompt.`;
}

export function buildVisualPromptGenerationPrompt(
  canonSummary: string,
  userQuery: string,
): string {
  return `You are a Visual Prompt Architect. Using the established Visual Canon Summary and the original user request, generate a high-fidelity visual prompt for an image generation model.

VISUAL CANON SUMMARY:
${canonSummary}

ORIGINAL REQUEST:
${u(userQuery)}

GUIDELINES:
- Emphasize distinctive setting identity.
- Preserve cultural specificity.
- Prioritize concrete visual details (materials, silhouettes, symbols).
- Ground the mood in environmental storytelling and architecture.
- Avoid generic fantasy phrasing (e.g., "epic", "cinematic").
- Avoid vague filler and contradictory aesthetics.

Generate only the final, concrete visual prompt.`;
}

/**
 * Legacy support for the existing interface
 */
export function buildEnhancePrompt(query: string, context: string): string {
  return `${buildVisualCanonResolutionPrompt(query, context)}\n\n${buildVisualPromptGenerationPrompt(
    "[Distilled from above]",
    query,
  )}`;
}

export function buildVisualDistillationPrompt(
  query: string,
  context: string,
): string {
  return buildVisualCanonResolutionPrompt(query, context);
}
