/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  openIntentGeneratorWorkflow: vi.fn(),
  vaultReady: true,
  activeVaultId: "vault-1",
  isGuest: false,
  openActive: vi.fn(async () => false),
  setWorldEntryRumourGenerator: vi.fn((callback: unknown) => {
    env.worldEntryRumourGenerator = callback;
  }),
  worldEntryRumourGenerator: null as unknown,
  setRootResolver: vi.fn(),
  setContextResolver: vi.fn(),
  list: vi.fn(async () => ({
    effectiveActiveId: null,
    entries: [],
  })),
  notify: vi.fn(),
  characters: [] as Array<{ id: string; name: string }>,
  pendingRumour: null as any,
  cancelRumourReturn: true,
  saveApprovedPackage: vi.fn(async (_vaultId: string, pkg: any) => ({
    status: "created",
    path: `.codex/adventures/packages/${pkg.documentHash}.json`,
    package: pkg,
  })),
  importAdventurePdfFile: vi.fn(),
}));

vi.mock("#lib/stores/oracle.svelte.js", () => ({
  oracle: {
    vault: {
      get isInitialized() {
        return env.vaultReady;
      },
      get activeVaultId() {
        return env.activeVaultId;
      },
      entities: {},
      allEntities: [],
      getSpecificVaultHandle: vi.fn(),
    },
    adventure: {
      session: null,
      openActive: env.openActive,
      setWorldEntryRumourGenerator: env.setWorldEntryRumourGenerator,
      readOnly: false,
    },
  },
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    isInitialized: true,
    get activeVaultId() {
      return env.activeVaultId;
    },
    status: "ready",
    get isGuest() {
      return env.isGuest;
    },
  },
}));
vi.mock("#lib/stores/calendar.svelte.js", () => ({
  calendarStore: { getSnapshot: () => ({ config: {} }) },
}));
vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: {
    openIntentGeneratorWorkflow: env.openIntentGeneratorWorkflow,
    openGeneratorWorkflow: env.openIntentGeneratorWorkflow,
  },
}));
vi.mock("#lib/services/adventure/adventure-session-repository.js", () => ({
  adventureSessionRepository: {
    setRootResolver: env.setRootResolver,
    list: env.list,
  },
}));
vi.mock("#lib/services/adventure/adventure-package-storage.js", () => ({
  adventurePackageRepository: {
    setRootResolver: env.setRootResolver,
    saveApproved: env.saveApprovedPackage,
  },
}));
vi.mock("#lib/services/adventure/adventure-context-service.js", () => ({
  adventureContextService: { setResolver: env.setContextResolver },
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { notify: env.notify, confirm: vi.fn() },
}));
vi.mock("#lib/services/solo-characters.js", () => ({
  characterChoices: () => env.characters,
}));
vi.mock(
  "#lib/services/adventure/adventure-provisional-fact-creator.js",
  () => ({
    createAdventureEntityDraft: vi.fn(),
  }),
);
vi.mock("#lib/stores/oracle/rumour-adventure-handoff.svelte.js", () => ({
  rumourAdventureHandoff: {
    forVault: () => env.pendingRumour,
    clear: vi.fn(),
    cancel: vi.fn(() => env.cancelRumourReturn),
  },
}));

vi.mock("#lib/services/adventure/adventure-pdf-import.js", () => ({
  importAdventurePdfFile: env.importAdventurePdfFile,
}));

import AdventureSurface from "./AdventureSurface.svelte";

beforeEach(() => {
  env.openIntentGeneratorWorkflow.mockClear();
  env.openActive.mockClear();
  env.vaultReady = true;
  env.activeVaultId = "vault-1";
  env.isGuest = false;
  env.setWorldEntryRumourGenerator.mockClear();
  env.worldEntryRumourGenerator = null;
  env.list.mockClear();
  env.pendingRumour = null;
  env.characters = [];
  env.saveApprovedPackage.mockClear();
  env.importAdventurePdfFile.mockReset();
});

describe("AdventureSurface entry", () => {
  it("registers the background rumour generator with the adventure manager", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    expect(env.setWorldEntryRumourGenerator).toHaveBeenCalledTimes(1);
    expect(env.setWorldEntryRumourGenerator).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(env.worldEntryRumourGenerator).toEqual(expect.any(Function));
  });

  it("starts on approach choices and opens the existing Rumour Generator", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    expect(screen.queryByLabelText("Premise")).toBeNull();
    await fireEvent.click(screen.getByTestId("adventure-discover"));

    expect(env.openIntentGeneratorWorkflow).toHaveBeenCalledTimes(1);
    expect(env.openIntentGeneratorWorkflow).toHaveBeenCalledWith("rumour");
    expect(env.openActive).toHaveBeenCalledWith("vault-1");
  });

  it("does not look for an active adventure until the Vault has loaded", () => {
    env.vaultReady = false;
    render(AdventureSurface);
    expect(env.openActive).not.toHaveBeenCalled();
    expect(screen.getByText("Checking for an active adventure…")).toBeTruthy();
    expect(screen.queryByTestId("adventure-entry-choices")).toBeNull();
  });

  it("opens the manual form and preserves its draft when choosing another approach", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");
    await fireEvent.click(screen.getByTestId("adventure-own-premise"));

    const premise = screen.getByLabelText("Premise") as HTMLTextAreaElement;
    await fireEvent.input(premise, {
      target: { value: "A wagon vanished outside the city." },
    });
    await fireEvent.click(screen.getByTestId("adventure-change-start"));
    expect(screen.getByTestId("adventure-entry-choices")).toBeTruthy();
    expect(screen.queryByLabelText("Premise")).toBeNull();

    await fireEvent.click(screen.getByTestId("adventure-own-premise"));
    await waitFor(() => {
      expect(
        (screen.getByLabelText("Premise") as HTMLTextAreaElement).value,
      ).toBe("A wagon vanished outside the city.");
    });
  });

  it("keeps a canonical Vault character selected after returning to the choices", async () => {
    env.characters = [{ id: "kael", name: "Kael" }];
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");
    await fireEvent.click(screen.getByTestId("adventure-own-premise"));

    const selected = screen.getByTestId(
      "adventure-character-picker",
    ) as HTMLSelectElement;
    await fireEvent.change(selected, { target: { value: "kael" } });
    expect(selected.value).toBe("kael");

    await fireEvent.click(screen.getByTestId("adventure-change-start"));
    await fireEvent.click(screen.getByTestId("adventure-own-premise"));

    expect(
      (screen.getByTestId("adventure-character-picker") as HTMLSelectElement)
        .value,
    ).toBe("kael");
  });

  it("opens the ready-made adventure generator when clicking Surprise Me with an Adventure", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    await fireEvent.click(screen.getByTestId("adventure-surprise-me"));

    expect(env.openIntentGeneratorWorkflow).toHaveBeenCalledTimes(1);
    expect(env.openIntentGeneratorWorkflow).toHaveBeenCalledWith("adventure");
  });

  it("prefills title and premise when a ready-made adventure handoff is present", async () => {
    env.pendingRumour = {
      selected: {
        playerVisible: {
          title: "The Whispering Spire",
          openingSituation: "A spire hums with blue lightning at twilight.",
          primaryObjective: "Deactivate the core before the storm breaks.",
          startingLocations: ["The Base"],
        },
      },
      scenario: {
        id: "adv-scenario-1",
        playerVisible: {
          rumour: "A spire hums with blue lightning at twilight.",
          lead: "Deactivate the core before the storm breaks.",
        },
        origin: { kind: "manual", manualId: "adv-scenario-1" },
      },
      adventureTitle: "The Whispering Spire",
      sourceGeneratorId: "adventure",
    };

    render(AdventureSurface);

    expect(await screen.findByTestId("selected-rumour-preview")).toBeTruthy();
    expect(screen.getByText("Prepared adventure seed")).toBeTruthy();
    expect(
      (screen.getByLabelText("Adventure title") as HTMLInputElement).value,
    ).toBe("The Whispering Spire");
    expect(
      (screen.getByLabelText("Premise") as HTMLTextAreaElement).value,
    ).toBe("A spire hums with blue lightning at twilight.");
  });

  it("reopens the adventure generator when cancelling a prepared adventure start", async () => {
    env.pendingRumour = {
      selected: {
        playerVisible: {
          title: "The Whispering Spire",
          openingSituation: "A spire hums with blue lightning at twilight.",
          primaryObjective: "Deactivate the core.",
          startingLocations: [],
        },
      },
      scenario: {
        id: "adv-scenario-1",
        playerVisible: {
          rumour: "A spire hums.",
          lead: "Deactivate core.",
        },
        origin: { kind: "manual", manualId: "adv-scenario-1" },
      },
      adventureTitle: "The Whispering Spire",
      sourceGeneratorId: "adventure",
    };

    render(AdventureSurface);
    const cancelBtn = await screen.findByTestId("cancel-rumour-start");
    expect(cancelBtn.textContent?.trim()).toBe("Cancel prepared adventure");

    await fireEvent.click(cancelBtn);
    expect(env.openIntentGeneratorWorkflow).toHaveBeenCalledWith("adventure");
  });

  it("imports a valid Markdown file and transitions to AdventureImportReview", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const markdown = [
      "# The Sunken Mill",
      "",
      "## Scene 1: The Ferry Landing",
      "> **Read aloud:** Fog clings to the pilings.",
      "> **GM only:** The ferryman knows the miller's secret.",
      "- **Scene condition:** Players arrive at dusk.",
      "",
      "### NPCs",
      "**Wick** — **Motivation:** Collect unpaid wages.",
    ].join("\n");

    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const file = new File([markdown], "sunken-mill.md", {
      type: "text/markdown",
    });

    await fireEvent.change(fileInput, { target: { files: [file] } });

    const review = await screen.findByTestId("adventure-import-review");
    expect(review).toBeTruthy();
    expect(review.textContent).toContain("The Sunken Mill");
    expect(screen.getByTestId("adventure-package-hash").textContent).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(screen.getByTestId("review-sections")).toBeTruthy();
    expect(screen.getByTestId("review-scenes")).toBeTruthy();
    expect(screen.getByTestId("review-npcs")).toBeTruthy();
    expect(screen.getByTestId("review-secrets")).toBeTruthy();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByTestId("adventure-approve-button"));
    await waitFor(() => {
      expect(env.saveApprovedPackage).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.getByTestId("adventure-package-status").textContent,
    ).toContain("Approved");
  });

  it("shows an error alert on empty Markdown upload without entering review or writing to storage", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const emptyFile = new File(["   "], "empty.md", { type: "text/markdown" });

    await fireEvent.change(fileInput, { target: { files: [emptyFile] } });

    const alert = await screen.findByTestId("adventure-import-error");
    expect(alert.getAttribute("role")).toBe("alert");
    expect(screen.queryByTestId("adventure-import-review")).toBeNull();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
    expect(env.importAdventurePdfFile).not.toHaveBeenCalled();
  });

  it("lazy-loads the PDF importer on .pdf selection and transitions to review with page references", async () => {
    env.importAdventurePdfFile.mockResolvedValue({
      ok: true,
      package: {
        schemaVersion: 1,
        status: "draft",
        documentHash: "b".repeat(64),
        sourceIdentity: {
          fileName: "mill-adventure.pdf",
          title: "The Last Grind",
        },
        importMethod: "pdf",
        importVersion: "1.0.0",
        sections: [
          {
            sourceId: "the-last-grind",
            title: "The Last Grind",
            level: 1,
            body: "A mill stands silent.",
            gmOnly: false,
            pageNumber: 1,
            provenance: "suggested",
          },
          {
            sourceId: "scene-1-landing",
            title: "Scene 1: The Ferry Landing",
            level: 2,
            body: "Fog clings to the jetty.",
            gmOnly: false,
            pageNumber: 2,
            pageEnd: 3,
            provenance: "suggested",
          },
        ],
        scenes: [],
        npcs: [],
        clues: [],
        encounters: [],
        secrets: [],
        endings: [],
        ambiguities: [],
      },
    });

    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const pdfFile = new File(["%PDF-1.4"], "mill-adventure.pdf", {
      type: "application/pdf",
    });

    await fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    const review = await screen.findByTestId("adventure-import-review");
    expect(review.textContent).toContain("The Last Grind");
    expect(env.importAdventurePdfFile).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getAllByTestId("section-page-ref")
        .map((e) => e.textContent?.trim()),
    ).toEqual(["p. 1", "pp. 2–3"]);
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("displays an error alert for image-only or encrypted PDFs without entering review or writing to storage", async () => {
    for (const err of [
      {
        code: "IMAGE_ONLY_PDF",
        message: "This PDF contains no extractable text; OCR is not available.",
      },
      {
        code: "ENCRYPTED_PDF",
        message: "Encrypted or password-protected PDFs are not supported.",
      },
    ]) {
      env.importAdventurePdfFile.mockResolvedValueOnce({
        ok: false,
        error: err,
      });

      const { unmount } = render(AdventureSurface);
      await screen.findByTestId("adventure-entry-choices");

      const fileInput = screen.getByTestId(
        "adventure-file-input",
      ) as HTMLInputElement;
      const pdfFile = new File(["%PDF-1.4"], "bad.pdf", {
        type: "application/pdf",
      });
      await fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      const alert = await screen.findByTestId("adventure-import-error");
      expect(alert.getAttribute("role")).toBe("alert");
      expect(alert.textContent).toContain(err.message);
      expect(screen.queryByTestId("adventure-import-review")).toBeNull();
      expect(env.saveApprovedPackage).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("rejects invalid UTF-8 through the file picker without opening review or saving", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const file = new File(
      [new Uint8Array([0x23, 0x20, 0xff, 0x0a])],
      "invalid-utf8.md",
      { type: "text/markdown" },
    );

    await fireEvent.change(fileInput, { target: { files: [file] } });

    expect(
      (await screen.findByTestId("adventure-import-error")).textContent,
    ).toContain("UTF-8");
    expect(screen.queryByTestId("adventure-import-review")).toBeNull();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("rejects oversized Markdown files before reading them", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.md", {
      type: "text/markdown",
    });
    const read = vi.spyOn(file, "arrayBuffer");

    await fireEvent.change(fileInput, { target: { files: [file] } });

    expect(
      (await screen.findByTestId("adventure-import-error")).textContent,
    ).toContain("2 MiB");
    expect(read).not.toHaveBeenCalled();
    expect(screen.queryByTestId("adventure-import-review")).toBeNull();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("blocks guest imports in the entry UI and in the import handler", async () => {
    env.isGuest = true;
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    expect(
      (screen.getByTestId("adventure-import") as HTMLButtonElement).disabled,
    ).toBe(true);
    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const file = new File(["# Guest adventure"], "guest.md", {
      type: "text/markdown",
    });
    const read = vi.spyOn(file, "arrayBuffer");

    await fireEvent.change(fileInput, { target: { files: [file] } });

    expect(
      (await screen.findByTestId("adventure-import-error")).textContent,
    ).toContain("owner Vault");
    expect(read).not.toHaveBeenCalled();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("discards a pending import after the active Vault changes", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    let resolveArrayBuffer!: (buffer: ArrayBuffer) => void;
    const pendingBuffer = new Promise<ArrayBuffer>((resolve) => {
      resolveArrayBuffer = resolve;
    });
    const file = new File(
      ["# The Old Vault\n\n## Scene 1\nOld content"],
      "old-vault.md",
      { type: "text/markdown" },
    );
    const read = vi.spyOn(file, "arrayBuffer").mockReturnValue(pendingBuffer);
    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;

    await fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(read).toHaveBeenCalledOnce());
    env.activeVaultId = "vault-2";
    resolveArrayBuffer(
      new TextEncoder().encode("# The Old Vault\n\n## Scene 1\nOld content")
        .buffer,
    );

    await waitFor(() => {
      expect(screen.getByTestId("adventure-entry-choices")).toBeTruthy();
      expect(screen.queryByTestId("adventure-import-review")).toBeNull();
    });
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("does not let a reviewed package be approved after switching Vaults", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");
    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const file = new File(
      ["# The Mill\n\n## Scene 1\nA mill stands by the river."],
      "mill.md",
      { type: "text/markdown" },
    );

    await fireEvent.change(fileInput, { target: { files: [file] } });
    await screen.findByTestId("adventure-import-review");
    env.activeVaultId = "vault-2";
    await fireEvent.click(screen.getByTestId("adventure-approve-button"));

    expect(
      (await screen.findByTestId("adventure-approve-error")).textContent,
    ).toContain("Return to the owner Vault");
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("keeps a newer import when an earlier file read completes later", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    let resolveArrayBuffer!: (buffer: ArrayBuffer) => void;
    const pendingBuffer = new Promise<ArrayBuffer>((resolve) => {
      resolveArrayBuffer = resolve;
    });
    const earlier = new File(
      ["# Earlier\n\n## Scene 1\nOld content"],
      "earlier.md",
      { type: "text/markdown" },
    );
    const earlierRead = vi
      .spyOn(earlier, "arrayBuffer")
      .mockReturnValue(pendingBuffer);
    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;

    await fireEvent.change(fileInput, { target: { files: [earlier] } });
    await waitFor(() => expect(earlierRead).toHaveBeenCalledOnce());

    const newer = new File(
      ["# The New Adventure\n\n## Scene 1\nNew content"],
      "newer.md",
      { type: "text/markdown" },
    );
    await fireEvent.change(fileInput, { target: { files: [newer] } });
    const review = await screen.findByTestId("adventure-import-review");
    expect(review.textContent).toContain("The New Adventure");

    resolveArrayBuffer(
      new TextEncoder().encode("# Earlier\n\n## Scene 1\nOld content").buffer,
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("adventure-import-review").textContent,
      ).toContain("The New Adventure");
    });
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });
});
