import { expect, test } from "vitest";
import {
  buildLanguagePrompt,
  parseLanguageResponse,
  generateLanguageLocal,
} from "./public-language";
import { validateFallbackLanguageQuality } from "./language-profile";
import { NAME_BAN_PROMPT } from "./public-npc";

test("buildLanguagePrompt includes key inputs", () => {
  const prompt = buildLanguagePrompt({
    genre: "Classic Fantasy",
    tone: "Lyrical & Vowel-rich",
    role: "Sacred / Ritual Tongue",
    structure: "Compound Words",
    context: "spoken by mountain dwarves",
    bannedNames: ["Thran", "Khar"],
  });

  expect(prompt.userMessage).toContain("Classic Fantasy");
  expect(prompt.userMessage).toContain("Lyrical & Vowel-rich");
  expect(prompt.userMessage).toContain("Sacred / Ritual Tongue");
  expect(prompt.userMessage).toContain("Compound Words");
  expect(prompt.userMessage).toContain("spoken by mountain dwarves");
  expect(prompt.userMessage).toContain("Thran, Khar");
});

test("buildLanguagePrompt includes genre-specific creative direction", () => {
  const prompt = buildLanguagePrompt({ genre: "Cyberpunk / Corporate" });

  expect(prompt.userMessage).toContain("corporate acronyms");
  expect(prompt.userMessage).toContain(
    "at least one term that could only belong to a Cyberpunk / Corporate setting",
  );
});

test("buildLanguagePrompt gives Pirate languages a cultural direction", () => {
  const prompt = buildLanguagePrompt({ genre: "Pirate" });

  expect(prompt.userMessage).toContain("free-port culture");
  expect(prompt.userMessage).toContain("crew oaths");
  expect(prompt.userMessage).toContain(
    "at least one term that could only belong to a Pirate setting",
  );
});

test("buildLanguagePrompt includes the shared name-ban prompt", () => {
  const prompt = buildLanguagePrompt({});

  expect(prompt.userMessage).toContain(NAME_BAN_PROMPT);
});

test("buildLanguagePrompt requests the versioned structured profile", () => {
  const prompt = buildLanguagePrompt({});

  expect(prompt.userMessage).toContain('"version": 1');
  expect(prompt.userMessage).toContain('"profile"');
  expect(prompt.userMessage).toContain('"phonology"');
  expect(prompt.userMessage).toContain('"lexicon"');
  expect(prompt.userMessage).toContain("Do not return pre-rendered markdown");
});

test("buildLanguagePrompt maps every control to observable profile fields", () => {
  const prompt = buildLanguagePrompt({});

  expect(prompt.userMessage).toContain(
    "Genre / Setting must materially shape culture.history",
  );
  expect(prompt.userMessage).toContain(
    "Tone / Style must materially shape phonology",
  );
  expect(prompt.userMessage).toContain(
    "Language Role must materially shape culture.usage",
  );
  expect(prompt.userMessage).toContain(
    "Name Structure Style must materially shape morphology",
  );
  expect(prompt.userMessage).toContain(
    "Preserve custom control values literally",
  );
});

test("buildLanguagePrompt makes identity depend on the complete resolved concept", () => {
  const common = buildLanguagePrompt({ role: "Common Speech" });
  const ritual = buildLanguagePrompt({ role: "Sacred / Ritual Tongue" });

  expect(common.userMessage).not.toBe(ritual.userMessage);
  expect(ritual.userMessage).toContain(
    "title and summary must identify this resolved language concept",
  );
  expect(ritual.userMessage).toContain(
    "The summary must visibly distinguish Sacred / Ritual Tongue",
  );
});

test("parseLanguageResponse validates structure and derives markdown", () => {
  const jsonStr = JSON.stringify({
    version: 1,
    title: "Elvish",
    summary: "A flowing tongue.",
    labels: ["language", "elvish"],
    profile: {
      inputs: {
        genre: "Classic Fantasy",
        tone: "Lyrical & Vowel-rich",
        role: "Common Speech",
        structure: "Suffix-heavy",
      },
      phonology: {
        consonants: ["l"],
        vowels: ["e"],
        phonotactics: ["CV"],
      },
      naming: {
        examples: [{ name: "Ela", meaning: "light", use: "person" }],
      },
      lexicon: [{ word: "el", pronunciation: "ELL", meaning: "light" }],
      grammar: {
        examples: [
          {
            text: "El na.",
            pronunciation: "ELL nah",
            translation: "Light comes.",
          },
        ],
      },
      register: { role: "Common Speech" },
      tableUseTips: ["Use open vowels."],
    },
  });

  const parsed = parseLanguageResponse(jsonStr);
  expect(parsed.title).toBe("Elvish");
  expect(parsed.summary).toBe("A flowing tongue.");
  expect(parsed.content).toContain("## Pronunciation & Phonology");
  expect(parsed.lore).toContain("### At a Glance");
  expect(parsed.content).not.toBe(parsed.lore);
  expect(parsed.labels).toContain("elvish");
  expect(parsed.languageProfileVersion).toBe(1);
  expect(parsed.languageProfile?.lexicon[0].word).toBe("el");
});

test("parseLanguageResponse rejects legacy markdown-only output", () => {
  expect(() =>
    parseLanguageResponse(
      JSON.stringify({
        title: "Elvish",
        summary: "A flowing tongue.",
        lore: "## Pronunciation & Phonology\nFlowing sounds.",
        labels: ["language"],
      }),
    ),
  ).toThrow();
});

test("generateLanguageLocal splits narrative content from GM reference lore", () => {
  const generated = generateLanguageLocal({
    genre: "Classic Fantasy",
    tone: "Harsh & Consonant-heavy",
    role: "Common Speech",
    structure: "Compound Words",
  });

  expect(generated.title).toBeTruthy();
  expect(generated.summary).toContain("spoken");
  expect(generated.content).toContain("## Pronunciation & Phonology");
  expect(generated.content).toContain("## Cultural Role & Usage");
  expect(generated.content).toContain("## Word Formation & Naming Conventions");
  expect(generated.content).toContain("## Common Vocabulary & Word Bank");
  expect(generated.content).toContain("## Sample Phrases");
  expect(generated.lore).toContain("### At a Glance");
  expect(generated.lore).toContain("### Example Names");
  expect(generated.lore).toContain("### At the Table");
  expect(generated.content).not.toBe(generated.lore);
  expect(generated.labels).toContain("language");
  expect(generated.languageProfileVersion).toBe(1);
  expect(
    validateFallbackLanguageQuality({
      version: 1,
      title: generated.title,
      summary: generated.summary ?? "",
      labels: generated.labels,
      profile: generated.languageProfile!,
    }).valid,
  ).toBe(true);
});

test("generateLanguageLocal includes a genre-specific vocabulary concept", () => {
  const cyberpunk = generateLanguageLocal({
    genre: "Cyberpunk / Corporate",
    tone: "Clipped & Technical",
    role: "Common Speech",
    structure: "Compound Words",
  });
  expect(cyberpunk.content).toContain("network");

  const fantasy = generateLanguageLocal({
    genre: "Classic Fantasy",
    tone: "Harsh & Consonant-heavy",
    role: "Common Speech",
    structure: "Compound Words",
  });
  expect(fantasy.content).toContain("sword-oath");

  const pirate = generateLanguageLocal({
    genre: "Pirate",
    tone: "Clipped & Technical",
    role: "Common Speech",
    structure: "Compound Words",
  });
  expect(pirate.content).toContain("crew-oath");
});
