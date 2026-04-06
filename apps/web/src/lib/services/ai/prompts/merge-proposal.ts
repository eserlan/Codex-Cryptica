export function buildMergeProposalPrompt(
  targetContext: string,
  sourceContext: string,
): string {
  return `You are a master archivist. Merge the following records into a single cohesive entry.
    
${targetContext}

${sourceContext}

INSTRUCTIONS:
1. Create a single, unified description (Markdown) that incorporates all key information.
2. Resolve contradictions by favoring the TARGET, but mention significant variations as rumors if interesting.
3. If 'Lore' is present, synthesize a deep-dive section.
4. Return ONLY the merged content in this JSON format:
{
  "body": "The main description...",
  "lore": "Optional extended lore..."
}
`;
}
