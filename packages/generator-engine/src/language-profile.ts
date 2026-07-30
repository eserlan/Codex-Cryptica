import {
  LanguageGenerationResultV1Schema,
  type LanguageExampleComponent,
  type LanguageGenerationResultV1,
  type LanguageProfileV1,
  type LanguageProfileInput,
  type LanguageRuleDomain,
} from "schema";

export interface LanguageValidationResult {
  valid: boolean;
  issues: string[];
}

export interface LanguageQualityClassification {
  blockingIssues: string[];
  advisoryIssues: string[];
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

function normalizedForm(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function normalizedSpeech(value: string): string {
  return normalizedForm(value.replace(/[ˈˌ]/gu, ""));
}

function sourceIdNamespace(value: string): string {
  return value.split(/[-_:]/u, 1)[0].toLocaleLowerCase();
}

const SEMANTIC_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "their",
  "them",
  "they",
  "this",
  "to",
  "us",
  "we",
  "with",
]);

const ROLE_SUMMARY_EVIDENCE: Record<string, string> = {
  "common speech":
    "everyday daily everyone people public street home market trade conversation",
  "sacred / ritual tongue":
    "priest clergy temple shrine ceremony ceremonial chant prayer worship liturgy rite holy",
  "imperial standard":
    "court crown empire emperor official law administration decree bureaucracy province",
  "thieves' cant":
    "thief thieves covert secret underworld criminal smuggler code coded hidden illicit",
  "dead language":
    "extinct inscription ruin archive scholar recovered ancient untranslated no living speakers",
};

function semanticStem(value: string): string {
  if (value.length > 5 && value.endsWith("ing")) return value.slice(0, -3);
  if (value.length > 4 && value.endsWith("ed")) return value.slice(0, -2);
  if (value.length > 4 && value.endsWith("ies"))
    return `${value.slice(0, -3)}y`;
  if (value.length > 4 && /(ches|shes|sses|xes|zes)$/.test(value))
    return value.slice(0, -2);
  if (value.length > 3 && value.endsWith("s")) return value.slice(0, -1);
  return value;
}

function semanticTokens(value: string): Set<string> {
  return new Set(
    words(value)
      .filter((word) => !SEMANTIC_STOP_WORDS.has(word))
      .map(semanticStem),
  );
}

function roleSummaryEvidence(role: string): Set<string> {
  const evidence = ROLE_SUMMARY_EVIDENCE[role.trim().toLocaleLowerCase()];
  return new Set([
    ...semanticTokens(role),
    ...(evidence ? semanticTokens(evidence) : []),
  ]);
}

function unsupportedSemantics(target: string, support: string[]): string[] {
  const supported = new Set(
    support.flatMap((value) => [...semanticTokens(value)]),
  );
  return [...semanticTokens(target)].filter((token) => !supported.has(token));
}

interface LanguageSource {
  id: string;
  surface: string;
  pronunciation: string;
  meaning: string;
  syllables?: string[];
  morphemeKind?: "root" | "prefix" | "suffix" | "function-word" | "marker";
  partOfSpeech?: string;
  demonstrates?: string[];
}

function languageSources(
  profile: LanguageProfileV1,
  issues: string[],
): Map<string, LanguageSource> {
  const sources = new Map<string, LanguageSource>();
  const add = (source: LanguageSource, label: string) => {
    const existing = sources.get(source.id);
    if (existing) {
      const sameDeclaration =
        normalizedForm(existing.surface) === normalizedForm(source.surface) &&
        normalizedSpeech(existing.pronunciation) ===
          normalizedSpeech(source.pronunciation) &&
        normalizedForm(existing.meaning) === normalizedForm(source.meaning) &&
        normalizedForm((existing.syllables ?? []).join("")) ===
          normalizedForm((source.syllables ?? []).join(""));
      if (!sameDeclaration) {
        issues.push(
          `Language source id "${source.id}" is reused with conflicting form, pronunciation, meaning, or syllables.`,
        );
      } else if (source.morphemeKind) {
        sources.set(source.id, { ...existing, ...source });
      }
      return;
    }
    sources.set(source.id, source);
    if (!source.id.trim()) {
      issues.push(`${label} must have a non-empty source id.`);
    }
  };
  for (const entry of profile.lexicon) {
    if (!entry.id) continue;
    add(
      {
        id: entry.id,
        surface: entry.word,
        pronunciation: entry.pronunciation,
        meaning: entry.meaning,
        syllables: entry.syllables,
        partOfSpeech: entry.partOfSpeech,
        demonstrates: entry.demonstrates,
      },
      `Lexicon word "${entry.word}"`,
    );
  }
  for (const morpheme of profile.morphology?.morphemes ?? []) {
    add(
      {
        id: morpheme.id,
        surface: morpheme.form,
        pronunciation: morpheme.pronunciation,
        meaning: morpheme.meaning,
        syllables: morpheme.syllables,
        morphemeKind: morpheme.kind,
      },
      `Morpheme "${morpheme.form}"`,
    );
  }
  return sources;
}

function formatAffix(
  affix: string | { sourceId: string; form: string; meaning: string },
): string {
  return typeof affix === "string"
    ? affix
    : `${affix.form} (${affix.sourceId}) — ${affix.meaning}`;
}

function validateAffixes(
  profile: LanguageProfileV1,
  sources: Map<string, LanguageSource>,
  issues: string[],
): void {
  const morphology = profile.morphology;
  if (!morphology) return;
  const groups = [
    ["prefix", morphology.prefixes ?? []],
    ["suffix", morphology.suffixes ?? []],
  ] as const;
  for (const [kind, affixes] of groups) {
    for (const affix of affixes) {
      if (typeof affix === "string") continue;
      const source = sources.get(affix.sourceId);
      if (!source) {
        issues.push(
          `Declared ${kind} "${affix.form}" references undeclared morpheme "${affix.sourceId}".`,
        );
        continue;
      }
      if (source.morphemeKind !== kind) {
        issues.push(
          `Declared ${kind} "${affix.form}" references source "${affix.sourceId}" classified as "${source.morphemeKind ?? "ordinary root or lexicon word"}". Declare a distinct ${kind} morpheme for this use.`,
        );
      }
      if (
        normalizedForm(affix.form) !== normalizedForm(source.surface) ||
        normalizedForm(affix.meaning) !== normalizedForm(source.meaning)
      ) {
        issues.push(
          `Declared ${kind} "${affix.form}" must reuse the form and meaning of morpheme "${affix.sourceId}" exactly.`,
        );
      }
    }
  }
  const declaredAffixes = [
    ...(morphology.prefixes ?? []),
    ...(morphology.suffixes ?? []),
  ];
  const claimsNoAffixation =
    /\b(?:zero|no|without)\s+(?:inflectional\s+)?affix(?:ation|es|s)?\b/i.test(
      [morphology.wordFormation ?? "", morphology.compounding ?? ""].join(" "),
    );
  if (declaredAffixes.length && claimsNoAffixation) {
    issues.push(
      "Morphology claims zero affixation while declaring prefixes or suffixes; remove the affixes or correct the claim.",
    );
  }
}

function ruleDescriptions(profile: LanguageProfileV1): Map<string, string> {
  return new Map(
    (profile.rules ?? []).map((rule) => [rule.id, rule.description]),
  );
}

function validateComponents(params: {
  label: string;
  surface: string;
  pronunciation?: string;
  meaning: string;
  components: LanguageExampleComponent[];
  sources: Map<string, LanguageSource>;
  rules: Map<string, string>;
  ruleDomains: Map<string, LanguageRuleDomain>;
  issues: string[];
}): void {
  const {
    label,
    surface,
    pronunciation,
    meaning,
    components,
    sources,
    rules,
    ruleDomains,
    issues,
  } = params;
  if (
    normalizedForm(surface) !==
    normalizedForm(components.map((component) => component.surface).join(""))
  ) {
    issues.push(
      `${label} is not fully accounted for by its component surfaces.`,
    );
  }
  if (
    pronunciation &&
    normalizedSpeech(pronunciation) !==
      normalizedSpeech(
        components.map((component) => component.pronunciation).join(""),
      )
  ) {
    issues.push(
      `${label} pronunciation does not match its component pronunciations.`,
    );
  }

  const semanticSupport: string[] = [];
  for (const component of components) {
    const source = sources.get(component.sourceId);
    if (!source) {
      issues.push(
        `${label} references undeclared language source "${component.sourceId}".`,
      );
      continue;
    }
    semanticSupport.push(source.meaning);
    const changedSurface =
      normalizedForm(component.surface) !== normalizedForm(source.surface);
    if (
      changedSurface &&
      !component.appliedRuleIds?.some((ruleId) =>
        ["phonology", "morphology", "register"].includes(
          ruleDomains.get(ruleId) ?? "",
        ),
      )
    ) {
      issues.push(
        `${label} changes source "${component.sourceId}" without an applied phonology or morphology rule.`,
      );
    }
    if (!changedSurface) {
      if (
        normalizedSpeech(component.pronunciation) !==
        normalizedSpeech(source.pronunciation)
      ) {
        issues.push(
          `${label} changes pronunciation of "${source.surface}" without a surface-changing rule.`,
        );
      }
      if (
        normalizedForm(component.meaning) !== normalizedForm(source.meaning)
      ) {
        issues.push(
          `${label} changes meaning of "${source.surface}" without a surface-changing rule.`,
        );
      }
    }
    for (const ruleId of component.appliedRuleIds ?? []) {
      const description = rules.get(ruleId);
      if (!description) {
        issues.push(`${label} references undeclared rule "${ruleId}".`);
      } else {
        semanticSupport.push(description);
      }
    }
  }

  const unsupported = unsupportedSemantics(meaning, semanticSupport);
  if (unsupported.length) {
    issues.push(
      `${label} has unsupported meaning: ${unsupported.join(", ")}. Add one ordered component with its own sourceId for every root or morpheme used.`,
    );
  }
}

function phonologicalShapes(
  syllable: string,
  consonants: string[],
  vowels: string[],
): Set<string> {
  const remaining = normalizedForm(syllable);
  const inventory = [
    ...consonants.map((unit) => ({
      unit: normalizedForm(unit),
      shape: "C",
    })),
    ...vowels.map((unit) => ({ unit: normalizedForm(unit), shape: "V" })),
  ]
    .filter((entry) => entry.unit)
    .sort((a, b) => b.unit.length - a.unit.length);
  const memo = new Map<number, Set<string>>();
  const shapesFrom = (index: number): Set<string> => {
    if (index === remaining.length) return new Set([""]);
    const cached = memo.get(index);
    if (cached) return cached;
    const shapes = new Set<string>();
    for (const entry of inventory) {
      if (!remaining.startsWith(entry.unit, index)) continue;
      for (const suffix of shapesFrom(index + entry.unit.length)) {
        shapes.add(`${entry.shape}${suffix}`);
      }
    }
    memo.set(index, shapes);
    return shapes;
  };
  return shapesFrom(0);
}

function validateSyllables(
  profile: LanguageProfileV1,
  sources: Map<string, LanguageSource>,
  issues: string[],
): void {
  const patterns = profile.phonology.syllablePatterns ?? [];
  if (!patterns.length) return;
  const validPatterns = new Set(
    patterns
      .map((pattern) => pattern.trim().toUpperCase())
      .filter((pattern) => /^[CV]+$/.test(pattern)),
  );
  if (validPatterns.size !== patterns.length) {
    issues.push("Machine-readable syllable patterns may contain only C and V.");
  }
  const validateSurface = (
    label: string,
    surface: string,
    syllables: string[] | undefined,
  ) => {
    if (!syllables?.length) return;
    if (normalizedForm(surface) !== normalizedForm(syllables.join(""))) {
      issues.push(`${label} is not fully accounted for by its syllables.`);
    }
    for (const syllable of syllables) {
      const shapes = phonologicalShapes(
        syllable,
        profile.phonology.consonants,
        profile.phonology.vowels,
      );
      if (![...shapes].some((shape) => validPatterns.has(shape))) {
        issues.push(
          `${label} uses syllable "${syllable}" outside the declared sound inventory or syllable patterns.`,
        );
      }
    }
  };
  for (const source of sources.values()) {
    validateSurface(`Source "${source.id}"`, source.surface, source.syllables);
  }
  for (const example of resultExamples(profile)) {
    for (const component of example.components ?? []) {
      const source = sources.get(component.sourceId);
      if (
        source &&
        normalizedForm(component.surface) === normalizedForm(source.surface) &&
        normalizedForm((component.syllables ?? []).join("")) ===
          normalizedForm((source.syllables ?? []).join(""))
      ) {
        continue;
      }
      validateSurface(
        `Component "${component.surface}"`,
        component.surface,
        component.syllables,
      );
    }
  }
}

function resultExamples(profile: LanguageProfileV1) {
  return [...profile.naming.examples, ...profile.grammar.examples];
}

function phraseHasSyntacticEvidence(
  example: LanguageProfileV1["grammar"]["examples"][number],
  sources: Map<string, LanguageSource>,
  ruleDomains: Map<string, LanguageRuleDomain>,
): boolean {
  if (!example.construction || !example.components?.length) return false;
  const slots = example.components.map((component) =>
    normalizedForm(component.slot ?? ""),
  );
  const hasSlot = (...names: string[]) =>
    slots.some((slot) => names.some((name) => slot.includes(name)));
  const hasAction = example.components.some((component, index) => {
    if (
      !["verb", "action", "predicate", "copula", "command", "imperative"].some(
        (name) => slots[index].includes(name),
      )
    ) {
      return false;
    }
    const source = sources.get(component.sourceId);
    return (
      /\bverb\b/i.test(source?.partOfSpeech ?? "") ||
      ["function-word", "marker"].includes(source?.morphemeKind ?? "") ||
      (component.appliedRuleIds ?? []).some(
        (ruleId) => ruleDomains.get(ruleId) === "grammar",
      ) ||
      example.construction === "predicate"
    );
  });
  switch (example.construction) {
    case "declarative":
      return hasSlot("subject") && hasAction;
    case "command":
      return hasAction;
    case "possession":
      return hasSlot("possessor") && hasSlot("possessed", "possession");
    case "predicate":
      return hasSlot("subject") && hasSlot("predicate", "copula");
    case "question":
      return hasSlot("question", "interrogative") && hasAction;
    case "ritual":
      return hasSlot("ritual", "invocation", "marker") && hasAction;
    case "other":
      return new Set(slots.filter(Boolean)).size >= 2 && hasAction;
  }
}

function longestCommonPrefix(a: string, b: string): string {
  let index = 0;
  while (index < a.length && a[index] === b[index]) index += 1;
  return a.slice(0, index);
}

function longestCommonSuffix(a: string, b: string): string {
  let length = 0;
  while (
    length < a.length &&
    length < b.length &&
    a[a.length - 1 - length] === b[b.length - 1 - length]
  ) {
    length += 1;
  }
  return length ? a.slice(a.length - length) : "";
}

function orthographicUnits(
  surface: string,
  profile: LanguageProfileV1,
): string[] | undefined {
  const remaining = normalizedForm(surface);
  const inventory = [
    ...profile.phonology.consonants,
    ...profile.phonology.vowels,
  ]
    .map(normalizedForm)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const units: string[] = [];
  let index = 0;
  while (index < remaining.length) {
    const unit = inventory.find((candidate) =>
      remaining.startsWith(candidate, index),
    );
    if (!unit) return undefined;
    units.push(unit);
    index += unit.length;
  }
  return units;
}

function validateGraphemeConsistency(
  profile: LanguageProfileV1,
  sources: Map<string, LanguageSource>,
  rules: Map<string, string>,
  ruleDomains: Map<string, LanguageRuleDomain>,
  issues: string[],
): void {
  const values = [...sources.values()];
  const hasContextRule = (source: LanguageSource, graphemes: string[]) =>
    (source.demonstrates ?? []).some((ruleId) => {
      if (ruleDomains.get(ruleId) !== "phonology") return false;
      const description = normalizedForm(rules.get(ruleId) ?? "");
      return graphemes.some((grapheme) =>
        description.includes(normalizedForm(grapheme)),
      );
    });
  for (let leftIndex = 0; leftIndex < values.length; leftIndex += 1) {
    const left = values[leftIndex];
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < values.length;
      rightIndex += 1
    ) {
      const right = values[rightIndex];
      if (
        normalizedForm(left.surface) === normalizedForm(right.surface) &&
        normalizedSpeech(left.pronunciation) !==
          normalizedSpeech(right.pronunciation) &&
        !hasContextRule(left, [left.surface]) &&
        !hasContextRule(right, [right.surface])
      ) {
        issues.push(
          `Repeated form "${left.surface}" has inconsistent pronunciations "${left.pronunciation}" and "${right.pronunciation}" without a demonstrated contextual phonology rule.`,
        );
        continue;
      }
      const leftUnits = orthographicUnits(left.surface, profile);
      const rightUnits = orthographicUnits(right.surface, profile);
      if (!leftUnits || !rightUnits || leftUnits.length !== rightUnits.length) {
        continue;
      }
      const differences = leftUnits
        .map((unit, index) => (unit === rightUnits[index] ? -1 : index))
        .filter((index) => index >= 0);
      if (differences.length !== 1 || leftUnits.length < 3) continue;
      const difference = differences[0];
      const shared = leftUnits.filter((_, index) => index !== difference);
      if (hasContextRule(left, shared) || hasContextRule(right, shared)) {
        continue;
      }
      const leftSpeech = normalizedSpeech(left.pronunciation);
      const rightSpeech = normalizedSpeech(right.pronunciation);
      const preservedBefore =
        difference === 0 ||
        longestCommonPrefix(leftSpeech, rightSpeech).length > 0;
      const preservedAfter =
        difference === leftUnits.length - 1 ||
        longestCommonSuffix(leftSpeech, rightSpeech).length > 0;
      if (!preservedBefore || !preservedAfter) {
        issues.push(
          `Shared graphemes "${shared.join("")}" have inconsistent pronunciation in "${left.surface}" and "${right.surface}" without a demonstrated contextual phonology rule.`,
        );
      }
    }
  }
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
    naming.structuredPatterns?.length &&
      `**Structured patterns:** ${naming.structuredPatterns
        .map(
          (pattern) =>
            `${pattern.id} (${pattern.use}, ${pattern.structure}): ${pattern.slots.join(" + ")}`,
        )
        .join("; ")}`,
  ].filter(Boolean);
  return groups.length ? groups.join("\n\n") : "No additional naming rules.";
}

function componentBreakdown(
  components: LanguageExampleComponent[] | undefined,
): string {
  return components?.length
    ? components
        .map((component) => `${component.surface} [${component.meaning}]`)
        .join(" + ")
    : "";
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
          `**Prefixes:** ${profile.morphology.prefixes.map(formatAffix).join(", ")}`,
        profile.morphology.suffixes?.length &&
          `**Suffixes:** ${profile.morphology.suffixes.map(formatAffix).join(", ")}`,
        profile.morphology.compounding &&
          `**Compounding:** ${profile.morphology.compounding}`,
        profile.morphology.morphemes?.length &&
          `**Declared morphemes:**\n${profile.morphology.morphemes
            .map(
              (morpheme) =>
                `- **${morpheme.form}** (${morpheme.id}, ${morpheme.kind}; ${morpheme.pronunciation}) — ${morpheme.meaning}`,
            )
            .join("\n")}`,
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
      const analysis =
        componentBreakdown(example.components) || example.breakdown;
      const breakdown = analysis ? ` — ${analysis}` : "";
      const literal = example.literalTranslation
        ? ` (literally: ${example.literalTranslation})`
        : "";
      return `- **${example.text}** (*${example.pronunciation}*) — ${example.translation}${literal}${breakdown}`;
    })
    .join("\n");
  const rules = profile.rules?.length
    ? profile.rules
        .map(
          (rule) => `- **${rule.id}** (${rule.domain}) — ${rule.description}`,
        )
        .join("\n")
    : "- No structured rules.";

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

### Demonstrated Rules
${rules}

## Common Vocabulary & Word Bank
| Word | Pronunciation | Meaning | Part of Speech |
| --- | --- | --- | --- |
${vocabulary}

## Sample Phrases
${phrases}`;

  const names = profile.naming.examples
    .map((example) => {
      const analysis = componentBreakdown(example.components);
      return `- **${example.name}**${example.pronunciation ? ` (*${example.pronunciation}*)` : ""} — ${example.meaning} (${example.use})${analysis ? ` — ${analysis}` : ""}`;
    })
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
      `Prefixes: ${profile.morphology.prefixes.map(formatAffix).join("; ")}`,
    profile.morphology?.suffixes?.length &&
      `Suffixes: ${profile.morphology.suffixes.map(formatAffix).join("; ")}`,
    profile.morphology?.compounding &&
      `Compounding: ${profile.morphology.compounding}`,
    profile.rules?.length &&
      `Structured rules: ${profile.rules
        .map((rule) => `Rule ${rule.id} (${rule.domain}) = ${rule.description}`)
        .join("; ")}`,
    profile.morphology?.morphemes?.length &&
      `Declared morphemes: ${profile.morphology.morphemes
        .map(
          (morpheme) =>
            `Morpheme ${morpheme.id}: ${morpheme.form} (${morpheme.pronunciation}) = ${morpheme.meaning}`,
        )
        .join("; ")}`,
    profile.naming.personalNamePatterns?.length &&
      `Personal-name patterns: ${profile.naming.personalNamePatterns.join("; ")}`,
    profile.naming.placeNamePatterns?.length &&
      `Place-name patterns: ${profile.naming.placeNamePatterns.join("; ")}`,
    profile.naming.titlePatterns?.length &&
      `Title patterns: ${profile.naming.titlePatterns.join("; ")}`,
    profile.naming.lineagePatterns?.length &&
      `Lineage patterns: ${profile.naming.lineagePatterns.join("; ")}`,
    profile.naming.structuredPatterns?.length &&
      `Structured naming patterns: ${profile.naming.structuredPatterns
        .map(
          (pattern) =>
            `Pattern ${pattern.id} (${pattern.use}, ${pattern.structure}) = ${pattern.slots.join(" + ")}`,
        )
        .join("; ")}`,
    `Examples: ${profile.naming.examples
      .map((example) => {
        const analysis = componentBreakdown(example.components);
        return `${example.name} (${example.use}: ${example.meaning}${example.patternId ? `; pattern ${example.patternId}` : ""}${analysis ? `; ${analysis}` : ""})`;
      })
      .join("; ")}`,
    `Useful terms: ${profile.lexicon
      .map((entry) => `${entry.word} = ${entry.meaning}`)
      .join("; ")}`,
    profile.grammar.phrasePatterns?.length &&
      `Phrase patterns: ${profile.grammar.phrasePatterns.join("; ")}`,
    profile.grammar.functionWords?.length &&
      `Function words: ${profile.grammar.functionWords.join("; ")}`,
    `Example phrases: ${profile.grammar.examples
      .map((example) => {
        const analysis = componentBreakdown(example.components);
        return `${example.text} = ${example.translation}${example.literalTranslation ? `; literally ${example.literalTranslation}` : ""}${analysis ? `; ${analysis}` : ""}`;
      })
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
  const result = LanguageGenerationResultV1Schema.parse(value);
  const sources: LanguageSource[] = [
    ...result.profile.lexicon
      .filter((entry) => entry.id)
      .map((entry) => ({
        id: entry.id!,
        surface: entry.word,
        pronunciation: entry.pronunciation,
        meaning: entry.meaning,
        syllables: entry.syllables,
      })),
    ...(result.profile.morphology?.morphemes ?? []).map((morpheme) => ({
      id: morpheme.id,
      surface: morpheme.form,
      pronunciation: morpheme.pronunciation,
      meaning: morpheme.meaning,
      syllables: morpheme.syllables,
    })),
  ];
  const declaredIds = new Set(sources.map((source) => source.id));
  const components = [
    ...result.profile.naming.examples.flatMap(
      (example) => example.components ?? [],
    ),
    ...result.profile.grammar.examples.flatMap(
      (example) => example.components ?? [],
    ),
  ];
  for (const component of components) {
    if (!component.sourceId || declaredIds.has(component.sourceId)) continue;
    const matches = sources.filter(
      (source) =>
        normalizedForm(source.surface) === normalizedForm(component.surface) &&
        normalizedSpeech(source.pronunciation) ===
          normalizedSpeech(component.pronunciation) &&
        normalizedForm(source.meaning) === normalizedForm(component.meaning),
    );
    const namespaceMatches =
      matches.length > 1
        ? matches.filter(
            (source) =>
              sourceIdNamespace(source.id) ===
              sourceIdNamespace(component.sourceId!),
          )
        : matches;
    if (namespaceMatches.length === 1) {
      component.sourceId = namespaceMatches[0].id;
    }
  }
  return result;
}

export function buildLanguageRepairPrompt(
  raw: string,
  issues: string[],
  originalPrompt?: string,
): string {
  const identityNeedsRepair = issues.some(
    (issue) =>
      /\b(title|summary)\b/i.test(issue) &&
      !/title itself as a component-derived naming example/i.test(issue),
  );
  const structuralRepair = issues.some((issue) =>
    /structural validation failed/i.test(issue),
  );
  const identityInstruction = identityNeedsRepair
    ? "The validation problems implicate identity fields, so recompute title or summary from the complete resolved request where needed."
    : "Preserve the existing title and summary exactly; neither identity field is implicated by the validation problems.";
  const repairGuidance = [
    issues.some((issue) => /unsupported translation meaning/i.test(issue)) &&
      "For an unsupported phrase translation, use only meanings supplied by its components and demonstrated rules. Do not turn a noun into a verb or add a related English concept unless a demonstrated rule supplies that meaning.",
    issues.some((issue) => /changes source|unsupported meaning/i.test(issue)) &&
      "For an inconsistent name component, either reuse its source form, pronunciation, and meaning exactly or split every visible root into its own ordered component and sourceId. Never bundle multiple roots under one source.",
    issues.some((issue) =>
      /not fully accounted|pronunciation does not match/i.test(issue),
    ) &&
      "Make each implicated example text/name and pronunciation the exact ordered concatenation of its component surfaces and pronunciations. Component surfaces must be non-overlapping substrings: do not delete, duplicate, or share a boundary grapheme. If an unchanged title has no suitable source for its remaining substring, declare a new root or morpheme whose form, pronunciation, meaning, and syllables exactly account for that remainder.",
    issues.some((issue) => /rule .*not demonstrated/i.test(issue)) &&
      "For an undemonstrated rule, make one existing example visibly exhibit it and cite its id, or remove the rule and any prose claim that depends on it. Merely adding the id to demonstrates is not sufficient.",
    issues.some((issue) =>
      /declared (?:prefix|suffix)|zero affixation|structured sourceId/i.test(
        issue,
      ),
    ) &&
      "Repair affixes from the declared morpheme table: each non-empty prefix/suffix entry must reference one matching-kind morpheme and copy its form and meaning exactly. Prefer empty affix arrays when the language does not use affixation.",
    issues.some((issue) =>
      /structured syntax|syntactic relationship|grammatical component slots|construction/i.test(
        issue,
      ),
    ) &&
      "Repair each implicated phrase as a real clause or grammatical construction. Reclassify a copula-less subject + quality as construction predicate with subject/predicate slots. A formulaic greeting needs a declared greeting or register rule that supplies that function; otherwise replace it with a clause whose component meanings support the translation. Declaratives require a declared verb/action component. Set every component.slot and cite grammar rules only where the phrase visibly demonstrates them.",
    issues.some((issue) =>
      /shared graphemes|inconsistent pronunciation/i.test(issue),
    ) &&
      "Make repeated graphemes use the same pronunciation. If variation is essential, declare one contextual phonology rule and visibly demonstrate it in the affected lexical examples.",
    issues.some((issue) =>
      /outside the declared sound inventory or syllable patterns|machine-readable syllable patterns/i.test(
        issue,
      ),
    ) &&
      "Repair the phonology declaration from the existing generated forms. For every flagged syllable, segment its exact spelling with declared consonant and vowel units, add any genuinely used orthographic unit to the correct inventory, and add its actual C/V shape to syllablePatterns. Prefer widening an inaccurately narrow declaration over rewriting otherwise consistent words, names, or morphemes.",
    issues.some((issue) =>
      /language title itself as a component-derived naming example/i.test(
        issue,
      ),
    ) &&
      "Add the existing language title to naming.examples without changing it. Split its spelling and pronunciation into non-overlapping ordered component substrings that concatenate exactly. Reuse matching declared sources where possible; otherwise declare a root or morpheme for the exact unaccounted remainder rather than borrowing an almost-matching form.",
    issues.some((issue) => /does not follow pattern/i.test(issue)) &&
      'Repair the implicated naming example against its structured pattern: example.use must equal pattern.use, and component slots must exactly match pattern.slots in order. If the language title uses use "other", add or select an "other" pattern with the selected naming structure instead of changing the title.',
  ].filter((instruction): instruction is string => Boolean(instruction));
  const resolvedOriginalPrompt = originalPrompt
    ? structuralRepair
      ? originalPrompt.trim()
      : originalPrompt
          .slice(
            0,
            Math.min(
              originalPrompt.indexOf("Return a valid JSON object") === -1
                ? originalPrompt.length
                : originalPrompt.indexOf("Return a valid JSON object"),
              8_000,
            ),
          )
          .trim()
    : "";
  return `Repair the following language-generator response. Return one complete replacement JSON object matching LanguageGenerationResultV1, with no markdown fence or commentary.

Validation problems:
${issues.map((issue) => `- ${issue}`).join("\n")}

Make the smallest possible correction for each listed problem. Preserve every field and collection item that is not implicated by a validation problem; do not replace valid vocabulary, names, rules, or examples with new material. ${identityInstruction}
Correct or remove unsupported claims; do not preserve inconsistent detail merely because it appeared in the previous response.
${repairGuidance.length ? `\nIssue-specific repair guidance:\n${repairGuidance.map((instruction) => `- ${instruction}`).join("\n")}\n` : ""}
${resolvedOriginalPrompt ? `\nOriginal resolved request${structuralRepair ? " (full schema included for structural repair)" : " (schema omitted)"}:\n${resolvedOriginalPrompt}\n` : ""}
Previous response:
${raw}`;
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
  const rules = result.profile.rules ?? [];
  if (!rules.length) {
    issues.push("Include structured language rules with stable ids.");
  }
  if (!result.profile.phonology.syllablePatterns?.length) {
    issues.push("Include machine-readable syllable patterns.");
  }
  if (!result.profile.morphology?.morphemes?.length) {
    issues.push("Include declared morphemes with stable ids.");
  }
  if (
    [
      ...(result.profile.morphology?.prefixes ?? []),
      ...(result.profile.morphology?.suffixes ?? []),
    ].some((affix) => typeof affix === "string")
  ) {
    issues.push(
      "Represent every non-empty prefix and suffix as a structured sourceId, form, and meaning reference to a declared affix morpheme; otherwise use an empty collection.",
    );
  }
  if (!result.profile.naming.structuredPatterns?.length) {
    issues.push("Include structured naming patterns with ordered slots.");
  }
  if (
    result.profile.lexicon.some(
      (entry) => !entry.id || !entry.syllables?.length,
    )
  ) {
    issues.push(
      "Give every AI lexicon entry a stable id and syllable analysis.",
    );
  }
  if (
    result.profile.naming.examples.some(
      (example) =>
        !example.pronunciation ||
        !example.patternId ||
        !example.components?.length ||
        example.components.some((component) => !component.syllables?.length),
    )
  ) {
    issues.push(
      "Give every AI name pronunciation, pattern, component analyses, and demonstrated rule ids.",
    );
  }
  if (
    result.profile.grammar.examples.some(
      (example) =>
        !example.construction ||
        !example.literalTranslation ||
        !example.components?.length ||
        example.components.some(
          (component) => !component.slot || !component.syllables?.length,
        ),
    )
  ) {
    issues.push(
      "Give every AI phrase a construction type, literal translation, grammatical component slots, and component analyses.",
    );
  }
  const syntaxSources = languageSources(result.profile, []);
  const syntaxRuleDomains = new Map(
    (result.profile.rules ?? []).map((rule) => [rule.id, rule.domain]),
  );
  const syntacticPhraseCount = result.profile.grammar.examples.filter(
    (example) =>
      phraseHasSyntacticEvidence(example, syntaxSources, syntaxRuleDomains),
  ).length;
  if (syntacticPhraseCount < 3) {
    issues.push(
      "Include at least 3 phrase examples that demonstrate structured syntax; standalone compounds or noun strings do not count.",
    );
  }
  if (
    !result.profile.naming.examples.some(
      (example) =>
        normalizedForm(example.name) === normalizedForm(result.title) &&
        Boolean(example.components?.length),
    )
  ) {
    issues.push(
      "Include the language title itself as a component-derived naming example using declared sources.",
    );
  }
  return validation([...new Set(issues)]);
}

const BLOCKING_LANGUAGE_QUALITY_ISSUE_PATTERNS = [
  /conflicting pronunciation or meaning/i,
  /source id .* reused with conflicting/i,
  /must have a non-empty source id/i,
  /references undeclared (?:language source|morpheme|rule|naming pattern)/i,
  /changes (?:source|pronunciation|meaning)/i,
  /repeated form .* has inconsistent pronunciations/i,
  /structured (?:language rule|naming pattern) ids must be unique/i,
  /classified as .*declare a distinct/i,
  /must reuse the form and meaning/i,
  /claims zero affixation while declaring/i,
];

/**
 * Separates contradictions that make a profile unsafe to reuse from formal
 * completeness gaps that merit repair but should not discard useful output.
 */
export function classifyAILanguageQuality(
  result: LanguageGenerationResultV1,
): LanguageQualityClassification {
  const blockingIssues: string[] = [];
  const advisoryIssues: string[] = [];
  for (const issue of validateAILanguageQuality(result).issues) {
    if (
      BLOCKING_LANGUAGE_QUALITY_ISSUE_PATTERNS.some((pattern) =>
        pattern.test(issue),
      )
    ) {
      blockingIssues.push(issue);
    } else {
      advisoryIssues.push(issue);
    }
  }
  return { blockingIssues, advisoryIssues };
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
  const summaryTokens = semanticTokens(result.summary);
  const roleTokens = roleSummaryEvidence(expected.role);
  if (
    roleTokens.size > 0 &&
    ![...roleTokens].some((token) => summaryTokens.has(token))
  ) {
    issues.push(
      `Make the summary visibly identify the "${expected.role}" language role.`,
    );
  }
  return validation(issues);
}

export function validateLanguageConsistency(
  result: LanguageGenerationResultV1,
): LanguageValidationResult {
  const issues: string[] = [];
  const lexiconDeclarations = new Map<
    string,
    { pronunciation: string; meaning: string; partOfSpeech: string }
  >();
  for (const entry of result.profile.lexicon) {
    const word = normalizedForm(entry.word);
    const declaration = {
      pronunciation: normalizedSpeech(entry.pronunciation),
      meaning: normalizedForm(entry.meaning),
      partOfSpeech: normalizedForm(entry.partOfSpeech ?? ""),
    };
    const prior = lexiconDeclarations.get(word);
    if (
      prior &&
      (prior.pronunciation !== declaration.pronunciation ||
        prior.meaning !== declaration.meaning ||
        prior.partOfSpeech !== declaration.partOfSpeech)
    ) {
      issues.push(
        `Lexicon word "${entry.word}" has conflicting pronunciation or meaning.`,
      );
    } else {
      lexiconDeclarations.set(word, declaration);
    }
  }

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

  const rules = ruleDescriptions(result.profile);
  const ruleDomains = new Map(
    (result.profile.rules ?? []).map((rule) => [rule.id, rule.domain]),
  );
  if (rules.size !== (result.profile.rules?.length ?? 0)) {
    issues.push("Structured language rule ids must be unique.");
  }
  const sources = languageSources(result.profile, issues);
  validateSyllables(result.profile, sources, issues);
  validateAffixes(result.profile, sources, issues);
  validateGraphemeConsistency(
    result.profile,
    sources,
    rules,
    ruleDomains,
    issues,
  );

  const demonstratedRules = new Set<string>();
  const recordDemonstrations = (
    label: string,
    ruleIds: string[] | undefined,
    supportsDomain: (domain: LanguageRuleDomain) => boolean,
  ) => {
    for (const ruleId of ruleIds ?? []) {
      if (!rules.has(ruleId)) {
        issues.push(`${label} references undeclared rule "${ruleId}".`);
      } else if (!supportsDomain(ruleDomains.get(ruleId)!)) {
        const domain = ruleDomains.get(ruleId)!;
        issues.push(
          domain === "grammar"
            ? `${label} cites grammar rule "${ruleId}" but does not demonstrate a structured syntactic relationship.`
            : `${label} cannot demonstrate ${domain} rule "${ruleId}" in this example type.`,
        );
      } else {
        demonstratedRules.add(ruleId);
      }
    }
  };
  for (const entry of result.profile.lexicon) {
    recordDemonstrations(
      `Lexicon word "${entry.word}"`,
      entry.demonstrates,
      (domain) => domain === "phonology",
    );
  }

  const patterns = new Map(
    (result.profile.naming.structuredPatterns ?? []).map((pattern) => [
      pattern.id,
      pattern,
    ]),
  );
  if (
    patterns.size !== (result.profile.naming.structuredPatterns?.length ?? 0)
  ) {
    issues.push("Structured naming pattern ids must be unique.");
  }
  for (const pattern of patterns.values()) {
    if (pattern.structure !== result.profile.inputs.structure) {
      issues.push(
        `Naming pattern "${pattern.id}" does not visibly use selected structure "${result.profile.inputs.structure}".`,
      );
    }
  }

  for (const example of result.profile.naming.examples) {
    const label = `Name "${example.name}"`;
    if (!example.components?.length) continue;
    validateComponents({
      label,
      surface: example.name,
      pronunciation: example.pronunciation,
      meaning: example.meaning,
      components: example.components,
      sources,
      rules,
      ruleDomains,
      issues,
    });
    const pattern = example.patternId
      ? patterns.get(example.patternId)
      : undefined;
    let followsPattern = false;
    if (!pattern) {
      if (example.patternId) {
        issues.push(
          `${label} references undeclared naming pattern "${example.patternId}".`,
        );
      }
    } else {
      const slots = example.components.map((component) => component.slot ?? "");
      followsPattern =
        pattern.use === example.use &&
        slots.length === pattern.slots.length &&
        slots.every((slot, index) => slot === pattern.slots[index]);
      if (!followsPattern) {
        issues.push(`${label} does not follow pattern "${pattern.id}".`);
      }
    }
    const appliedRuleIds = new Set(
      example.components.flatMap((component) => component.appliedRuleIds ?? []),
    );
    recordDemonstrations(label, example.demonstrates, (domain) => {
      if (domain === "naming") return followsPattern;
      if (domain === "morphology") return example.components!.length > 1;
      if (domain === "register") return true;
      if (domain === "phonology") {
        return (example.demonstrates ?? []).some((ruleId) =>
          appliedRuleIds.has(ruleId),
        );
      }
      return false;
    });
  }

  for (const example of result.profile.grammar.examples) {
    const label = `Phrase "${example.text}"`;
    const syntacticEvidence = phraseHasSyntacticEvidence(
      example,
      sources,
      ruleDomains,
    );
    for (const ruleId of example.demonstrates ?? []) {
      recordDemonstrations(label, [ruleId], (domain) => {
        if (domain === "grammar" || domain === "register") {
          return syntacticEvidence;
        }
        return (example.components ?? []).some((component) =>
          component.appliedRuleIds?.includes(ruleId),
        );
      });
    }
    if (example.construction && !syntacticEvidence) {
      issues.push(
        `${label} declares a ${example.construction} construction without compatible grammatical component slots and an action, predicate, or marker.`,
      );
    }
    if (!example.components?.length) continue;
    validateComponents({
      label,
      surface: example.text,
      pronunciation: example.pronunciation,
      meaning: example.literalTranslation ?? example.translation,
      components: example.components,
      sources,
      rules,
      ruleDomains,
      issues,
    });
    if (example.literalTranslation) {
      const support = example.components.flatMap((component) => [
        component.meaning,
        sources.get(component.sourceId)?.meaning ?? "",
        ...(component.appliedRuleIds ?? [])
          .map((ruleId) => rules.get(ruleId))
          .filter((description): description is string => Boolean(description)),
      ]);
      const unsupportedLiteral = unsupportedSemantics(
        example.literalTranslation,
        support,
      );
      if (unsupportedLiteral.length) {
        issues.push(
          `${label} has unsupported literal translation meaning: ${unsupportedLiteral.join(", ")}.`,
        );
      }
      const demonstrated = (example.demonstrates ?? [])
        .map((ruleId) => rules.get(ruleId))
        .filter((description): description is string => Boolean(description));
      const unsupportedTranslation = unsupportedSemantics(example.translation, [
        example.text,
        ...support,
        ...demonstrated,
      ]);
      if (unsupportedTranslation.length) {
        issues.push(
          `${label} has unsupported translation meaning: ${unsupportedTranslation.join(", ")}.`,
        );
      }
    }
  }

  for (const component of [
    ...result.profile.naming.examples.flatMap(
      (example) => example.components ?? [],
    ),
    ...result.profile.grammar.examples.flatMap(
      (example) => example.components ?? [],
    ),
  ]) {
    recordDemonstrations(
      `Component "${component.surface}"`,
      component.appliedRuleIds,
      (domain) =>
        domain === "phonology" ||
        domain === "morphology" ||
        domain === "register",
    );
  }
  for (const ruleId of rules.keys()) {
    if (!demonstratedRules.has(ruleId)) {
      issues.push(
        `Structured language rule "${ruleId}" is not demonstrated by any example.`,
      );
    }
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
