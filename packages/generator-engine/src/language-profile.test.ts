import { describe, expect, it } from "vitest";
import type { LanguageGenerationResultV1 } from "schema";
import {
  renderLanguageProfile,
  renderLanguageProfilePrompt,
  validateAILanguageQuality,
  validateFallbackLanguageQuality,
  validateLanguageInputFidelity,
  validateLanguageNameBans,
} from "./language-profile";

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
});

describe("language profile quality", () => {
  it("accepts a rich AI result and a minimum viable local result", () => {
    const fixture = resultFixture();

    expect(validateAILanguageQuality(fixture).valid).toBe(true);
    expect(validateFallbackLanguageQuality(fixture).valid).toBe(true);
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
