import { describe, expect, it } from "vitest";
import type { LanguageGenerationResultV1 } from "schema";
import {
  buildLanguageRepairPrompt,
  classifyAILanguageQuality,
  parseLanguageGenerationResult,
  renderLanguageProfile,
  renderLanguageProfilePrompt,
  validateAILanguageQuality,
  validateFallbackLanguageQuality,
  validateLanguageConsistency,
  validateLanguageInputFidelity,
  validateLanguageNameBans,
} from "./language-profile";

describe("language profile repair prompt", () => {
  it("focuses semantic and source repairs without repeating the full schema", () => {
    const prompt = buildLanguageRepairPrompt(
      '{"title":"Aelori"}',
      [
        'Name "Lumuva" changes source "LEX_05" without an applied rule.',
        'Phrase "Lumi mira lima" has unsupported translation meaning: illuminate.',
        'Structured language rule "R_REG_01" is not demonstrated by any example.',
      ],
      "Parameters:\n- Tone / Style: Lyrical\n\nReturn a valid JSON object matching this structure exactly.\n{large schema}",
    );

    expect(prompt).toContain("Do not turn a noun into a verb");
    expect(prompt).toContain("Never bundle multiple roots under one source");
    expect(prompt).toContain("Merely adding the id to demonstrates");
    expect(prompt).toContain("- Tone / Style: Lyrical");
    expect(prompt).not.toContain("{large schema}");
  });

  it("retains the full schema when repairing structural output", () => {
    const prompt = buildLanguageRepairPrompt(
      '{"title":"Aelori"}',
      [
        "Structural validation failed: naming.examples expected objects, received strings.",
      ],
      "Parameters:\n- Tone / Style: Lyrical\n\nReturn a valid JSON object matching this structure exactly.\n{large schema}",
    );

    expect(prompt).toContain(
      "Original resolved request (full schema included for structural repair)",
    );
    expect(prompt).toContain("{large schema}");
  });

  it("targets narrow phonotactics and non-syntactic phrase repairs", () => {
    const prompt = buildLanguageRepairPrompt(
      '{"title":"Aeluri"}',
      [
        'Source "lex-aelur" uses syllable "ael" outside the declared sound inventory or syllable patterns.',
        'Phrase "Sal nela" declares a declarative construction without compatible grammatical component slots and an action, predicate, or marker.',
        'Phrase "Sal nela" has unsupported translation meaning: greeting.',
        'Name "Aeluri" does not follow pattern "SP1".',
      ],
      "Parameters:\n- Tone / Style: Lyrical",
    );

    expect(prompt).toContain(
      "Prefer widening an inaccurately narrow declaration",
    );
    expect(prompt).toContain(
      "Reclassify a copula-less subject + quality as construction predicate",
    );
    expect(prompt).toContain(
      "A formulaic greeting needs a declared greeting or register rule",
    );
    expect(prompt).toContain(
      'If the language title uses use "other", add or select an "other" pattern',
    );
  });

  it("requires title repair components to use exact non-overlapping substrings", () => {
    const prompt = buildLanguageRepairPrompt('{"title":"Krazor"}', [
      'Name "Krazor" is not fully accounted for by its component surfaces.',
      'Name "Krazor" pronunciation does not match its component pronunciations.',
      "Include the language title itself as a component-derived naming example using declared sources.",
    ]);

    expect(prompt).toContain(
      "Component surfaces must be non-overlapping substrings",
    );
    expect(prompt).toContain(
      "declare a root or morpheme for the exact unaccounted remainder",
    );
  });

  it("canonicalizes an undeclared source alias only on an exact unique match", () => {
    const fixture = analyzedResultFixture();
    const component = fixture.profile.naming.examples[0].components![0];
    component.sourceId = "m-river";

    const parsed = parseLanguageGenerationResult(fixture);

    expect(parsed.profile.naming.examples[0].components?.[0].sourceId).toBe(
      "river",
    );
  });

  it("does not guess an undeclared source alias when multiple sources match", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.morphology!.morphemes!.push({
      id: "river-copy",
      form: "lema",
      pronunciation: "LEH-mah",
      meaning: "river",
      kind: "root",
      syllables: ["le", "ma"],
    });
    fixture.profile.naming.examples[0].components![0].sourceId = "m-river";

    const parsed = parseLanguageGenerationResult(fixture);

    expect(parsed.profile.naming.examples[0].components?.[0].sourceId).toBe(
      "m-river",
    );
  });

  it("uses an exact unique namespace match across identical source kinds", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.morphology!.morphemes!.push({
      id: "m-river-root",
      form: "lema",
      pronunciation: "LEH-mah",
      meaning: "river",
      kind: "root",
      syllables: ["le", "ma"],
    });
    fixture.profile.naming.examples[0].components![0].sourceId = "m-river";

    const parsed = parseLanguageGenerationResult(fixture);

    expect(parsed.profile.naming.examples[0].components?.[0].sourceId).toBe(
      "m-river-root",
    );
  });
});

function resultFixture(): LanguageGenerationResultV1 {
  return {
    version: 1,
    title: "Lemari",
    summary: "A flowing trade language spoken along the river roads.",
    labels: ["language", "conlang"],
    profile: {
      inputs: {
        genre: "Classic Fantasy",
        tone: "Lyrical & Vowel-rich",
        role: "Common Speech",
        structure: "Suffix-heavy",
      },
      culture: {
        speakers: "River merchants and ferrymen",
        usage: "Used for bargaining and navigation",
      },
      phonology: {
        consonants: ["l", "m", "n", "r"],
        vowels: ["a", "e", "i"],
        phonotactics: ["CV", "CVCV"],
        rhythm: "Even and flowing",
      },
      morphology: {
        wordFormation: "Roots take role-marking suffixes.",
        suffixes: ["-ri marks a profession"],
      },
      naming: {
        personalNamePatterns: ["Root + profession suffix"],
        examples: [
          { name: "Lemari", meaning: "river guide", use: "person" },
          { name: "Naveli", meaning: "light bearer", use: "person" },
          { name: "Marena", meaning: "river market", use: "place" },
          { name: "Talerin", meaning: "oath keeper", use: "title" },
        ],
      },
      lexicon: Array.from({ length: 10 }, (_, index) => ({
        word: ["lema", "nave", "mari"][index] ?? `lema${index}`,
        pronunciation: `LEH-mah-${index}`,
        meaning: `meaning ${index}`,
      })),
      grammar: {
        phrasePatterns: ["Subject–verb–object"],
        examples: [
          {
            text: "Lema nai.",
            pronunciation: "LEH-mah nye",
            translation: "The river guides us.",
          },
          {
            text: "Nave tali.",
            pronunciation: "NAH-veh TAH-lee",
            translation: "Light marks the road.",
          },
          {
            text: "Mari sela.",
            pronunciation: "MAH-ree SEH-lah",
            translation: "A friend is welcome.",
          },
        ],
      },
      register: {
        role: "Common Speech",
        formality: "Titles are reserved for formal bargains.",
      },
      tableUseTips: [
        "Keep vowels open.",
        "Use -ri for professions.",
        "Pause before formal titles.",
      ],
    },
  };
}

function analyzedResultFixture(): LanguageGenerationResultV1 {
  const fixture = resultFixture();
  fixture.profile.phonology = {
    consonants: ["k", "l", "m", "n", "r", "s", "t", "v"],
    vowels: ["a", "e", "i", "o"],
    phonotactics: ["Open CV syllables; CVC is allowed in role suffixes."],
    syllablePatterns: ["CV", "CVC"],
    rhythm: "Even and flowing",
  };
  fixture.profile.rules = [
    {
      id: "open-syllables",
      domain: "phonology",
      description: "Most roots use open CV syllables.",
    },
    {
      id: "suffix-names",
      domain: "naming",
      description: "Names combine a lexical root with a role suffix.",
    },
    {
      id: "role-suffixes",
      domain: "morphology",
      description: "Role suffixes follow lexical roots.",
    },
    {
      id: "root-order",
      domain: "grammar",
      description: "Subjects precede actions in declarative clauses.",
    },
    {
      id: "formal-title",
      domain: "register",
      description: "Formal titles use the keeper suffix.",
    },
  ];
  fixture.profile.morphology = {
    wordFormation: "Roots take declared role suffixes.",
    suffixes: [
      { sourceId: "guide-suffix", form: "ri", meaning: "guide" },
      { sourceId: "place-suffix", form: "na", meaning: "place" },
      { sourceId: "keeper-suffix", form: "rin", meaning: "keeper" },
    ],
    morphemes: [
      {
        id: "guide-suffix",
        form: "ri",
        pronunciation: "ree",
        meaning: "guide",
        kind: "suffix",
        syllables: ["ri"],
      },
      {
        id: "place-suffix",
        form: "na",
        pronunciation: "nah",
        meaning: "place",
        kind: "suffix",
        syllables: ["na"],
      },
      {
        id: "keeper-suffix",
        form: "rin",
        pronunciation: "rin",
        meaning: "keeper",
        kind: "suffix",
        syllables: ["rin"],
      },
    ],
  };
  fixture.profile.lexicon = [
    ["river", "lema", "LEH-mah", "river", ["le", "ma"]],
    ["light", "navi", "NAH-vee", "light", ["na", "vi"]],
    ["market", "mari", "MAH-ree", "market", ["ma", "ri"]],
    ["oath", "tali", "TAH-lee", "oath", ["ta", "li"]],
    ["welcome", "sela", "SEH-lah", "welcome", ["se", "la"]],
    ["guide", "nari", "NAH-ree", "guide", ["na", "ri"]],
    ["road", "kera", "KEH-rah", "road", ["ke", "ra"]],
    ["friend", "rima", "REE-mah", "friend", ["ri", "ma"]],
    ["home", "lena", "LEH-nah", "home", ["le", "na"]],
    ["star", "sori", "SOH-ree", "star", ["so", "ri"]],
  ].map(([id, word, pronunciation, meaning, syllables], index) => ({
    id: String(id),
    word: String(word),
    pronunciation: String(pronunciation),
    meaning: String(meaning),
    partOfSpeech: ["guide", "welcome"].includes(String(id)) ? "verb" : "noun",
    syllables: syllables as string[],
    demonstrates: index === 0 ? ["open-syllables"] : undefined,
  }));
  fixture.profile.naming = {
    personalNamePatterns: ["Root + role suffix"],
    placeNamePatterns: ["Root + place suffix"],
    titlePatterns: ["Root + keeper suffix"],
    structuredPatterns: [
      {
        id: "person-root-role",
        use: "person",
        structure: "Suffix-heavy",
        slots: ["root", "role"],
      },
      {
        id: "place-root-place",
        use: "place",
        structure: "Suffix-heavy",
        slots: ["root", "place"],
      },
      {
        id: "title-root-keeper",
        use: "title",
        structure: "Suffix-heavy",
        slots: ["root", "keeper"],
      },
    ],
    examples: [
      {
        name: "Lemari",
        pronunciation: "LEH-mah ree",
        meaning: "river guide",
        use: "person",
        patternId: "person-root-role",
        components: [
          {
            slot: "root",
            surface: "lema",
            pronunciation: "LEH-mah",
            meaning: "river",
            sourceId: "river",
            syllables: ["le", "ma"],
          },
          {
            slot: "role",
            surface: "ri",
            pronunciation: "ree",
            meaning: "guide",
            sourceId: "guide-suffix",
            syllables: ["ri"],
          },
        ],
        demonstrates: ["suffix-names", "role-suffixes"],
      },
      {
        name: "Naviri",
        pronunciation: "NAH-vee ree",
        meaning: "light guide",
        use: "person",
        patternId: "person-root-role",
        components: [
          {
            slot: "root",
            surface: "navi",
            pronunciation: "NAH-vee",
            meaning: "light",
            sourceId: "light",
            syllables: ["na", "vi"],
          },
          {
            slot: "role",
            surface: "ri",
            pronunciation: "ree",
            meaning: "guide",
            sourceId: "guide-suffix",
            syllables: ["ri"],
          },
        ],
        demonstrates: ["suffix-names", "role-suffixes"],
      },
      {
        name: "Marina",
        pronunciation: "MAH-ree nah",
        meaning: "market place",
        use: "place",
        patternId: "place-root-place",
        components: [
          {
            slot: "root",
            surface: "mari",
            pronunciation: "MAH-ree",
            meaning: "market",
            sourceId: "market",
            syllables: ["ma", "ri"],
          },
          {
            slot: "place",
            surface: "na",
            pronunciation: "nah",
            meaning: "place",
            sourceId: "place-suffix",
            syllables: ["na"],
          },
        ],
        demonstrates: ["suffix-names", "role-suffixes"],
      },
      {
        name: "Talirin",
        pronunciation: "TAH-lee rin",
        meaning: "oath keeper",
        use: "title",
        patternId: "title-root-keeper",
        components: [
          {
            slot: "root",
            surface: "tali",
            pronunciation: "TAH-lee",
            meaning: "oath",
            sourceId: "oath",
            syllables: ["ta", "li"],
          },
          {
            slot: "keeper",
            surface: "rin",
            pronunciation: "rin",
            meaning: "keeper",
            sourceId: "keeper-suffix",
            syllables: ["rin"],
          },
        ],
        demonstrates: ["suffix-names", "role-suffixes", "formal-title"],
      },
    ],
  };
  fixture.profile.grammar = {
    phrasePatterns: ["Subject precedes action."],
    examples: [
      ["Lema nari", "LEH-mah NAH-ree", "river guide", ["river", "guide"]],
      ["Navi nari", "NAH-vee NAH-ree", "light guide", ["light", "guide"]],
      ["Mari sela", "MAH-ree SEH-lah", "market welcome", ["market", "welcome"]],
    ].map(([text, pronunciation, translation, sourceIds]) => ({
      text: String(text),
      pronunciation: String(pronunciation),
      translation: `${String(translation)}s`,
      literalTranslation: String(translation),
      construction: "declarative" as const,
      components: (sourceIds as string[]).map((sourceId, index) => {
        const source = fixture.profile.lexicon.find(
          (entry) => entry.id === sourceId,
        )!;
        return {
          slot: index === 0 ? "subject" : "action",
          surface: source.word,
          pronunciation: source.pronunciation,
          meaning: source.meaning,
          sourceId,
          syllables: source.syllables,
        };
      }),
      demonstrates: ["root-order"],
    })),
  };
  return fixture;
}

describe("language profile presentation", () => {
  it("renders deterministic markdown from canonical data", () => {
    const rendered = renderLanguageProfile(resultFixture().profile);

    expect(rendered.content).toContain("## Pronunciation & Phonology");
    expect(rendered.content).toContain("| lema | LEH-mah-0 | meaning 0 |");
    expect(rendered.content).toContain("## Sample Phrases");
    expect(rendered.lore).toContain("### Example Names");
    expect(rendered.lore).toContain("**Lemari** — river guide (person)");
    expect(rendered.lore).toContain("### At the Table");
  });

  it("renders compact downstream guidance without absent placeholders", () => {
    const fixture = resultFixture();
    fixture.profile.phonology.stress = undefined;
    fixture.profile.morphology = undefined;

    const prompt = renderLanguageProfilePrompt(fixture.profile);

    expect(prompt).toContain("Personal-name patterns");
    expect(prompt).toContain("Useful terms");
    expect(prompt).not.toContain("Stress:");
    expect(prompt).not.toContain("Not specified");
  });

  it("renders structured derivations and demonstrated rules for reuse", () => {
    const fixture = analyzedResultFixture();
    const rendered = renderLanguageProfile(fixture.profile);
    const prompt = renderLanguageProfilePrompt(fixture.profile);

    expect(rendered.content).toContain("### Demonstrated Rules");
    expect(rendered.content).toContain("lema [river] + nari [guide]");
    expect(rendered.lore).toContain("lema [river] + ri [guide]");
    expect(prompt).toContain("Rule suffix-names");
    expect(prompt).toContain("Morpheme guide-suffix");
    expect(prompt).toContain("Pattern person-root-role");
  });
});

describe("language profile quality", () => {
  it("treats formal completeness gaps as advisory", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.phonology.syllablePatterns = ["C"];

    const assessment = classifyAILanguageQuality(fixture);

    expect(assessment.blockingIssues).toEqual([]);
    expect(
      assessment.advisoryIssues.some((issue) =>
        issue.includes("outside the declared sound inventory"),
      ),
    ).toBe(true);
  });

  it("keeps direct source contradictions blocking", () => {
    const fixture = resultFixture();
    fixture.profile.lexicon.push({
      ...structuredClone(fixture.profile.lexicon[0]),
      pronunciation: "changed",
    });

    const assessment = classifyAILanguageQuality(fixture);

    expect(
      assessment.blockingIssues.some((issue) =>
        issue.includes("conflicting pronunciation or meaning"),
      ),
    ).toBe(true);
  });

  it("accepts a rich AI result and a minimum viable local result", () => {
    const fixture = analyzedResultFixture();

    expect(validateAILanguageQuality(fixture).issues).toEqual([]);
    expect(validateFallbackLanguageQuality(resultFixture()).valid).toBe(true);
  });

  it("does not require an invented rule for every possible domain", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.rules = fixture.profile.rules!.filter(
      (rule) => rule.domain !== "register",
    );
    const formalName = fixture.profile.naming.examples.find((example) =>
      example.demonstrates?.includes("formal-title"),
    )!;
    formalName.demonstrates = formalName.demonstrates!.filter(
      (ruleId) => ruleId !== "formal-title",
    );

    expect(validateAILanguageQuality(fixture).issues).toEqual([]);
  });

  it("does not require every example to cite a rule", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.naming.examples[1].demonstrates = [];
    fixture.profile.grammar.examples[1].demonstrates = [];

    expect(validateAILanguageQuality(fixture).issues).toEqual([]);
  });

  it("requires analyzable rules, morphemes, names, phrases, and phonotactics for AI output", () => {
    const quality = validateAILanguageQuality(resultFixture());

    expect(quality.valid).toBe(false);
    for (const fragment of [
      "structured language rules",
      "declared morphemes",
      "structured naming patterns",
      "component analyses",
      "machine-readable syllable patterns",
    ]) {
      expect(quality.issues.some((issue) => issue.includes(fragment))).toBe(
        true,
      );
    }
  });

  it("rejects conflicting duplicate lexicon declarations", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.lexicon.push({
      ...fixture.profile.lexicon[0],
      id: "river-conflict",
      pronunciation: "REE-ver",
      meaning: "ocean",
    });

    const quality = validateLanguageConsistency(fixture);

    expect(quality.issues).toContain(
      'Lexicon word "lema" has conflicting pronunciation or meaning.',
    );
  });

  it("accepts the same stable source in the lexicon and morpheme table", () => {
    const fixture = analyzedResultFixture();
    const river = fixture.profile.lexicon[0];
    fixture.profile.morphology!.morphemes!.push({
      id: river.id!,
      form: river.word,
      pronunciation: river.pronunciation,
      meaning: river.meaning,
      kind: "root",
      syllables: river.syllables!,
    });

    expect(validateLanguageConsistency(fixture).issues).toEqual([]);
  });

  it("requires declared affixes to reference matching affix morphemes", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.morphology!.suffixes = [
      { sourceId: "river", form: "lema", meaning: "river" },
      { sourceId: "missing-suffix", form: "gox", meaning: "lineage" },
    ];
    fixture.profile.morphology!.wordFormation =
      "Roots use zero inflectional affixation.";

    const quality = validateLanguageConsistency(fixture);

    expect(
      quality.issues.some(
        (issue) =>
          issue.includes('source "river"') &&
          issue.includes("ordinary root or lexicon word"),
      ),
    ).toBe(true);
    expect(
      quality.issues.some((issue) => issue.includes('"missing-suffix"')),
    ).toBe(true);
    expect(
      quality.issues.some((issue) => issue.includes("zero affixation")),
    ).toBe(true);
  });

  it("allows empty affix collections and explicitly separate homographic roots", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.morphology!.prefixes = [];
    fixture.profile.morphology!.morphemes!.push({
      id: "guide-root",
      form: "ri",
      pronunciation: "ree",
      meaning: "guide",
      kind: "root",
      syllables: ["ri"],
    });

    expect(validateLanguageConsistency(fixture).issues).toEqual([]);
  });

  it("rejects a source id reused with conflicting declarations", () => {
    const fixture = analyzedResultFixture();
    const river = fixture.profile.lexicon[0];
    fixture.profile.morphology!.morphemes!.push({
      id: river.id!,
      form: river.word,
      pronunciation: "wrong",
      meaning: "ocean",
      kind: "root",
      syllables: river.syllables!,
    });

    expect(
      validateLanguageConsistency(fixture).issues.some((issue) =>
        issue.includes("reused with conflicting"),
      ),
    ).toBe(true);
  });

  it("rejects undeclared name roots and names that ignore their structured pattern", () => {
    const fixture = analyzedResultFixture();
    const name = fixture.profile.naming.examples[0];
    name.components![0].sourceId = "undeclared-root";
    name.components![1].slot = "lineage";
    name.meaning = "river emperor";

    const quality = validateLanguageConsistency(fixture);

    expect(
      quality.issues.some((issue) => issue.includes("undeclared-root")),
    ).toBe(true);
    expect(
      quality.issues.some((issue) => issue.includes("does not follow pattern")),
    ).toBe(true);
    expect(
      quality.issues.some((issue) => issue.includes("unsupported meaning")),
    ).toBe(true);
    expect(
      quality.issues.some((issue) =>
        issue.includes("one ordered component with its own sourceId"),
      ),
    ).toBe(true);
  });

  it("rejects phrase pronunciation drift and unsupported translation content", () => {
    const fixture = analyzedResultFixture();
    const phrase = fixture.profile.grammar.examples[0];
    phrase.components![0].pronunciation = "LEE-mah";
    phrase.translation = "The emperor conquers the stars";

    const quality = validateLanguageConsistency(fixture);

    expect(
      quality.issues.some((issue) => issue.includes("changes pronunciation")),
    ).toBe(true);
    expect(
      quality.issues.some((issue) =>
        issue.includes("unsupported translation meaning"),
      ),
    ).toBe(true);
  });

  it("accepts natural translation meaning supplied by a phrase-level rule", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.rules!.push({
      id: "future-marker",
      domain: "grammar",
      description: "The future marker adds will to the natural translation.",
    });
    const phrase = fixture.profile.grammar.examples[0];
    phrase.literalTranslation = "river guide";
    phrase.translation = "river will guide";
    phrase.demonstrates = [...phrase.demonstrates!, "future-marker"];

    expect(validateLanguageConsistency(fixture).issues).toEqual([]);
  });

  it("does not count noun strings as syntactic phrase demonstrations", () => {
    const fixture = analyzedResultFixture();
    for (const phrase of fixture.profile.grammar.examples) {
      phrase.construction = "other";
      phrase.components![0].slot = "head";
      phrase.components![1].slot = "modifier";
    }

    const consistency = validateLanguageConsistency(fixture);
    const quality = validateAILanguageQuality(fixture);

    expect(
      consistency.issues.some(
        (issue) =>
          issue.includes('grammar rule "root-order"') &&
          issue.includes("structured syntactic relationship"),
      ),
    ).toBe(true);
    expect(quality.issues).toContain(
      "Include at least 3 phrase examples that demonstrate structured syntax; standalone compounds or noun strings do not count.",
    );
  });

  it("does not accept a grammar rule id attached to a glossary word", () => {
    const fixture = analyzedResultFixture();
    for (const phrase of fixture.profile.grammar.examples) {
      phrase.demonstrates = [];
    }
    fixture.profile.lexicon[0].demonstrates = [
      ...(fixture.profile.lexicon[0].demonstrates ?? []),
      "root-order",
    ];

    const quality = validateLanguageConsistency(fixture);

    expect(
      quality.issues.some((issue) =>
        issue.includes(
          'Lexicon word "lema" cites grammar rule "root-order" but does not demonstrate a structured syntactic relationship',
        ),
      ),
    ).toBe(true);
    expect(quality.issues).toContain(
      'Structured language rule "root-order" is not demonstrated by any example.',
    );
  });

  it("requires the language title to be component-derived", () => {
    const fixture = analyzedResultFixture();
    fixture.title = "Unanalyzed";

    expect(validateAILanguageQuality(fixture).issues).toContain(
      "Include the language title itself as a component-derived naming example using declared sources.",
    );
  });

  it("accepts prosodic IPA marks added to whole-example pronunciations", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.naming.examples[0].pronunciation = "ˈLEH-mah.ree";
    fixture.profile.grammar.examples[0].pronunciation = "ˈLEH-mah ˌNAH-ree";

    expect(validateLanguageConsistency(fixture).issues).toEqual([]);
  });

  it("accepts any valid segmentation of overlapping sound units", () => {
    const fixture = resultFixture();
    fixture.profile.phonology = {
      consonants: ["m", "r", "mar"],
      vowels: ["a"],
      phonotactics: ["CVC"],
      syllablePatterns: ["CVC"],
    };
    fixture.profile.lexicon[0] = {
      id: "border",
      word: "mar",
      pronunciation: "mar",
      meaning: "border",
      syllables: ["mar"],
    };

    expect(validateLanguageConsistency(fixture).issues).toEqual([]);
  });

  it("accepts literal meaning supplied by component-applied rules", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.rules!.push({
      id: "plural-suffix",
      domain: "morphology",
      description: "The suffix -ri marks plural number.",
    });
    const phrase = fixture.profile.grammar.examples[0];
    phrase.text = "Lemari nari";
    phrase.pronunciation = "LEH-mah-ree NAH-ree";
    phrase.literalTranslation = "river plural guide";
    phrase.translation = "rivers guide";
    phrase.components![0] = {
      ...phrase.components![0],
      surface: "lemari",
      pronunciation: "LEH-mah-ree",
      meaning: "rivers",
      syllables: ["le", "ma", "ri"],
      appliedRuleIds: ["plural-suffix"],
    };
    phrase.demonstrates = [...phrase.demonstrates!, "plural-suffix"];

    expect(validateLanguageConsistency(fixture).issues).toEqual([]);
  });

  it("accepts untranslated surface names in natural translations", () => {
    const fixture = analyzedResultFixture();
    const phrase = fixture.profile.grammar.examples[0];
    phrase.text = "Lemari nari";
    phrase.pronunciation = "LEH-mah-ree NAH-ree";
    phrase.translation = "Lemari guide";
    phrase.components![0] = {
      ...phrase.components![0],
      surface: "lemari",
      pronunciation: "LEH-mah-ree",
      syllables: ["le", "ma", "ri"],
      appliedRuleIds: ["role-suffixes"],
    };
    phrase.demonstrates = [...phrase.demonstrates!, "role-suffixes"];

    expect(validateLanguageConsistency(fixture).issues).toEqual([]);
  });

  it("accepts surface clipping supplied by a demonstrated register rule", () => {
    const fixture = analyzedResultFixture();
    const phrase = fixture.profile.grammar.examples[0];
    phrase.text = "Ma nari";
    phrase.pronunciation = "mah NAH-ree";
    phrase.components![0] = {
      ...phrase.components![0],
      surface: "ma",
      pronunciation: "mah",
      syllables: ["ma"],
      appliedRuleIds: ["formal-title"],
    };
    phrase.demonstrates = [...phrase.demonstrates!, "formal-title"];

    expect(validateLanguageConsistency(fixture).issues).toEqual([]);
  });

  it("rejects undemonstrated rules and phonotactically illegal syllables", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.rules!.push({
      id: "unseen-elision",
      domain: "phonology",
      description: "Adjacent vowels always elide.",
    });
    fixture.profile.lexicon[0].syllables = ["zz"];

    const quality = validateLanguageConsistency(fixture);

    expect(
      quality.issues.some((issue) => issue.includes("unseen-elision")),
    ).toBe(true);
    expect(
      quality.issues.some((issue) => issue.includes('syllable "zz"')),
    ).toBe(true);
  });

  it("rejects roots that contradict declared C/V syllable patterns", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.phonology.consonants.push("g", "z");
    fixture.profile.phonology.syllablePatterns = ["CVC", "CCVC"];
    fixture.profile.lexicon.push({
      id: "war-root",
      word: "krazg",
      pronunciation: "krahzg",
      meaning: "war",
      partOfSpeech: "noun",
      syllables: ["krazg"],
    });

    expect(
      validateLanguageConsistency(fixture).issues.some(
        (issue) =>
          issue.includes('Source "war-root"') &&
          issue.includes('syllable "krazg"'),
      ),
    ).toBe(true);
  });

  it("rejects inconsistent grapheme pronunciation without a contextual rule", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.phonology.consonants.push("g", "x");
    fixture.profile.lexicon.push(
      {
        id: "ore",
        word: "gox",
        pronunciation: "goʃ",
        meaning: "ore",
        partOfSpeech: "noun",
        syllables: ["gox"],
      },
      {
        id: "ash",
        word: "mox",
        pronunciation: "moks",
        meaning: "ash",
        partOfSpeech: "noun",
        syllables: ["mox"],
      },
    );

    expect(
      validateLanguageConsistency(fixture).issues.some(
        (issue) =>
          issue.includes('Shared graphemes "ox"') &&
          issue.includes('"gox"') &&
          issue.includes('"mox"'),
      ),
    ).toBe(true);
  });

  it("allows contextual grapheme pronunciation when the rule is demonstrated", () => {
    const fixture = analyzedResultFixture();
    fixture.profile.phonology.consonants.push("g", "x");
    fixture.profile.rules!.push({
      id: "contextual-x",
      domain: "phonology",
      description:
        "The grapheme x is pronounced /ʃ/ after g and /ks/ elsewhere.",
    });
    fixture.profile.lexicon.push(
      {
        id: "ore",
        word: "gox",
        pronunciation: "goʃ",
        meaning: "ore",
        partOfSpeech: "noun",
        syllables: ["gox"],
        demonstrates: ["contextual-x"],
      },
      {
        id: "ash",
        word: "mox",
        pronunciation: "moks",
        meaning: "ash",
        partOfSpeech: "noun",
        syllables: ["mox"],
        demonstrates: ["contextual-x"],
      },
    );

    expect(validateLanguageConsistency(fixture).issues).toEqual([]);
  });

  it("reports AI richness gaps without rejecting a valid local profile", () => {
    const fixture = resultFixture();
    fixture.profile.naming.examples = fixture.profile.naming.examples.slice(
      0,
      3,
    );
    fixture.profile.grammar.examples = fixture.profile.grammar.examples.slice(
      0,
      2,
    );
    fixture.profile.tableUseTips = fixture.profile.tableUseTips.slice(0, 2);

    expect(validateFallbackLanguageQuality(fixture).valid).toBe(true);
    const ai = validateAILanguageQuality(fixture);
    expect(ai.valid).toBe(false);
    expect(ai.issues).toContain("Include at least 4 example names.");
  });

  it("detects when AI output only mentions rather than preserves controls", () => {
    const fixture = resultFixture();
    fixture.profile.inputs.tone = "Harsh";

    const fidelity = validateLanguageInputFidelity(fixture, {
      genre: "Classic Fantasy",
      tone: "Lyrical & Vowel-rich",
      role: "Common Speech",
      structure: "Suffix-heavy",
    });

    expect(fidelity.valid).toBe(false);
    expect(fidelity.issues[0]).toContain("profile.inputs.tone");
  });

  it("rejects an identity summary that does not distinguish the selected role", () => {
    const fixture = analyzedResultFixture();
    fixture.summary = "A flowing language with open vowels.";

    const fidelity = validateLanguageInputFidelity(fixture, {
      genre: "Classic Fantasy",
      tone: "Lyrical & Vowel-rich",
      role: "Common Speech",
      structure: "Suffix-heavy",
    });

    expect(fidelity.issues).toContain(
      'Make the summary visibly identify the "Common Speech" language role.',
    );
  });

  it.each([
    ["Sacred / Ritual Tongue", "Priests chant it during temple ceremonies."],
    ["Common Speech", "Spoken by everyone in everyday trade."],
  ])("accepts speaker or social-situation evidence for %s", (role, summary) => {
    const fixture = analyzedResultFixture();
    fixture.profile.inputs.role = role;
    fixture.profile.register.role = role;
    fixture.summary = summary;

    const fidelity = validateLanguageInputFidelity(fixture, {
      genre: "Classic Fantasy",
      tone: "Lyrical & Vowel-rich",
      role,
      structure: "Suffix-heavy",
    });

    expect(fidelity.issues).toEqual([]);
  });

  it("rejects duplicate fallback material", () => {
    const fixture = resultFixture();
    fixture.profile.lexicon = fixture.profile.lexicon.map((entry) => ({
      ...entry,
      word: "same",
    }));

    const quality = validateFallbackLanguageQuality(fixture);
    expect(quality.valid).toBe(false);
    expect(quality.issues).toContain(
      "Include at least 10 unique vocabulary words.",
    );
  });

  it("rejects placeholder core values and phrases detached from the glossary", () => {
    const fixture = resultFixture();
    fixture.labels = [];
    fixture.profile.lexicon[0].meaning = "Unknown";
    fixture.profile.grammar.examples = fixture.profile.grammar.examples.map(
      (example) => ({ ...example, text: "zo qu" }),
    );

    const quality = validateFallbackLanguageQuality(fixture);

    expect(quality.issues).toContain(
      "Replace placeholder values in required language data.",
    );
    expect(quality.issues).toContain("Include at least one language label.");
    expect(quality.issues).toContain(
      "Ground at least half of sample phrases in glossary words or transparent derivatives.",
    );
  });
});

describe("language profile name bans", () => {
  it("blocks derivatives in names and exact whole-word vocabulary collisions", () => {
    const fixture = resultFixture();
    fixture.profile.naming.examples[0].name = "Vane-Smithe";
    fixture.profile.lexicon[0].word = "Thran";

    const result = validateLanguageNameBans(fixture, ["Vane", "Thran"]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Vane-Smithe"),
        expect.stringContaining("Thran"),
      ]),
    );
  });

  it("does not reject ordinary vocabulary containing a banned fragment", () => {
    const fixture = resultFixture();
    fixture.profile.lexicon[0].word = "advancement";

    expect(validateLanguageNameBans(fixture, ["Vance"]).valid).toBe(true);
  });
});
