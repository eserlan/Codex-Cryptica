export function buildContextDistillationPrompt(context: string): string {
  return `You are a campaign archivist. Condense the following vault excerpts into a concise, factual world digest for a front-page briefing.

Rules:
- Preserve concrete facts only.
- Do not invent details.
- Remove repetition and keep the most useful campaign signals.
- Focus on setting, tone, major factions, notable entities, current conflicts, and immediate hooks.
- Use at most 6 short bullet points.
- Keep each bullet to one sentence.
- Do not include an introduction, conclusion, or meta commentary.

Vault excerpts:
${context}

Concise world digest:`;
}
