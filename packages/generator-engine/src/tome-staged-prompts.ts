import { formatCampaignContextBlock } from "./campaign-context";
import { NAME_BAN_PROMPT } from "./public-npc";
import type { ResolvedTome } from "./public-tome";
import type { JsonObject } from "./staged-runtime";

export function tomeSystemInstruction(resolved: ResolvedTome): string {
  const fantasyFidelity = /fantasy/i.test(resolved.genre)
    ? "For secondary-world fantasy, avoid real-world historical dates, places, or modern printing/customs terms."
    : `Keep technology and terminology consistent with the ${resolved.genre} setting and ${resolved.era} era.`;

  return `You are an expert TTRPG worldbuilder, occult scholar, and game designer. You generate detailed, evocative, system-neutral tomes, grimoires, forbidden books, research logs, and dangerous manuscripts.

Follow these strict writing guidelines:
1. British English spelling and grammar throughout (e.g., mould, colour, catalogue, travelling, harbour).
2. Avoid purple-prose clichés. Books must feel historically grounded, material, and tangible.
3. Avoid formulaic titles like "The [Colour] [Noun]" or "Codex of [Doom]". Use authentic period naming.
4. System-neutral: Do not hard-code mechanical stats; frame costs and rules in narrative and procedural terms.
5. Strict cross-section consistency:
   - Physical damage & missing material must never be contradicted.
   - Ritual or mechanical failure conditions must match the flawed procedures.
   - Associated locations and custodians must remain identical across all sections.
   - Historical figures must not appear alive without explanation.
6. ${fantasyFidelity}
7. Return ONLY valid raw JSON. Never include markdown fences (\`\`\`json).`;
}

export function provenanceMessage(
  resolved: ResolvedTome,
  contextPrefix = "",
): string {
  const prefix = contextPrefix ? `${contextPrefix.trim()}\n\n` : "";

  return `${prefix}Stage 1 of 3: Artefact, Provenance & Ground Truth.

Requested Parameters:
- Genre / Setting: ${resolved.genre}
- Composition Era: ${resolved.era}
- Type of Book: ${resolved.tomeType}
- Physical Format: ${resolved.format}
- Rarity / Edition: ${resolved.rarity}
- Current Custodian / Archive: ${resolved.custodian}
- Primary Hazard / Cost: ${resolved.primaryHazard}
- Original Language / Script: ${resolved.language}
${resolved.concept ? `- Working Concept: ${resolved.concept}` : ""}
${formatCampaignContextBlock(resolved.campaignContext)}
${NAME_BAN_PROMPT}

Anchors (all generated details MUST derive from these):
- Physical Damage & Missing Material: ${resolved.exactDamage} (Do NOT contradict this quantity or unit).
- Associated Location: ${resolved.associatedLocation}
- The Book's Surface Claim: ${resolved.bookClaim}
- The Deception / Flaw: ${resolved.deceptionOrFlaw}
- The Objective Reality: ${resolved.objectiveTruth}
- Actionable Clue: ${resolved.actionableClue}

Your Task:
Decide the canonical facts first, then write the physical description, provenance chain, and GM ground truth reference.
Do NOT write Contents & Revelations, Risks, Quick Checks, or Adventure Hooks yet — those will be written in later stages.

Return a JSON object with this exact schema:
{
  "title": "Historical title of the work",
  "summary": "1-2 sentence overview: format, author, subject, and significance.",
  "canonicalFacts": {
    "centralRule": "The single rule or procedure the book turns on, in one sentence",
    "productionMethod": "How this artefact was made: handwritten, printed, copied, or facsimile",
    "errorSource": "Who introduced the error (author, copyist, translator, glossator, censor) and how the original text lets players recover the truth",
    "bookClaim": "${resolved.bookClaim}",
    "deception": "${resolved.deceptionOrFlaw}",
    "objectiveTruth": "${resolved.objectiveTruth}",
    "actionableClue": "${resolved.actionableClue}"
  },
  "physicalDescription": "Detailed markdown describing binding, materials, ink, handwriting/type, seals, damage (${resolved.exactDamage}), and marginalia.",
  "provenance": "Detailed markdown covering the author/origin, era, transmission history, surviving copies, and current custodian (${resolved.custodian}). Name who introduced the error.",
  "groundTruth": {
    "bookClaims": "Concise summary of what the text purports or instructs.",
    "deception": "What the author misunderstood, falsified, or what a censor inserted.",
    "objectiveTruth": "The underlying campaign reality that the GM knows.",
    "actionableClue": "The specific clue, marginalia, or contradiction players can discover."
  },
  "connectedEntities": {
    "author": "Name and historical role",
    "custodian": "${resolved.custodian}",
    "interestedFaction": "Cult, society, or rival collector pursuing it",
    "associatedLocation": "${resolved.associatedLocation}"
  },
  "labels": ["tome", "forbidden-book", "item"],
  "connections": [
    { "targetTitle": "${resolved.custodian}", "relationship": "Current custodian" }
  ]
}`;
}

export function revelationsMessage(
  resolved: ResolvedTome,
  stage1: JsonObject,
  contextPrefix = "",
): string {
  const prefix = contextPrefix ? `${contextPrefix.trim()}\n\n` : "";
  const facts = (stage1.canonicalFacts as JsonObject) ?? {};

  return `${prefix}Stage 2 of 3: Contents, Excerpt, Risks & Quick Checks.

LOCKED FACTS FROM STAGE 1 (Do not contradict or rename):
- Title: ${stage1.title}
- Summary: ${stage1.summary}
- Central Rule: ${facts.centralRule}
- Production Method: ${facts.productionMethod}
- Error Source: ${facts.errorSource}
- Book Claim: ${facts.bookClaim}
- The Deception: ${facts.deception}
- Objective Reality: ${facts.objectiveTruth}
- Actionable Clue: ${facts.actionableClue}
- Damage / Missing Material: ${resolved.exactDamage}
- Associated Location: ${resolved.associatedLocation}
- Custodian: ${resolved.custodian}

Provenance Context:
${stage1.provenance}

Physical Description Context:
${stage1.physicalDescription}

${NAME_BAN_PROMPT}

Your Task:
Write the contents & revelations (including an evocative in-world translated excerpt in blockquotes), the hazards and costs of study, and the quick mechanical checks for the GM at the table.
- Contents & Revelations must include the core subject matter, a translated excerpt (using > blockquotes), the actionable clue, and the deceptive claim.
- The failure condition in Quick Checks MUST match the flawed procedure in Contents.
- The deciphering check must specify language (${resolved.language}), skill, or time required.
- Do NOT rewrite Stage 1 facts. Do NOT write adventure hooks yet.

Return a JSON object with this exact schema:
{
  "contents": "Markdown text with subject matter, translated excerpt in > blockquotes, actionable clue, and flawed claim.",
  "risks": "Markdown text with physical hazards, social/legal scrutiny, and mental/supernatural toll.",
  "quickChecks": {
    "deciphering": "Skill, language, or time required to read or translate.",
    "failureCondition": "Exact mechanical or narrative consequence if the flawed instruction is followed.",
    "safeHandling": "Practical rule to mitigate or avoid the primary hazard."
  }
}`;
}

export function hooksMessage(
  resolved: ResolvedTome,
  stage1: JsonObject,
  stage2: JsonObject,
  contextPrefix = "",
): string {
  const prefix = contextPrefix ? `${contextPrefix.trim()}\n\n` : "";
  const facts = (stage1.canonicalFacts as JsonObject) ?? {};
  const entities = (stage1.connectedEntities as JsonObject) ?? {};

  return `${prefix}Stage 3 of 3: Adventure Hooks & Coherence.

LOCKED CAMPAIGN FACTS:
- Title: ${stage1.title}
- Custodian: ${entities.custodian || resolved.custodian}
- Associated Location: ${entities.associatedLocation || resolved.associatedLocation}
- Missing Material: ${resolved.exactDamage} (Do NOT change quantity or unit; if leaves, do not say gatherings).
- Error Source: ${facts.errorSource}
- The Secret Clue: ${facts.actionableClue}
- Ground Truth: ${facts.objectiveTruth}

${NAME_BAN_PROMPT}

Your Task:
Write at least three concrete, numbered adventure hooks connecting investigators to the tome, its missing material (${resolved.exactDamage}), or the associated location (${resolved.associatedLocation}).
- Hooks must frame tabletop situations, investigations, or crises.
- Hooks must NOT restate the GM's ground truth solution verbatim; players must discover it through play.
- Every hook must respect the exact missing material unit and quantity (${resolved.exactDamage}).

Return a JSON object with this exact schema:
{
  "adventureHooks": [
    "1. Hook title/premise: description...",
    "2. Hook title/premise: description...",
    "3. Hook title/premise: description..."
  ]
}`;
}

export function tomeRepairPrompt(
  draft: JsonObject,
  issues: string[],
  warnings: string[],
  resolved: ResolvedTome,
  reviewContext = "",
): string {
  return `EDITORIAL REPAIR PASS: Correct continuity or structural defects in the assembled tome.

GENRE: ${resolved.genre}
DAMAGE ANCHOR: ${resolved.exactDamage}
ASSOCIATED LOCATION: ${resolved.associatedLocation}
${reviewContext ? `CONTEXT:\n${reviewContext}\n` : ""}

IDENTIFIED DEFECTS TO REPAIR:
${issues.map((iss, i) => `${i + 1}. [ISSUE] ${iss}`).join("\n")}
${warnings.map((w, i) => `${i + 1}. [WARNING] ${w}`).join("\n")}

Repair only the reported defects while strictly preserving:
1. The title and core creative concept.
2. The exact missing material (${resolved.exactDamage}) without confusing leaves and gatherings.
3. The locked Ground Truth and error source.
4. Valid JSON structure.

DRAFT TO REPAIR:
${JSON.stringify(draft, null, 2)}

Return ONLY the corrected JSON object.`;
}
