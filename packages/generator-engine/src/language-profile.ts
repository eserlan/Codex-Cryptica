import {
  LanguageGenerationResultV1Schema,
  type LanguageGenerationResultV1,
  type LanguageProfileV1,
  type LanguageProfileInput,
} from "schema";

export interface LanguageValidationResult {
  valid: boolean;
  issues: string[];
}

function validation(issues: string[]): LanguageValidationResult {
  return { valid: issues.length === 0, issues };
}

function uniqueCount(values: string[]): number {
  return new Set(values.map((value) => value.trim().toLocaleLowerCase())).size;
}

const PLACEHOLDER_VALUE =
  /^(unknown|not specified|not available|n\/a|none|tbd|placeholder)$/i;

function words(value: string): string[] {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function list(values: string[] | undefined): string {
  return values?.length ? values.join(", ") : "Not specified";
}

function lines(values: string[] | undefined): string {
  return values?.length
    ? values.map((value) => `- ${value}`).join("\n")
    : "- Not specified";
}

function tableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function cultureText(profile: LanguageProfileV1): string {
  const culture = profile.culture;
  if (!culture) {
    return `${profile.register.role}.`;
  }
  return [
    culture.speakers && `**Speakers:** ${culture.speakers}`,
    culture.history && `**History:** ${culture.history}`,
    culture.usage && `**Usage:** ${culture.usage}`,
    culture.influences && `**Influences:** ${culture.influences}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function namingRules(profile: LanguageProfileV1): string {
  const naming = profile.naming;
  const groups = [
    naming.personalNamePatterns?.length &&
      `**Personal names:** ${naming.personalNamePatterns.join("; ")}`,
    naming.placeNamePatterns?.length &&
      `**Place names:** ${naming.placeNamePatterns.join("; ")}`,
    naming.titlePatterns?.length &&
      `**Titles:** ${naming.titlePatterns.join("; ")}`,
    naming.lineagePatterns?.length &&
      `**Lineages:** ${naming.lineagePatterns.join("; ")}`,
  ].filter(Boolean);
  return groups.length ? groups.join("\n\n") : "No additional naming rules.";
}

/** Render canonical language data for readers. Markdown is presentation only. */
export function renderLanguageProfile(profile: LanguageProfileV1): {
  content: string;
  lore: string;
} {
  const pronunciationRules = profile.phonology.pronunciationRules?.length
    ? `\n\n**Pronunciation rules:**\n${lines(profile.phonology.pronunciationRules)}`
    : "";
  const morphology = profile.morphology
    ? [
        profile.morphology.wordFormation &&
          `**Word formation:** ${profile.morphology.wordFormation}`,
        profile.morphology.prefixes?.length &&
          `**Prefixes:** ${profile.morphology.prefixes.join(", ")}`,
        profile.morphology.suffixes?.length &&
          `**Suffixes:** ${profile.morphology.suffixes.join(", ")}`,
        profile.morphology.compounding &&
          `**Compounding:** ${profile.morphology.compounding}`,
      ]
        .filter(Boolean)
        .join("\n\n")
    : "No additional morphology notes.";
  const vocabulary = profile.lexicon
    .map(
      (entry) =>
        `| ${tableCell(entry.word)} | ${tableCell(entry.pronunciation)} | ${tableCell(entry.meaning)} | ${tableCell(entry.partOfSpeech ?? "")} |`,
    )
    .join("\n");
  const phrases = profile.grammar.examples
    .map((example) => {
      const breakdown = example.breakdown ? ` — ${example.breakdown}` : "";
      return `- **${example.text}** (*${example.pronunciation}*) — ${example.translation}${breakdown}`;
    })
    .join("\n");

  const content = `## Pronunciation & Phonology
**Consonants:** ${list(profile.phonology.consonants)}

**Vowels:** ${list(profile.phonology.vowels)}

**Phonotactics:** ${list(profile.phonology.phonotactics)}
${profile.phonology.rhythm ? `\n**Rhythm:** ${profile.phonology.rhythm}` : ""}
${profile.phonology.stress ? `\n**Stress:** ${profile.phonology.stress}` : ""}${pronunciationRules}

## Cultural Role & Usage
${cultureText(profile)}

**Register:** ${profile.register.role}${profile.register.formality ? ` — ${profile.register.formality}` : ""}
${profile.register.socialRules?.length ? `\n\n${lines(profile.register.socialRules)}` : ""}

## Word Formation & Naming Conventions
${morphology}

${namingRules(profile)}

## Common Vocabulary & Word Bank
| Word | Pronunciation | Meaning | Part of Speech |
| --- | --- | --- | --- |
${vocabulary}

## Sample Phrases
${phrases}`;

  const names = profile.naming.examples
    .map(
      (example) =>
        `- **${example.name}** — ${example.meaning} (${example.use})`,
    )
    .join("\n");
  const lore = `### At a Glance
- **Genre / Setting:** ${profile.inputs.genre}
- **Tone:** ${profile.inputs.tone}
- **Role:** ${profile.inputs.role}
- **Name Structure:** ${profile.inputs.structure}
${profile.inputs.worldContext ? `- **World Context:** ${profile.inputs.worldContext}` : ""}

### Example Names
${names}

### At the Table
${lines(profile.tableUseTips)}`;

  return { content, lore };
}

/** Compact, populated-only guidance for downstream AI generators. */
export function renderLanguageProfilePrompt(
  profile: LanguageProfileV1,
): string {
  const sections = [
    `Sound inventory: consonants ${profile.phonology.consonants.join(", ")}; vowels ${profile.phonology.vowels.join(", ")}; phonotactics ${profile.phonology.phonotactics.join(", ")}`,
    profile.phonology.rhythm && `Rhythm: ${profile.phonology.rhythm}`,
    profile.phonology.stress && `Stress: ${profile.phonology.stress}`,
    profile.phonology.pronunciationRules?.length &&
      `Pronunciation rules: ${profile.phonology.pronunciationRules.join("; ")}`,
    profile.morphology?.wordFormation &&
      `Word formation: ${profile.morphology.wordFormation}`,
    profile.morphology?.prefixes?.length &&
      `Prefixes: ${profile.morphology.prefixes.join("; ")}`,
    profile.morphology?.suffixes?.length &&
      `Suffixes: ${profile.morphology.suffixes.join("; ")}`,
    profile.morphology?.compounding &&
      `Compounding: ${profile.morphology.compounding}`,
    profile.naming.personalNamePatterns?.length &&
      `Personal-name patterns: ${profile.naming.personalNamePatterns.join("; ")}`,
    profile.naming.placeNamePatterns?.length &&
      `Place-name patterns: ${profile.naming.placeNamePatterns.join("; ")}`,
    profile.naming.titlePatterns?.length &&
      `Title patterns: ${profile.naming.titlePatterns.join("; ")}`,
    profile.naming.lineagePatterns?.length &&
      `Lineage patterns: ${profile.naming.lineagePatterns.join("; ")}`,
    `Examples: ${profile.naming.examples
      .map((example) => `${example.name} (${example.use}: ${example.meaning})`)
      .join("; ")}`,
    `Useful terms: ${profile.lexicon
      .map((entry) => `${entry.word} = ${entry.meaning}`)
      .join("; ")}`,
    profile.grammar.phrasePatterns?.length &&
      `Phrase patterns: ${profile.grammar.phrasePatterns.join("; ")}`,
    profile.grammar.functionWords?.length &&
      `Function words: ${profile.grammar.functionWords.join("; ")}`,
    `Example phrases: ${profile.grammar.examples
      .map((example) => `${example.text} = ${example.translation}`)
      .join("; ")}`,
    `Register: ${profile.register.role}`,
    profile.register.formality && `Formality: ${profile.register.formality}`,
    profile.register.socialRules?.length &&
      `Social rules: ${profile.register.socialRules.join("; ")}`,
  ].filter((section): section is string => Boolean(section));
  return sections.join("\n");
}

/** Parse and structurally validate the shared versioned generation boundary. */
export function parseLanguageGenerationResult(
  value: unknown,
): LanguageGenerationResultV1 {
  return LanguageGenerationResultV1Schema.parse(value);
}

export function validateFallbackLanguageQuality(
  result: LanguageGenerationResultV1,
): LanguageValidationResult {
  const issues: string[] = [];
  if (result.labels.length === 0) {
    issues.push("Include at least one language label.");
  }
  if (uniqueCount(result.profile.lexicon.map((entry) => entry.word)) < 10) {
    issues.push("Include at least 10 unique vocabulary words.");
  }
  if (
    uniqueCount(result.profile.naming.examples.map((example) => example.name)) <
    3
  ) {
    issues.push("Include at least 3 unique example names.");
  }
  if (
    uniqueCount(
      result.profile.grammar.examples.map((example) => example.text),
    ) < 2
  ) {
    issues.push("Include at least 2 unique sample phrases.");
  }
  if (result.profile.tableUseTips.length < 2) {
    issues.push("Include at least 2 table-use tips.");
  }
  const requiredText = [
    result.title,
    result.summary,
    ...result.profile.phonology.consonants,
    ...result.profile.phonology.vowels,
    ...result.profile.phonology.phonotactics,
    ...result.profile.naming.examples.flatMap((example) => [
      example.name,
      example.meaning,
    ]),
    ...result.profile.lexicon.flatMap((entry) => [
      entry.word,
      entry.pronunciation,
      entry.meaning,
    ]),
    ...result.profile.grammar.examples.flatMap((example) => [
      example.text,
      example.pronunciation,
      example.translation,
    ]),
  ];
  if (requiredText.some((value) => PLACEHOLDER_VALUE.test(value.trim()))) {
    issues.push("Replace placeholder values in required language data.");
  }
  issues.push(...validateLanguageConsistency(result).issues);
  return validation(issues);
}

export function validateAILanguageQuality(
  result: LanguageGenerationResultV1,
): LanguageValidationResult {
  const issues = [...validateFallbackLanguageQuality(result).issues];
  if (result.profile.naming.examples.length < 4) {
    issues.push("Include at least 4 example names.");
  }
  if (result.profile.grammar.examples.length < 3) {
    issues.push("Include at least 3 sample phrases.");
  }
  if (result.profile.tableUseTips.length < 2) {
    issues.push("Include at least 2 table-use tips.");
  }
  if (
    !result.profile.culture ||
    !Object.values(result.profile.culture).some(Boolean)
  ) {
    issues.push("Include cultural context.");
  }
  if (!result.profile.phonology.rhythm) {
    issues.push("Describe the language rhythm.");
  }
  if (!result.profile.morphology) {
    issues.push("Include word-formation or morphology guidance.");
  }
  const naming = result.profile.naming;
  if (
    ![
      naming.personalNamePatterns,
      naming.placeNamePatterns,
      naming.titlePatterns,
      naming.lineagePatterns,
    ].some((patterns) => patterns?.length)
  ) {
    issues.push("Include at least one naming pattern.");
  }
  return validation([...new Set(issues)]);
}

export function validateLanguageInputFidelity(
  result: LanguageGenerationResultV1,
  expected: LanguageProfileInput,
): LanguageValidationResult {
  const issues: string[] = [];
  for (const key of ["genre", "tone", "role", "structure"] as const) {
    if (result.profile.inputs[key] !== expected[key]) {
      issues.push(
        `Preserve ${key} exactly as "${expected[key]}" in profile.inputs.${key}.`,
      );
    }
  }
  if (
    expected.worldContext &&
    result.profile.inputs.worldContext !== expected.worldContext
  ) {
    issues.push(
      "Preserve the supplied world context in profile.inputs.worldContext.",
    );
  }
  return validation(issues);
}

export function validateLanguageConsistency(
  result: LanguageGenerationResultV1,
): LanguageValidationResult {
  const issues: string[] = [];
  const lexicon = result.profile.lexicon.map((entry) =>
    entry.word.normalize("NFKD").toLocaleLowerCase(),
  );
  const groundedPhrases = result.profile.grammar.examples.filter((example) => {
    const phraseWords = words(example.text);
    return phraseWords.some((word) =>
      lexicon.some(
        (root) =>
          word === root ||
          (root.length >= 3 &&
            word.length >= 3 &&
            (word.startsWith(root) || root.startsWith(word))),
      ),
    );
  }).length;
  const requiredGroundedPhrases = Math.ceil(
    result.profile.grammar.examples.length / 2,
  );
  if (groundedPhrases < requiredGroundedPhrases) {
    issues.push(
      "Ground at least half of sample phrases in glossary words or transparent derivatives.",
    );
  }
  return validation(issues);
}

function normalizedName(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function isNameDerivative(value: string, banned: string): boolean {
  const candidate = normalizedName(value);
  const blocked = normalizedName(banned);
  return blocked.length > 0 && candidate.includes(blocked);
}

export function validateLanguageNameBans(
  result: LanguageGenerationResultV1,
  bannedNames: Iterable<string>,
): LanguageValidationResult {
  const blocked = [...bannedNames].filter((name) => normalizedName(name));
  const issues: string[] = [];
  const generatedNames = [
    result.title,
    ...result.profile.naming.examples.map((example) => example.name),
  ];

  for (const name of generatedNames) {
    const match = blocked.find((banned) => isNameDerivative(name, banned));
    if (match) {
      issues.push(
        `Generated name "${name}" derives from banned name "${match}".`,
      );
    }
  }

  for (const entry of result.profile.lexicon) {
    const word = normalizedName(entry.word);
    const match = blocked.find((banned) => word === normalizedName(banned));
    if (match) {
      issues.push(
        `Vocabulary word "${entry.word}" exactly matches banned name "${match}".`,
      );
    }
  }

  return validation(issues);
}
