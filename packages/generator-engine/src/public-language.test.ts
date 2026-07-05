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

test("parseLanguageResponse parses json content", () => {
  const jsonStr = JSON.stringify({
    title: "Elvish",
    summary: "A flowing tongue.",
    lore: "# Pronunciation & Phonology\nFlowing sounds.\n\n# Naming Conventions\nElegant suffixes.",
    labels: ["language", "elvish"],
  });

  const parsed = parseLanguageResponse(jsonStr);
  expect(parsed.title).toBe("Elvish");
  expect(parsed.summary).toBe("A flowing tongue.");
  expect(parsed.lore).toContain("# Pronunciation & Phonology");
  expect(parsed.labels).toContain("elvish");
});

test("generateLanguageLocal returns a structured profile with fallback", () => {
  const generated = generateLanguageLocal({
    genre: "Classic Fantasy",
    tone: "Harsh & Consonant-heavy",
    role: "Common Speech",
    structure: "Compound Words",
  });

  expect(generated.title).toBeTruthy();
  expect(generated.summary).toContain("spoken");
  expect(generated.lore).toContain("# Pronunciation & Phonology");
  expect(generated.lore).toContain("# Naming Conventions");
  expect(generated.lore).toContain("# Example Names");
  expect(generated.lore).toContain("# Common Vocabulary & Word Bank");
  expect(generated.lore).toContain("# Sample Phrases");
  expect(generated.labels).toContain("language");
});
