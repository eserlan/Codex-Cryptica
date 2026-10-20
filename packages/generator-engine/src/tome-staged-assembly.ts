import type { ResolvedTome } from "./public-tome";
import type { JsonObject } from "./staged-runtime";

export function formatGroundTruth(
  raw: unknown,
  resolved: ResolvedTome,
): string {
  if (typeof raw === "string" && raw.trim()) {
    const text = raw.trim();
    if (text.includes("### Ground Truth for the GM")) {
      return text;
    }
    return `### Ground Truth for the GM\n${text}`;
  }
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const claim = String(
      r.bookClaims ||
        r.claims ||
        r["What the Book Claims"] ||
        resolved.bookClaim,
    );
    const deception = String(
      r.deception ||
        r.flaw ||
        r["The Deception / Flaw"] ||
        resolved.deceptionOrFlaw,
    );
    const truth = String(
      r.objectiveTruth ||
        r.truth ||
        r["The Objective Truth"] ||
        resolved.objectiveTruth,
    );
    const clue = String(
      r.actionableClue ||
        r.clue ||
        r["Actionable Clue"] ||
        resolved.actionableClue,
    );
    return `### Ground Truth for the GM
- **What the Book Claims**: ${claim}
- **The Deception / Flaw**: ${deception}
- **The Objective Truth**: ${truth}
- **Actionable Clue**: ${clue}`;
  }
  return `### Ground Truth for the GM
- **What the Book Claims**: ${resolved.bookClaim}
- **The Deception / Flaw**: ${resolved.deceptionOrFlaw}
- **The Objective Truth**: ${resolved.objectiveTruth}
- **Actionable Clue**: ${resolved.actionableClue}`;
}

export function formatConnectedEntities(
  raw: unknown,
  resolved: ResolvedTome,
): string {
  if (typeof raw === "string" && raw.trim()) {
    const text = raw.trim();
    if (text.includes("### Connected Entities")) return text;
    return `### Connected Entities\n${text}`;
  }
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const author = String(
      r.author || r["Author / Compiler"] || "Unknown Scholar",
    );
    const custodian = String(
      r.custodian || r["Current Custodian / Owner"] || resolved.custodian,
    );
    const faction = String(
      r.interestedFaction ||
        r.faction ||
        r["Interested Faction"] ||
        "Unknown Faction",
    );
    const location = String(
      r.associatedLocation ||
        r.location ||
        r["Associated Location"] ||
        resolved.associatedLocation,
    );
    return `### Connected Entities
- **Author / Compiler**: ${author}
- **Current Custodian / Owner**: ${custodian}
- **Interested Faction**: ${faction}
- **Associated Location**: ${location}`;
  }
  return `### Connected Entities
- **Author / Compiler**: Unknown
- **Current Custodian / Owner**: ${resolved.custodian}
- **Interested Faction**: Occult Seekers
- **Associated Location**: ${resolved.associatedLocation}`;
}

export function formatQuickChecks(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) {
    const text = raw.trim();
    if (text.includes("### Quick Checks & Mechanics")) return text;
    return `### Quick Checks & Mechanics\n${text}`;
  }
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const deciphering = String(
      r.deciphering ||
        r.decipher ||
        r["Deciphering"] ||
        "Requires prolonged study and ancient linguistic reference.",
    );
    const failure = String(
      r.failureCondition ||
        r.failure ||
        r["The Failure Condition"] ||
        "Following flawed steps incurs magical feedback or physical collapse.",
    );
    const handling = String(
      r.safeHandling ||
        r.handling ||
        r["Safe Handling"] ||
        "Wear protective gloves and do not read aloud.",
    );
    return `### Quick Checks & Mechanics
- **Deciphering**: ${deciphering}
- **The Failure Condition**: ${failure}
- **Safe Handling**: ${handling}`;
  }
  return `### Quick Checks & Mechanics
- **Deciphering**: Standard translation check.
- **The Failure Condition**: Inverted ritual components trigger severe backlash.
- **Safe Handling**: Inspect with leaded tongs.`;
}

export function formatAdventureHooks(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw
      .map((item, idx) => {
        const text = String(item).trim();
        if (/^[0-9]+\.\s*/.test(text)) return text;
        return `${idx + 1}. ${text}`;
      })
      .join("\n\n");
  }
  if (typeof raw === "string") return raw.trim();
  return "";
}

// fallow-ignore-next-line complexity
export function assembleTome(
  stage1: JsonObject,
  stage2: JsonObject,
  stage3: JsonObject,
  resolved: ResolvedTome,
): JsonObject {
  const facts = (stage1.canonicalFacts as Record<string, unknown>) ?? {};
  const canonicalFacts = {
    centralRule: String(facts.centralRule || "The core ritual procedure"),
    productionMethod: String(facts.productionMethod || "Handwritten codex"),
    errorSource: String(facts.errorSource || "Early copyist error"),
    bookClaim: String(facts.bookClaim || resolved.bookClaim),
    deception: String(facts.deception || resolved.deceptionOrFlaw),
    objectiveTruth: String(facts.objectiveTruth || resolved.objectiveTruth),
    actionableClue: String(facts.actionableClue || resolved.actionableClue),
  };

  const content = [
    "### Physical Description & Format",
    String(stage1.physicalDescription || "").trim(),
    "",
    "### Provenance & Transmission",
    String(stage1.provenance || "").trim(),
    "",
    "### Contents & Revelations",
    String(stage2.contents || "").trim(),
    "",
    "### Risks & Costs of Study",
    String(stage2.risks || "").trim(),
    "",
    "### Adventure Hooks",
    formatAdventureHooks(stage3.adventureHooks),
  ].join("\n");

  const lore = [
    "### At the Table Reference",
    "",
    formatGroundTruth(stage1.groundTruth, resolved),
    "",
    formatConnectedEntities(stage1.connectedEntities, resolved),
    "",
    formatQuickChecks(stage2.quickChecks),
  ].join("\n");

  return {
    title: String(stage1.title || "The Forbidden Manuscript"),
    summary: String(
      stage1.summary || "An ancient tome containing dangerous knowledge.",
    ),
    canonicalFacts,
    content,
    lore,
    labels: Array.isArray(stage1.labels)
      ? stage1.labels
      : ["tome", "forbidden-book", "grimoire", "item"],
    connections: stage1.connections ?? stage3.connections,
  };
}
