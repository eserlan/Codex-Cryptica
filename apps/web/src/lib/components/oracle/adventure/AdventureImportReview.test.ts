/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import {
  parseAdventureMarkdown,
  saveAdventurePackage,
  type AdventurePackageFileIO,
  type AdventureSourcePackage,
} from "@codex/adventure-engine";
import AdventureEntryChoices from "./AdventureEntryChoices.svelte";
import AdventureImportReview from "./AdventureImportReview.svelte";

function createTestPackage(): AdventureSourcePackage {
  return {
    schemaVersion: 1,
    status: "draft",
    documentHash: "a".repeat(64),
    sourceIdentity: {
      fileName: "mill-mystery.md",
      title: "The Mill Mystery",
    },
    importMethod: "markdown",
    importVersion: "1.0.0",
    sections: [
      {
        sourceId: "sec-landing",
        title: "Scene 1: The Ferry Landing",
        level: 2,
        body: "Fog clings to the pilings.",
        readAloud: "The ferry bell tolls twice.",
        gmOnly: false,
        provenance: "source-grounded",
      },
      {
        sourceId: "sec-wheel",
        title: "Scene 2: The Wheel Room",
        level: 2,
        body: "The sluice gate is jammed.",
        gmOnly: false,
        provenance: "suggested",
      },
    ],
    scenes: [
      {
        sourceId: "sec-landing",
        title: "Scene 1: The Ferry Landing",
        conditions: ["Players arrive at dusk"],
        provenance: "source-grounded",
      },
    ],
    npcs: [
      {
        name: "Wick",
        motivation: "Collect unpaid wages.",
        sourceId: "sec-landing",
        provenance: "suggested",
      },
    ],
    clues: [
      {
        clue: "Muddy bootprints lead to the sluice lever.",
        primarySourceId: "sec-landing",
        alternativeSourceId: "sec-wheel",
        provenance: "source-grounded",
      },
    ],
    encounters: [
      {
        sourceId: "sec-wheel",
        title: "Jammed Waterwheel",
        description: "The waterwheel is blocked by iron chains.",
        alternativeSolutions: [
          {
            method: "Persuasion",
            description: "Convince Wick to share the winch key.",
            socialBypassOfCombat: true,
          },
        ],
        provenance: "source-grounded",
      },
    ],
    secrets: [
      {
        id: "secret-1",
        text: "Wick hid the ledger inside the millstone.",
        sourceId: "sec-wheel",
        gmOnly: true,
        provenance: "source-grounded",
      },
    ],
    endings: [],
    ambiguities: [
      {
        id: "amb-1",
        code: "MISSING_HEADING",
        message: "Unlabelled subsection under Scene 2.",
        context: "Line 42",
        provenance: "unresolved",
      },
    ],
  };
}

function createMemoryIO(): AdventurePackageFileIO & {
  files: Map<string, string>;
  writeCalls: number;
} {
  const files = new Map<string, string>();
  const io: AdventurePackageFileIO & {
    files: Map<string, string>;
    writeCalls: number;
  } = {
    files,
    writeCalls: 0,
    async exists(path: string) {
      return files.has(path);
    },
    async read(path: string) {
      const value = files.get(path);
      if (value === undefined) throw new Error(`Not found: ${path}`);
      return value;
    },
    async write(path: string, content: string) {
      io.writeCalls += 1;
      files.set(path, content);
    },
    async list(dir: string) {
      const prefix = dir.endsWith("/") ? dir : `${dir}/`;
      return [...files.keys()].filter((key) => key.startsWith(prefix));
    },
    async remove(path: string) {
      files.delete(path);
    },
  };
  return io;
}

describe("AdventureImportReview", () => {
  it("AC2: displays provenance badges with matching aria-labels for all extracted components", () => {
    const draft = createTestPackage();
    render(AdventureImportReview, {
      props: {
        draft,
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(
      screen.getAllByLabelText("source-grounded").length,
    ).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByLabelText("suggested").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(
      screen.getAllByLabelText("unresolved").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("The Mill Mystery")).toBeTruthy();
    expect(screen.getByTestId("adventure-package-hash").textContent).toBe(
      draft.documentHash,
    );
    expect(screen.getByTestId("adventure-package-hash").className).toContain(
      "break-all",
    );
  });

  it("AC3: toggles secret gmOnly classification in memory and retains it on approval", async () => {
    const draft = createTestPackage();
    const onApprove = vi.fn();
    render(AdventureImportReview, {
      props: {
        draft,
        onApprove,
        onCancel: vi.fn(),
      },
    });

    expect(
      screen.getByTestId("secret-classification-0").textContent?.trim(),
    ).toBe("GM-only");
    const toggle = screen.getByTestId("secret-toggle-0");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    await fireEvent.click(toggle);
    expect(
      screen.getByTestId("secret-classification-0").textContent?.trim(),
    ).toBe("Player-visible");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await fireEvent.click(screen.getByTestId("adventure-approve-button"));
    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledTimes(1);
    });
    const approved = onApprove.mock.calls[0][0] as AdventureSourcePackage;
    expect(approved.secrets[0]?.gmOnly).toBe(false);
    expect(approved.status).toBe("approved");
  });

  it("AC4: reassigns scene, clue primarySourceId, and NPC sourceId before approval", async () => {
    const draft = createTestPackage();
    const onApprove = vi.fn();
    render(AdventureImportReview, {
      props: {
        draft,
        onApprove,
        onCancel: vi.fn(),
      },
    });

    const sceneSelect = screen.getByLabelText(
      "Assign section for scene Scene 1: The Ferry Landing",
    ) as HTMLSelectElement;
    const npcSelect = screen.getByLabelText(
      "Assign section for NPC Wick",
    ) as HTMLSelectElement;
    const clueSelect = screen.getByLabelText(
      "Assign section for clue 1",
    ) as HTMLSelectElement;

    await fireEvent.change(sceneSelect, { target: { value: "sec-wheel" } });
    await fireEvent.change(npcSelect, { target: { value: "sec-wheel" } });
    await fireEvent.change(clueSelect, { target: { value: "sec-wheel" } });

    await fireEvent.click(screen.getByTestId("adventure-approve-button"));
    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledTimes(1);
    });

    const approved = onApprove.mock.calls[0][0] as AdventureSourcePackage;
    expect(approved.scenes[0]?.sourceId).toBe("sec-wheel");
    expect(approved.npcs[0]?.sourceId).toBe("sec-wheel");
    expect(approved.clues[0]?.primarySourceId).toBe("sec-wheel");
  });

  it("AC5: locks editing controls after approval and rejects mutating an approved package in storage", async () => {
    const draft = createTestPackage();
    const io = createMemoryIO();
    render(AdventureImportReview, {
      props: {
        draft,
        onApprove: async (approved) => {
          await saveAdventurePackage(io, approved);
        },
        onCancel: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByTestId("adventure-approve-button"));
    await waitFor(() => {
      expect(
        screen.getByTestId("adventure-package-status").textContent,
      ).toContain("Approved");
    });

    expect(
      (screen.getByTestId("secret-toggle-0") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByLabelText(
          "Assign section for scene Scene 1: The Ferry Landing",
        ) as HTMLSelectElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByLabelText(
          "Assign section for NPC Wick",
        ) as HTMLSelectElement
      ).disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Assign section for clue 1") as HTMLSelectElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId("adventure-approve-button") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByTestId("adventure-approved-confirmation")).toBeTruthy();

    await expect(saveAdventurePackage(io, draft)).rejects.toThrow(
      "already approved",
    );
  });

  it("AC6: invokes onCancel and writes zero files when Cancel is clicked", async () => {
    const draft = createTestPackage();
    const io = createMemoryIO();
    const onCancel = vi.fn();
    render(AdventureImportReview, {
      props: {
        draft,
        onApprove: async (approved) => {
          await saveAdventurePackage(io, approved);
        },
        onCancel,
      },
    });

    await fireEvent.click(screen.getByTestId("secret-toggle-0"));
    await fireEvent.click(screen.getByTestId("adventure-cancel-button"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(io.writeCalls).toBe(0);
    expect(io.files.size).toBe(0);
  });

  it("AC7: renders pre-approval AI provider excerpt notice before the Approve button", () => {
    const draft = createTestPackage();
    render(AdventureImportReview, {
      props: {
        draft,
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    const notice = screen.getByRole("region", {
      name: "AI provider excerpt notice",
    });
    const approveButton = screen.getByTestId("adventure-approve-button");
    expect(notice.textContent).not.toContain("strictly local");
    expect(notice.textContent).toContain("on this device");
    expect(notice.textContent).toContain("opt-in Vault backup or sync");
    expect(notice.textContent).toContain("selected Oracle AI provider");
    expect(notice.textContent).toContain(
      "without claiming complete analysis, resolved ambiguities, or play readiness",
    );
    expect(
      Boolean(
        notice.compareDocumentPosition(approveButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it("AC8: renders error alert for empty or binary files and writes zero files to storage", async () => {
    const io = createMemoryIO();
    let importError = "";
    const { rerender } = render(AdventureEntryChoices, {
      props: {
        onDiscover: vi.fn(),
        onOwnPremise: vi.fn(),
        importError: null,
        onImportFile: async (file) => {
          const text = await file.text();
          const result = await parseAdventureMarkdown(text, {
            fileName: file.name,
          });
          if (!result.ok) {
            importError = result.error.message;
          }
        },
      },
    });

    const input = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const binaryFile = new File(["\u0000\u0001\u0002"], "binary.md");
    await fireEvent.change(input, { target: { files: [binaryFile] } });

    await waitFor(() => {
      expect(importError.length).toBeGreaterThan(0);
    });

    await rerender({
      onDiscover: vi.fn(),
      onOwnPremise: vi.fn(),
      importError,
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(importError);
    expect(io.writeCalls).toBe(0);
    expect(io.files.size).toBe(0);
  });

  it("AC9: exposes keyboard-accessible controls with WCAG labels", async () => {
    const draft = createTestPackage();
    render(AdventureImportReview, {
      props: {
        draft,
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    const toggle = screen.getByTestId("secret-toggle-0");
    const sceneSelect = screen.getByLabelText(
      "Assign section for scene Scene 1: The Ferry Landing",
    ) as HTMLSelectElement;
    const approveButton = screen.getByTestId("adventure-approve-button");
    const cancelButton = screen.getByTestId("adventure-cancel-button");

    for (const el of [toggle, sceneSelect, approveButton, cancelButton]) {
      expect(el.getAttribute("tabindex")).not.toBe("-1");
    }

    toggle.focus();
    expect(document.activeElement).toBe(toggle);
    await fireEvent.keyDown(toggle, { key: "Enter" });
    await fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    sceneSelect.focus();
    expect(document.activeElement).toBe(sceneSelect);
    await fireEvent.keyDown(sceneSelect, { key: "ArrowDown" });
    await fireEvent.change(sceneSelect, { target: { value: "sec-wheel" } });
    expect(sceneSelect.value).toBe("sec-wheel");
  });
});
