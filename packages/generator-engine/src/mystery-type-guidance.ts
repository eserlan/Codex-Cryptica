/**
 * Allowed third revelation kinds for each mystery type.
 * "item" is accepted across all types for backwards compatibility with saved cases and fixtures.
 */
export function allowedThirdRevelationKinds(mysteryType: string): string[] {
  const norm = mysteryType.trim().toLowerCase();
  if (norm === "theft") return ["item"];
  if (norm === "murder") return ["method", "weapon", "cause", "means", "item"];
  if (norm === "disappearance") return ["fate", "victim", "location", "item"];
  if (norm === "conspiracy")
    return ["objective", "conspiracy", "secret", "mechanism", "item"];
  if (norm === "strange phenomenon")
    return ["cause", "mechanism", "source", "anomaly", "item"];
  return [
    "mechanism",
    "cause",
    "event",
    "situation",
    "relationship",
    "method",
    "fate",
    "secret",
    "objective",
    "item",
  ];
}

export function expectedThirdRevelationKind(mysteryType: string): string {
  const norm = mysteryType.trim().toLowerCase();
  if (norm === "theft") return "item";
  if (norm === "murder") return "method";
  if (norm === "disappearance") return "fate";
  if (norm === "conspiracy") return "objective";
  if (norm === "strange phenomenon") return "cause";
  return "mechanism";
}

export function mysteryTypeGuidance(mysteryType: string): {
  keyItemDesc: string;
  revelationKind: string;
  revelationDesc: string;
  clueGuidance: string;
} {
  const norm = mysteryType.trim().toLowerCase();
  if (norm === "theft") {
    return {
      keyItemDesc:
        "plus keyItem: the central stolen object or physical asset at stake; keyItemLocation: where it is hidden or kept now; keyItemFate: what the culprit intends for it (e.g. sell, destroy, fence); recovery: what the party must do to recover it or prove who took it;",
      revelationKind: "item",
      revelationDesc: 'include one each of "culprit", "motive" and "item"',
      clueGuidance:
        "to the key item's location (keyItemLocationId in the cast) so the party can actually recover it",
    };
  }
  if (norm === "murder") {
    return {
      keyItemDesc:
        "plus keyItem: the central evidence, murder weapon, or cause of death at stake (e.g. poison vial, discarded weapon, concealed body, forensic trace); keyItemLocation: where this critical evidence or body is now; keyItemFate: how the culprit attempted to destroy, conceal, or explain it away; recovery: what the party must do to locate the evidence, establish the cause of death, or prove who did it;",
      revelationKind: "method",
      revelationDesc:
        'include one each of "culprit", "motive" and "method" (or "weapon"/"cause")',
      clueGuidance:
        "to the critical evidence or crime scene location (keyItemLocationId in the cast) so the party can inspect it or uncover the forensic proof",
    };
  }
  if (norm === "disappearance") {
    return {
      keyItemDesc:
        "plus keyItem: the missing person or captive at the centre of the case (or their trail / vital personal effect); keyItemLocation: where the missing person is held or where their trail ends; keyItemFate: what the responsible party intends for them (e.g. ransom, sacrifice, execution, transport); recovery: how the party can locate, reach, and rescue them before that fate;",
      revelationKind: "fate",
      revelationDesc:
        'include one each of "culprit", "motive" and "fate" (or "victim")',
      clueGuidance:
        "to where the missing person is held or where their trail leads (keyItemLocationId in the cast) so the party can reach and rescue them",
    };
  }
  if (norm === "conspiracy") {
    return {
      keyItemDesc:
        "plus keyItem: the secret pact, scheme, mechanism, or compromised relationship at the heart of the conspiracy; keyItemLocation: where the conspirators meet or where the critical proof is concealed; keyItemFate: what the conspiracy aims to trigger, execute, or overthrow; recovery: what the party must do to expose the pact, disrupt the scheme, or prove the conspiracy;",
      revelationKind: "objective",
      revelationDesc:
        'include one each of "culprit", "motive" and "objective" (or "secret")',
      clueGuidance:
        "to the meeting place, secret archive, or scheme headquarters (keyItemLocationId in the cast) so the party can uncover the proof",
    };
  }
  if (norm === "strange phenomenon") {
    return {
      keyItemDesc:
        "plus keyItem: the anomalous mechanism, catalyst, source, or manifestation at the heart of the phenomenon; keyItemLocation: where the phenomenon originates, is anchored, or manifests; keyItemFate: what will happen if the phenomenon continues unchecked; recovery: what the party must do to analyze, contain, neutralize, or explain the phenomenon;",
      revelationKind: "cause",
      revelationDesc:
        'include one each of "culprit", "motive" and "cause" (or "mechanism")',
      clueGuidance:
        "to where the phenomenon is anchored or active (keyItemLocationId in the cast) so the party can analyze or neutralize it",
    };
  }
  return {
    keyItemDesc:
      "plus keyItem: the central focal subject, person, event, cause, mechanism, relationship or situation at stake (do not default to theft or stolen objects; centre on the specific situation, dispute, sabotage, deception or mystery); keyItemLocation: where this central situation, evidence, person or mechanism is active or located now; keyItemFate: the impending consequence or stakes if the situation remains unresolved; recovery: what the party must do to uncover the truth, resolve the situation, or prove what happened;",
    revelationKind: "mechanism",
    revelationDesc:
      'include one each of "culprit", "motive" and "mechanism" (or "cause"/"situation")',
    clueGuidance:
      "to where the central situation or critical evidence is located (keyItemLocationId in the cast) so the party can investigate it",
  };
}
