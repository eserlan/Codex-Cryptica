import { describe, expect, it, vi } from "vitest";
import { generateNoteEncounter } from "./note-encounter";

function output(overrides: Record<string, unknown> = {}) {
  return {
    type: "note" as const,
    title: "The Choir Below",
    summary: "Three cultists mid-ritual.",
    content: "They have not noticed the door yet.",
    lore: "",
    labels: [],
    status: "draft" as const,
    ...overrides,
  };
}

describe("generateNoteEncounter", () => {
  it("asks for the vault's genre and flattens the result into note prose", async () => {
    const generate = vi.fn(async () => output());

    const result = await generateNoteEncounter(
      { themeId: "sci-fi", context: " Crypt of the Sun " },
      generate as never,
    );

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ context: "Crypt of the Sun", useAI: true }),
    );
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ genre: expect.any(String) }),
    );
    expect(result.body).toBe(
      "The Choir Below\n\nThree cultists mid-ritual.\n\nThey have not noticed the door yet.",
    );
    expect(result.aiFallback).toBe(false);
  });

  it("leaves no blank gaps when the generator returns no summary", async () => {
    const generate = vi.fn(async () => output({ summary: "" }));

    const result = await generateNoteEncounter({}, generate as never);

    expect(result.body).toBe(
      "The Choir Below\n\nThey have not noticed the door yet.",
    );
  });

  it("reports the local-table fallback so the GM knows AI did not answer", async () => {
    const generate = vi.fn(async () => output({ aiFallback: true }));

    const result = await generateNoteEncounter({}, generate as never);

    expect(result.aiFallback).toBe(true);
  });
});
