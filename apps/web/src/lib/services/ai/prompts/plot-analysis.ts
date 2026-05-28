import { u } from "./user-content";

export function buildPlotCanonResolutionPrompt(
  subjectContext: string,
  connectionsContext: string,
  userQuery: string,
): string {
  return `You are a Master Plot Archivist and Canon Interpreter. Your task is to resolve established vault threads and tensions before generating adventure seeds.

--- SUBJECT CONTEXT ---
${u(subjectContext)}

--- CONNECTED ENTITIES ---
${u(connectionsContext)}

--- USER REQUEST ---
${u(userQuery)}

TASK:
Search the vault context above to identify:
- Unresolved vault threads
- Directly related entities and their goals
- Historical consequences of past events
- Faction agendas and active rivalries
- Regional pressures and spiritual/magical instability
- Loose threads, secrets, and contradictions

Priority order:
1. Existing unresolved vault threads
2. Directly related entities
3. Historical consequences
4. Faction goals and rivalries
5. Regional pressures
6. Logical inference
7. Creative extrapolation

Output a "Plot Canon Summary" that identifies the most fertile ground for story development while strictly preserving established chronology and political relationships. Prefer existing conflicts over generic invented ones.`;
}

export function buildPlotGenerationPrompt(
  canonSummary: string,
  userQuery: string,
): string {
  return `You are a Lead Story Architect. Using the Plot Canon Summary and the user request, generate actionable plot hooks and adventure seeds.

--- PLOT CANON SUMMARY ---
${canonSummary}

--- USER REQUEST ---
${u(userQuery)}

RULES:
- Grow plots from established lore and canon roots.
- Create actionable play with clear tension or conflict.
- Involve meaningful player choices.
- Preserve canon continuity.
- Avoid generic fetch quests or random threats unrelated to the vault.

OUTPUT FORMAT:
Provide 3–5 plot options in this exact structure:

## [Plot Title]
**Premise:** [1–3 sentence summary]
**Canon Roots:** [List established entities, events, factions, or locations this draws from]
**Complication:** [What makes the situation unstable or difficult]
**Player Hook:** [How the players become involved]
**Possible Outcomes:** [2–4 ways the situation could develop]`;
}
