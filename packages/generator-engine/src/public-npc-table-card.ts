/**
 * Table-card (5-element memorable NPC anatomy) helpers for the public NPC
 * generator — AI system prompt variant and local-fallback rendering.
 *
 * Split out of `public-npc.ts` to keep that file focused on the shared
 * dossier-mode generation/parsing pipeline.
 */

import { NAME_BAN_PROMPT, DELVE_ALERT_STAGES } from "./public-npc-constants";
import type { ResolvedNpc } from "./public-npc";

export function buildTableCardSystemInstruction(
  voice: string,
  delvePromptInstruction: string,
  isDelve: boolean,
  sessionContext: string,
): string {
  return `You are an expert RPG campaign writer specialising in ${voice}. You generate punchy, table-ready NPC reference cards in JSON format based on the 5-element memorable NPC anatomy (immediate want, physical mannerism, sharp contradiction, relationship hook, and sensory tag).${delvePromptInstruction}

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "NPC name (follow the naming directive in the user message)",
  "summary": "One punchy sentence capturing who this NPC is, their contradiction, and their immediate scene goal.",
  "content": "Markdown. Use exactly these two section headers in order: '### The Five Elements' and '### Table Delivery'.\\n\\nUnder '### The Five Elements', include exactly these 5 bullet points with bold labels:\\n- **Immediate Want**: One concrete, urgent desire for this scene or from the party right now (tangible and immediate, e.g. 'Needs 40 lbs of bog-iron before Friday' or 'Needs someone expendable to deliver a sealed pouch across the river').\\n- **Physical Mannerism**: One observable physical habit, gesture, or vocal cadence the GM can easily portray without vocal strain.\\n- **Sharp Contradiction**: One trait, habit, or vulnerability that breaks archetype fatigue and directly contradicts their occupation or appearance.\\n- **Relationship Hook**: One active link of debt, family, rivalry, or faction allegiance tying them into the wider local world.\\n- **Sensory Tag**: One vivid sensory detail (scent, sound, or striking visual mark) that sticks in players' memory.\\n\\nUnder '### Table Delivery', provide 2-3 sentences explaining how to introduce them in thirty seconds of table dialogue.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At a Glance\\n- **Ancestry**: race and background\\n- **Role**: what they do\\n- **Immediate Want**: urgent scene desire\\n- **Mannerism / Vocal Tell**: physical habit or speech cadence\\n- **Contradiction**: trait subverting archetype\\n- **Relationship Hook**: tie to faction, rival, or NPC\\n- **Sensory Tag**: scent, sound, or visual detail\\n- **Moral Stance**: behavioral anchor${isDelve ? "\\n### Alert & Lair Response\\n- **Stage 1 (Unaware)**: routine in lair\\n- **Stage 2 (Alerted)**: defensive response\\n- **Stage 3 (Lair Defense / Confrontation)**: combat or negotiation leverage" : ""}\\n### Faction Connection\\none sentence on their organisational ties or lack thereof",
  "labels": [${isDelve ? '"delve-boss", "dungeon-npc", ' : ""}"2-4 lowercase labels describing their role and traits, plus 'table-card', 'rpg-character', 'npc-generator', 'imported-draft'"]
}

QUALITY RULES:
- Ground the NPC in playable surface cues rather than hidden backstory. Every element must be demonstrable in 60 seconds of dialogue.
- The immediate want must be urgent and scene-level (something they demand or need from the party right now), not an abstract life ambition.
- The contradiction must genuinely subvert their archetype or role.
- ${NAME_BAN_PROMPT}
${sessionContext}
- Silently check that all five elements are present and distinctive before finalising.`;
}

export interface TableCardLocalResult {
  title: string;
  summary: string;
  content: string;
  lore: string;
  labels: string[];
}

/**
 * Render the local (AI-free) table-card output. The caller applies quick
 * stats injection and `status` since those are shared with dossier mode.
 */
export function generateNpcTableCardLocal(
  resolved: ResolvedNpc,
  delveContext: {
    isDelve: boolean;
    delveSector?: string;
    delveRelation?: string;
    delveSecretTie?: string;
  },
  moralityLabel: string,
): TableCardLocalResult {
  const { race, role, name, theme, faction, mannerism } = resolved;
  const immediateWant = resolved.immediateWant ?? "";
  const contradiction = resolved.contradiction ?? "";
  const relationshipHook = resolved.relationshipHook ?? "";
  const sensoryTag = resolved.sensoryTag ?? "";
  const { isDelve, delveSector, delveRelation, delveSecretTie } =
    delveContext;

  const content = `### The Five Elements
- **Immediate Want**: ${immediateWant}
- **Physical Mannerism**: ${mannerism}
- **Sharp Contradiction**: ${contradiction}
- **Relationship Hook**: ${relationshipHook}
- **Sensory Tag**: ${sensoryTag}

### Table Delivery
Introduce ${name} through their sensory tell and mannerism before naming their immediate want. When the party probes their background or negotiates terms, reveal their internal contradiction to break archetype expectations.`;

  const glanceDelveFields = isDelve
    ? `\n- **Delve Sector / Lair**: ${delveSector}\n- **Relation to Inhabitants**: ${delveRelation}\n- **Tie to Central Secret**: ${delveSecretTie}`
    : "";

  const alertSection = isDelve
    ? `\n\n### Alert & Lair Response\n${DELVE_ALERT_STAGES.join("\n")}`
    : "";

  const lore = `### At a Glance
${theme ? `- **Theme / Genre**: ${theme}\n` : ""}- **Ancestry**: ${race}
- **Role**: ${role}${glanceDelveFields}
- **Immediate Want**: ${immediateWant}
- **Mannerism / Vocal Tell**: ${mannerism}
- **Contradiction**: ${contradiction}
- **Relationship Hook**: ${relationshipHook}
- **Sensory Tag**: ${sensoryTag}
- **Moral Stance**: ${moralityLabel}${alertSection}

### Faction Connection
${faction}`;

  const roleLabel = role.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const labels = isDelve
    ? [
        "delve-boss",
        "dungeon-npc",
        "table-card",
        roleLabel,
        "rpg-character",
        "npc-generator",
        "imported-draft",
      ]
    : [
        "table-card",
        roleLabel,
        "rpg-character",
        "npc-generator",
        "imported-draft",
      ];

  return {
    title: name,
    summary: `A ${moralityLabel.toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()}. ${immediateWant}`,
    content,
    lore,
    labels,
  };
}
