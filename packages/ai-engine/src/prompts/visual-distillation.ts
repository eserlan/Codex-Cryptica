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
- physical appearance and anatomy
- clothing, armour, and personal equipment
- materials, colours, and surface condition
- faction, cultural, and regional visual markers
- architecture, heraldry, and symbols
- creature design language
- environmental tone

Priority order:
1. Entity-specific visual canon
2. Faction or cultural visual canon
3. Regional visual canon
4. Related category patterns
5. Logical stylistic inference

If established visual direction exists, preserve it consistently.
If no direct guidance exists, infer from related vault records, maintain internal consistency, and avoid generic fantasy defaults.

Visual identity is part of canonical continuity.

Output a distilled "Visual Canon Summary" describing the physical facts that must appear in the image.

Then, on a final line by itself, classify the subject's standing in the world:

STATURE: mundane | renowned | mythic | divine

- divine — the vault says this is worshipped, prayed to, venerated, or given offerings. A god, not merely a very powerful person.
- mythic — the vault treats this as legend: stories are told about it, its name is invoked, people doubt it is real.
- renowned — known and deferred to by name within its own society: a ruler, a champion, a famous master of a craft.
- mundane — everything else.

Being old, large, powerful, magical, rare, or important to the plot is NOT stature. An ancient ruin, a dragon, a king's sword, and a wizard are all mundane unless the vault says otherwise. If the canon does not say, answer mundane.`;
}

const STATURE_LINE =
  /^[ \t]*STATURE[ \t]*:[ \t]*(mundane|renowned|mythic|divine)\b.*$/im;

/**
 * Splits the classification line off the canon summary.
 *
 * The value is validated against the closed set, and anything else counts as
 * no signal: a model that ignores the instruction, hedges, or invents a fifth
 * tier must leave the prompt exactly as it would have been.
 */
export function extractStature(canonSummary: string): {
  summary: string;
  stature?: string;
} {
  const match = canonSummary.match(STATURE_LINE);
  if (!match) return { summary: canonSummary };

  const summary = canonSummary.replace(STATURE_LINE, "").trimEnd();
  const stature = match[1].toLowerCase();
  // Mundane is the default anyway, and not returning it keeps a no-op from
  // looking like a decision downstream.
  return stature === "mundane" ? { summary } : { summary, stature };
}

/**
 * Art Direction v2: the model produces the SUBJECT LAYER ONLY.
 *
 * Medium, palette, lighting, camera, framing, style lineage, and negatives are
 * supplied deterministically by `composeImagePrompt` after this returns. If the
 * model emits any of them here they will be duplicated or contradicted
 * downstream, so the instructions forbid them explicitly.
 */
export function buildVisualSubjectPrompt(
  canonSummary: string,
  userQuery: string,
): string {
  return `You are a Visual Subject Writer. Using the Visual Canon Summary and the original request, write the SUBJECT of an image — what is physically present in frame, and nothing else.

VISUAL CANON SUMMARY:
${canonSummary}

ORIGINAL REQUEST:
${u(userQuery)}

WRITE:
- One or two clauses. Short.
- Concrete physical facts only: species, gender presentation, age range, role, build, clothing, materials, condition, equipment, expression, posture, and action.
- Material and condition over abstract mood. Prefer "cracked lacquer over pine" to "ancient and mysterious".
- One distinctive asymmetry, repair, or specific wear detail where it suits the subject.

NEVER INCLUDE:
- Proper names of any kind — no character, faction, location, item, or place names. Describe the subject instead: write "male human veteran officer", not the character's name. Write "weathered basalt border fortress", not the fortress's name.
- Art medium, style, or genre words (oil painting, digital art, concept art, photographic, cyberpunk, gothic).
- Palette, colour grading, or lighting direction.
- Camera, lens, focal length, aperture, framing, shot size, or aspect ratio.
- Artist names or style lineages.
- Quality filler: epic, 8k, masterpiece, hyperdetailed, trending on ArtStation, award winning.
- Any "avoid" or negative phrasing.

These are all applied separately and will conflict with your output if you include them.

Output only the subject text. No preamble, no quotation marks, no trailing punctuation commentary.`;
}

/**
 * Legacy support for the existing interface
 */
export function buildEnhancePrompt(query: string, context: string): string {
  return `${buildVisualCanonResolutionPrompt(query, context)}\n\n${buildVisualSubjectPrompt(
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
