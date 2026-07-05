import { expect, test } from "vitest";
import {
  buildLanguagePrompt,
  parseLanguageResponse,
  generateLanguageLocal,
} from "./public-language";

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

test("buildLanguagePrompt requests separate content and lore", () => {
  const prompt = buildLanguagePrompt({});

  expect(prompt.userMessage).toContain('"content"');
  expect(prompt.userMessage).toContain('"lore"');
  expect(prompt.userMessage).toContain("## Pronunciation & Phonology");
  expect(prompt.userMessage).toContain("### At a Glance");
  expect(prompt.userMessage).toContain("### Example Names");
});

test("parseLanguageResponse parses content and lore separately", () => {
  const jsonStr = JSON.stringify({
    title: "Elvish",
    summary: "A flowing tongue.",
    content:
      "## Pronunciation & Phonology\nFlowing sounds.\n\n## Naming Conventions\nElegant suffixes.",
    lore: "### At a Glance\n- **Tone**: Lyrical",
    labels: ["language", "elvish"],
  });

  const parsed = parseLanguageResponse(jsonStr);
  expect(parsed.title).toBe("Elvish");
  expect(parsed.summary).toBe("A flowing tongue.");
  expect(parsed.content).toContain("## Pronunciation & Phonology");
  expect(parsed.lore).toContain("### At a Glance");
  expect(parsed.content).not.toBe(parsed.lore);
  expect(parsed.labels).toContain("elvish");
});

test("parseLanguageResponse falls back to lore when content is missing", () => {
  const jsonStr = JSON.stringify({
    title: "Elvish",
    summary: "A flowing tongue.",
    lore: "## Pronunciation & Phonology\nFlowing sounds.",
    labels: ["language"],
  });

  const parsed = parseLanguageResponse(jsonStr);
  expect(parsed.content).toContain("## Pronunciation & Phonology");
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
  expect(generated.content).toContain("## Naming Conventions");
  expect(generated.content).toContain("## Common Vocabulary & Word Bank");
  expect(generated.content).toContain("## Sample Phrases");
  expect(generated.lore).toContain("### At a Glance");
  expect(generated.lore).toContain("### Example Names");
  expect(generated.lore).toContain("### At the Table");
  expect(generated.content).not.toBe(generated.lore);
  expect(generated.labels).toContain("language");
});
