import { describe, it, expect, vi } from "vitest";
import {
  compressMonsterLabsDescription,
  MONSTERLABS_PROMPT_CHAR_LIMIT,
} from "./monsterlabs-description-compression";

describe("compressMonsterLabsDescription", () => {
  it("returns the description unchanged when already within the limit", async () => {
    const runModel = vi.fn();
    const description = "A soot-caked horror that hunts old mineshafts.";

    const result = await compressMonsterLabsDescription(
      description,
      1000,
      runModel,
    );

    expect(result).toBe(description);
    expect(runModel).not.toHaveBeenCalled();
  });

  it("uses the default limit when none is given", async () => {
    const runModel = vi.fn();
    const description = "a".repeat(MONSTERLABS_PROMPT_CHAR_LIMIT);

    await compressMonsterLabsDescription(description, undefined, runModel);

    expect(runModel).not.toHaveBeenCalled();
  });

  it("asks the model to compress an oversized description and returns its result", async () => {
    const longDescription = "a".repeat(1500);
    const compressed = "A much shorter horror description.";
    const runModel = vi.fn().mockResolvedValue(compressed);

    const result = await compressMonsterLabsDescription(
      longDescription,
      1000,
      runModel,
    );

    expect(result).toBe(compressed);
    expect(runModel).toHaveBeenCalledTimes(1);
    const [system, user] = runModel.mock.calls[0];
    expect(system).toContain("compress");
    // Asks for less than the real 1000-char limit (85%) — models routinely
    // overshoot an exact target, and undershooting the ask leaves headroom
    // so an overshoot still lands under the real limit.
    expect(user).toContain("850 characters");
    expect(user).toContain(longDescription);
  });

  it("trims the model's response", async () => {
    const runModel = vi.fn().mockResolvedValue("  padded output  ");

    const result = await compressMonsterLabsDescription(
      "a".repeat(1500),
      1000,
      runModel,
    );

    expect(result).toBe("padded output");
  });

  it("falls back to a hard truncation when the model still returns something over the limit", async () => {
    const runModel = vi.fn().mockResolvedValue("b".repeat(2000));

    const result = await compressMonsterLabsDescription(
      "a".repeat(1500),
      1000,
      runModel,
    );

    expect(result.length).toBeLessThanOrEqual(1000);
    expect(result.endsWith("…")).toBe(true);
  });

  it("falls back to a hard truncation when the model returns an empty response", async () => {
    const runModel = vi.fn().mockResolvedValue("   ");
    const longDescription = "word ".repeat(400).trim();

    const result = await compressMonsterLabsDescription(
      longDescription,
      1000,
      runModel,
    );

    expect(result.length).toBeLessThanOrEqual(1000);
    expect(longDescription.startsWith(result.replace(/…$/, ""))).toBe(true);
  });

  it("falls back to a hard truncation when the model call throws", async () => {
    const runModel = vi.fn().mockRejectedValue(new Error("offline"));
    const longDescription = "word ".repeat(400).trim();

    const result = await compressMonsterLabsDescription(
      longDescription,
      1000,
      runModel,
    );

    expect(result.length).toBeLessThanOrEqual(1000);
    expect(result.endsWith("…")).toBe(true);
  });

  it("returns an empty string for a zero limit without calling the model", async () => {
    const runModel = vi.fn();

    const result = await compressMonsterLabsDescription(
      "a".repeat(1500),
      0,
      runModel,
    );

    expect(result).toBe("");
    expect(runModel).not.toHaveBeenCalled();
  });

  it("skips the model entirely when allowAi is false, falling back to hard truncation", async () => {
    const runModel = vi.fn();
    const longDescription = "word ".repeat(400).trim();

    const result = await compressMonsterLabsDescription(
      longDescription,
      1000,
      runModel,
      false,
    );

    expect(runModel).not.toHaveBeenCalled();
    expect(result.length).toBeLessThanOrEqual(1000);
    expect(result.endsWith("…")).toBe(true);
  });

  it("truncates at a word boundary rather than mid-word", async () => {
    const runModel = vi.fn().mockRejectedValue(new Error("offline"));
    const longDescription = "word ".repeat(400).trim();

    const result = await compressMonsterLabsDescription(
      longDescription,
      1000,
      runModel,
    );

    const withoutEllipsis = result.replace(/…$/, "");
    expect(withoutEllipsis.endsWith(" ")).toBe(false);
    expect(longDescription.startsWith(withoutEllipsis)).toBe(true);
    // The character right after the truncated text in the original string
    // should be a word boundary (a space), not a mid-word cut.
    const nextChar = longDescription[withoutEllipsis.length];
    expect(nextChar === " " || nextChar === undefined).toBe(true);
  });
});
