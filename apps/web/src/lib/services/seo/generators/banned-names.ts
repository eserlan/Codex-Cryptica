export const BANNED_NAMES = [
  // Overused NPC / character names
  "Vane",
  "Elara",
  "Valerius",
  "Kael",
  "Kaelen",
  "Theron",
  "Zara",
  "Aldric",
  "Kane",
  "Drake",
  "Maren",
  "Cross",
  "Vale",
  "Stone",
  "Grey",
  "Ash",
  "Cole",
  "Thorne",
  "Voss",
  "Julian",
  "Julianne",
  "Halloway",
  // Generic settlement names
  "Oakhaven",
  "Oakhollow",
  "Millbrook",
  "Riverdale",
] as const;

export const NAME_BAN_PROMPT =
  `Names must never include: ${BANNED_NAMES.join(", ")}. ` +
  `Avoid all similar generic fantasy placeholders and common English monosyllable surnames.`;
