/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/svelte";
import {
  adventureSourcePackageToAdventureJson,
  buildAdventureRepairPrompt,
  preflightAdventureJson,
  validateAdventureJson,
  type AdventureSourcePackage,
} from "@codex/adventure-engine";
import AdventureImportValidationErrors from "./AdventureImportValidationErrors.svelte";

afterEach(() => cleanup());

function stubClipboard(
  writeText: ((text: string) => Promise<void>) | null,
): () => void {
  const previous = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
  return () => {
    if (previous) {
      Object.defineProperty(navigator, "clipboard", previous);
    } else {
      Reflect.deleteProperty(navigator, "clipboard");
    }
  };
}

function invalidPrompt(): string {
  const report = preflightAdventureJson(
    JSON.stringify({ formatVersion: "bad" }),
  );
  const prompt = buildAdventureRepairPrompt(report);
  if (!prompt) throw new Error("Expected an invalid Adventure JSON prompt.");
  return prompt;
}

describe("AdventureImportValidationErrors repair prompt copy", () => {
  it("does not show the copy action when there are no validation errors", () => {
    render(AdventureImportValidationErrors, {
      props: { errors: [], repairPrompt: invalidPrompt() },
    });

    expect(
      screen.queryByRole("button", { name: "Copy repair prompt" }),
    ).toBeNull();
  });

  it("copies repair guidance for converted Adventure JSON validation errors", async () => {
    const sourcePackage: AdventureSourcePackage = {
      schemaVersion: 1,
      status: "draft",
      documentHash: "a".repeat(64),
      sourceIdentity: { fileName: "converted.md", title: "Converted source" },
      importMethod: "markdown",
      importVersion: "1.0.0",
      sections: [],
      scenes: [
        {
          sourceId: "scene-a",
          title: "Scene A",
          conditions: [],
          branches: [{ targetSourceId: "scene-b", description: "Go to B" }],
          provenance: "source-grounded",
        },
        {
          sourceId: "scene-b",
          title: "Scene B",
          conditions: [],
          branches: [{ targetSourceId: "scene-a", description: "Return to A" }],
          provenance: "source-grounded",
        },
      ],
      npcs: [],
      clues: [],
      encounters: [],
      secrets: [],
      endings: [],
      ambiguities: [],
    };
    const converted = adventureSourcePackageToAdventureJson(sourcePackage);
    const validation = validateAdventureJson(converted);
    expect(validation.ok).toBe(false);
    if (validation.ok) return;

    const repairPrompt = buildAdventureRepairPrompt(
      preflightAdventureJson(JSON.stringify(converted)),
    );
    expect(repairPrompt).toContain("DEAD_END_CYCLE");
    if (!repairPrompt) return;

    const writeText = vi.fn().mockResolvedValue(undefined);
    const restoreClipboard = stubClipboard(writeText);
    try {
      render(AdventureImportValidationErrors, {
        props: { errors: validation.errors, repairPrompt },
      });

      const button = screen.getByRole("button", {
        name: "Copy repair prompt",
      });
      expect(button.tagName).toBe("BUTTON");
      await fireEvent.click(button);

      await waitFor(() => expect(writeText).toHaveBeenCalledWith(repairPrompt));
      expect(screen.getByRole("status").textContent).toContain("copied");
    } finally {
      restoreClipboard();
    }
  });

  it("announces clipboard rejection without exposing the error and allows retry", async () => {
    const prompt = invalidPrompt();
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValueOnce(
        new Error("Permission denied: private browser detail"),
      )
      .mockResolvedValueOnce(undefined);
    const restoreClipboard = stubClipboard(writeText);
    try {
      render(AdventureImportValidationErrors, {
        props: {
          errors: [{ code: "INVALID_FORMAT_VERSION", message: "Bad format." }],
          repairPrompt: prompt,
        },
      });

      const button = screen.getByRole("button", {
        name: "Copy repair prompt",
      }) as HTMLButtonElement;
      await fireEvent.click(button);

      const failure = await screen.findByRole("alert");
      expect(failure.textContent).toContain("Could not copy the repair prompt");
      expect(failure.textContent).not.toContain("Permission denied");
      expect(button.disabled).toBe(false);

      await fireEvent.click(button);
      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
      expect(screen.getByRole("status").textContent).toContain("copied");
    } finally {
      restoreClipboard();
    }
  });

  it("announces when clipboard access is unavailable", async () => {
    const restoreClipboard = stubClipboard(null);
    try {
      render(AdventureImportValidationErrors, {
        props: {
          errors: [{ code: "INVALID_FORMAT_VERSION", message: "Bad format." }],
          repairPrompt: invalidPrompt(),
        },
      });

      await fireEvent.click(
        screen.getByRole("button", { name: "Copy repair prompt" }),
      );
      expect(
        (await screen.findByRole("alert")).textContent?.replace(/\s+/g, " "),
      ).toContain("Check clipboard access and try again.");
    } finally {
      restoreClipboard();
    }
  });
});
