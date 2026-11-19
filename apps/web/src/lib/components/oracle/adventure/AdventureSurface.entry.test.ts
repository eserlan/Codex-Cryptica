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
  setApprovedPackageLookup: vi.fn(),
  setContextResolver: vi.fn(),
  list: vi.fn(
    async (): Promise<{
      effectiveActiveId: string | null;
      entries: any[];
    }> => ({
      effectiveActiveId: null,
      entries: [],
    }),
  ),
  notify: vi.fn(),
  characters: [] as Array<{ id: string; name: string }>,
  pendingRumour: null as any,
  cancelRumourReturn: true,
  saveApprovedPackage: vi.fn(async (_vaultId: string, pkg: any) => ({
    status: "created",
    path: `.codex/adventures/packages/${"a".repeat(64)}.json`,
    hash: "a".repeat(64),
    package: pkg,
  })),
  coordinatePackagePins: vi.fn(),
  removeApprovedPackage: vi.fn(
    async (
      _vaultId: string,
      hash: string,
      pinnedHashes: ReadonlySet<string> = new Set(),
    ) => {
      if (pinnedHashes.has(hash)) {
        return {
          status: "refused" as const,
          hash,
          path: `.codex/adventures/packages/${hash}.json`,
          reason:
            "This version is still in use by an adventure session, so it cannot be removed. Sessions keep playing the exact version they started with.",
        };
      }
      env.approvedPackages = env.approvedPackages.filter(
        (item) => item.hash !== hash,
      );
      return {
        status: "removed" as const,
        hash,
        path: `.codex/adventures/packages/${hash}.json`,
      };
    },
  ),
  approvedPackages: [] as any[],
  listApprovedPackages: vi.fn(async () => env.approvedPackages),
  openSession: vi.fn(async () => {}),
  resumeArchived: vi.fn(async () => {}),
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
      open: env.openSession,
      resumeArchived: env.resumeArchived,
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
    setApprovedPackageLookup: env.setApprovedPackageLookup,
    list: env.list,
  },
}));
vi.mock("#lib/services/adventure/adventure-package-storage.js", () => ({
  adventurePackageRepository: {
    setRootResolver: env.setRootResolver,
    setPackagePinCoordination: env.coordinatePackagePins,
    saveApproved: env.saveApprovedPackage,
    saveApprovedJson: env.saveApprovedPackage,
    removeApproved: env.removeApprovedPackage,
    listApproved: env.listApprovedPackages,
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

import { computeAdventureJsonHash } from "@codex/adventure-engine";
import AdventureSurface from "./AdventureSurface.svelte";

function entrySampleJson(overrides: any = {}) {
  return {
    formatVersion: "adventure-json/v1",
    id: "the-sunken-mill",
    title: "The Sunken Mill",
    version: "1.0.0",
    premise: {
      background: "The stone mill stopped turning.",
      hook: "Maren asks the party to inspect the sluice gate.",
    },
    source: { title: "The Sunken Mill", license: "CC0-1.0" },
    locations: [
      {
        id: "loc-landing",
        name: "The Ferry Landing",
        summary: "Fog clings to the pilings.",
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    actors: [],
    factions: [],
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1: The Ferry Landing",
        summary: "Arrival at dusk.",
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    encounters: [],
    clues: [],
    rumours: [],
    items: [],
    secrets: [],
    endings: [],
    unresolved: [],
    ...overrides,
  };
}

async function storedApproved(pkg: any) {
  const hash = await computeAdventureJsonHash(pkg);
  return {
    hash,
    path: `.codex/adventures/packages/${hash}.json`,
    originFormat: "adventure-json/v1" as const,
    package: pkg,
  };
}

beforeEach(() => {
  env.openIntentGeneratorWorkflow.mockClear();
  env.openActive.mockClear();
  env.openSession.mockClear();
  env.resumeArchived.mockClear();
  env.approvedPackages = [];
  env.listApprovedPackages.mockReset();
  env.listApprovedPackages.mockImplementation(async () => env.approvedPackages);
  env.list.mockResolvedValue({ effectiveActiveId: null, entries: [] });
  env.vaultReady = true;
  env.activeVaultId = "vault-1";
  env.isGuest = false;
  env.setWorldEntryRumourGenerator.mockClear();
  env.worldEntryRumourGenerator = null;
  env.list.mockClear();
  env.pendingRumour = null;
  env.characters = [];
  env.saveApprovedPackage.mockClear();
  env.removeApprovedPackage.mockClear();
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

  it("imports a valid Adventure JSON file via picker or dropzone and transitions to AdventureImportReview", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const sampleJson = {
      formatVersion: "adventure-json/v1",
      id: "the-sunken-mill",
      title: "The Sunken Mill",
      version: "1.0.0",
      premise: {
        background: "The stone mill stopped turning.",
        hook: "Maren asks the party to inspect the sluice gate.",
      },
      source: { title: "The Sunken Mill", license: "CC0-1.0" },
      locations: [
        {
          id: "loc-landing",
          name: "The Ferry Landing",
          summary: "Fog clings to the pilings.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      actors: [
        {
          id: "actor-wick",
          name: "Wick",
          summary: "An anxious millhand.",
          motivation: "Collect unpaid wages.",
          visibility: "player-visible",
          epistemicStatus: "inferred",
        },
      ],
      factions: [],
      scenes: [
        {
          id: "scene-1",
          title: "Scene 1: The Ferry Landing",
          summary: "Arrival at dusk.",
          locationId: "loc-landing",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      encounters: [],
      clues: [],
      rumours: [],
      items: [],
      secrets: [
        {
          id: "secret-1",
          text: "The ferryman knows the miller's secret.",
          visibility: "gm-only",
          epistemicStatus: "explicit",
        },
      ],
      endings: [],
      unresolved: [],
    };

    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const file = new File([JSON.stringify(sampleJson)], "sunken-mill.json", {
      type: "application/json",
    });

    await fireEvent.change(fileInput, { target: { files: [file] } });

    const review = await screen.findByTestId("adventure-import-review");
    expect(review).toBeTruthy();
    expect(review.textContent).toContain("The Sunken Mill");
    await waitFor(() => {
      expect(screen.getByTestId("adventure-package-hash").textContent).toMatch(
        /^[a-f0-9]{64}$/,
      );
    });
    expect(screen.getByTestId("review-locations")).toBeTruthy();
    expect(screen.getByTestId("review-actors")).toBeTruthy();
    expect(screen.getByTestId("review-scenes")).toBeTruthy();
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

  it("reports actionable validation errors for malformed JSON and semantic errors without writing", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;

    const malformed = new File(["{bad json"], "broken.json", {
      type: "application/json",
    });
    await fireEvent.change(fileInput, { target: { files: [malformed] } });

    const malformedAlert = await screen.findByTestId("adventure-import-error");
    expect(malformedAlert.getAttribute("role")).toBe("alert");
    expect(malformedAlert.textContent).toContain("INVALID_JSON");
    expect(screen.queryByTestId("adventure-import-review")).toBeNull();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();

    const invalidDoc = {
      formatVersion: "adventure-json/v1",
      id: "bad-doc",
      title: "Bad Doc",
      version: "1.0.0",
      premise: { background: "bg", hook: "hk" },
      source: { title: "Bad Doc" },
      locations: [],
      actors: [],
      factions: [],
      scenes: [
        {
          id: "dup-id",
          title: "Scene 1",
          summary: "Summary",
          locationId: "missing-loc",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      encounters: [],
      clues: [],
      rumours: [],
      items: [],
      secrets: [
        {
          id: "dup-id",
          text: "Secret",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      endings: [],
      unresolved: [],
    };
    const invalidFile = new File([JSON.stringify(invalidDoc)], "invalid.json", {
      type: "application/json",
    });
    await fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    const invalidAlert = await screen.findByTestId("adventure-import-error");
    expect(invalidAlert.textContent).toContain("INVALID_VISIBILITY");
    expect(invalidAlert.textContent).toContain("secrets[0].visibility");
    expect(invalidAlert.textContent).toContain("dup-id");
    expect(screen.queryByTestId("adventure-import-review")).toBeNull();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("rejects non-JSON files on the primary JSON import path", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const mdFile = new File(["# Title"], "module.md", {
      type: "text/markdown",
    });
    await fireEvent.change(fileInput, { target: { files: [mdFile] } });

    const alert = await screen.findByTestId("adventure-import-error");
    expect(alert.textContent).toContain("Adventure JSON");
    expect(screen.queryByTestId("adventure-import-review")).toBeNull();
  });

  it("normalizes experimental Markdown imports into AdventureJsonV1 for review", async () => {
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

    const expInput = screen.getByTestId(
      "adventure-experimental-file-input",
    ) as HTMLInputElement;
    const file = new File([markdown], "sunken-mill.md", {
      type: "text/markdown",
    });

    await fireEvent.change(expInput, { target: { files: [file] } });

    const review = await screen.findByTestId("adventure-import-review");
    expect(review.textContent).toContain("The Sunken Mill");
    expect(
      screen.getByTestId("adventure-experimental-origin").textContent,
    ).toContain("Experimental Markdown");
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("lazy-loads the PDF importer on experimental .pdf selection and preserves page citations", async () => {
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
        scenes: [
          {
            sourceId: "scene-1-landing",
            title: "Scene 1: The Ferry Landing",
            conditions: [],
            provenance: "suggested",
          },
        ],
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

    const expInput = screen.getByTestId(
      "adventure-experimental-file-input",
    ) as HTMLInputElement;
    const pdfFile = new File(["%PDF-1.4"], "mill-adventure.pdf", {
      type: "application/pdf",
    });

    await fireEvent.change(expInput, { target: { files: [pdfFile] } });

    const review = await screen.findByTestId("adventure-import-review");
    expect(review.textContent).toContain("The Last Grind");
    expect(env.importAdventurePdfFile).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getAllByTestId("entity-source-ref")
        .map((e) => e.textContent?.trim()),
    ).toContain("pp. 2–3 · Scene 1: The Ferry Landing · #scene-1-landing");
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

      const expInput = screen.getByTestId(
        "adventure-experimental-file-input",
      ) as HTMLInputElement;
      const pdfFile = new File(["%PDF-1.4"], "bad.pdf", {
        type: "application/pdf",
      });
      await fireEvent.change(expInput, { target: { files: [pdfFile] } });

      const alert = await screen.findByTestId("adventure-import-error");
      expect(alert.getAttribute("role")).toBe("alert");
      expect(alert.textContent).toContain(err.message);
      expect(screen.queryByTestId("adventure-import-review")).toBeNull();
      expect(env.saveApprovedPackage).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("rejects invalid UTF-8 through the experimental Markdown picker without opening review or saving", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const expInput = screen.getByTestId(
      "adventure-experimental-file-input",
    ) as HTMLInputElement;
    const file = new File(
      [new Uint8Array([0x23, 0x20, 0xff, 0x0a])],
      "invalid-utf8.md",
      { type: "text/markdown" },
    );

    await fireEvent.change(expInput, { target: { files: [file] } });

    expect(
      (await screen.findByTestId("adventure-import-error")).textContent,
    ).toContain("UTF-8");
    expect(screen.queryByTestId("adventure-import-review")).toBeNull();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("rejects oversized JSON, Markdown, and PDF files before reading them", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const jsonInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    const largeJson = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "large.json",
      { type: "application/json" },
    );
    const jsonRead = vi.spyOn(largeJson, "arrayBuffer");
    await fireEvent.change(jsonInput, { target: { files: [largeJson] } });
    expect(
      (await screen.findByTestId("adventure-import-error")).textContent,
    ).toContain("10 MiB");
    expect(jsonRead).not.toHaveBeenCalled();

    const expInput = screen.getByTestId(
      "adventure-experimental-file-input",
    ) as HTMLInputElement;
    const largeMd = new File(
      [new Uint8Array(2 * 1024 * 1024 + 1)],
      "large.md",
      {
        type: "text/markdown",
      },
    );
    const mdRead = vi.spyOn(largeMd, "arrayBuffer");
    await fireEvent.change(expInput, { target: { files: [largeMd] } });
    expect(
      (await screen.findByTestId("adventure-import-error")).textContent,
    ).toContain("2 MiB");
    expect(mdRead).not.toHaveBeenCalled();

    const largePdf = new File(
      [new Uint8Array(20 * 1024 * 1024 + 1)],
      "large.pdf",
      { type: "application/pdf" },
    );
    const pdfRead = vi.spyOn(largePdf, "arrayBuffer");
    await fireEvent.change(expInput, { target: { files: [largePdf] } });
    expect(
      (await screen.findByTestId("adventure-import-error")).textContent,
    ).toContain("20 MiB");
    expect(pdfRead).not.toHaveBeenCalled();
    expect(env.importAdventurePdfFile).not.toHaveBeenCalled();
  });

  it("aborts a pending PDF import when the surface unmounts", async () => {
    let capturedSignal: AbortSignal | undefined;
    env.importAdventurePdfFile.mockImplementation(
      (_bytes: unknown, _name: unknown, signal?: AbortSignal) => {
        capturedSignal = signal;
        return new Promise(() => {});
      },
    );
    const { unmount } = render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");
    const expInput = screen.getByTestId(
      "adventure-experimental-file-input",
    ) as HTMLInputElement;
    const pdfFile = new File(["%PDF-1.4"], "pending.pdf", {
      type: "application/pdf",
    });
    await fireEvent.change(expInput, { target: { files: [pdfFile] } });
    await waitFor(() => expect(env.importAdventurePdfFile).toHaveBeenCalled());
    expect(capturedSignal?.aborted).toBe(false);
    unmount();
    expect(capturedSignal?.aborted).toBe(true);
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
    expect(fileInput.disabled).toBe(true);
    const file = new File(
      ['{"formatVersion":"adventure-json/v1"}'],
      "guest.json",
      {
        type: "application/json",
      },
    );
    const read = vi.spyOn(file, "arrayBuffer");

    fileInput.disabled = false;
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
    const expInput = screen.getByTestId(
      "adventure-experimental-file-input",
    ) as HTMLInputElement;

    await fireEvent.change(expInput, { target: { files: [file] } });
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
    const expInput = screen.getByTestId(
      "adventure-experimental-file-input",
    ) as HTMLInputElement;
    const file = new File(
      ["# The Mill\n\n## Scene 1\nA mill stands by the river."],
      "mill.md",
      { type: "text/markdown" },
    );

    await fireEvent.change(expInput, { target: { files: [file] } });
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
    const expInput = screen.getByTestId(
      "adventure-experimental-file-input",
    ) as HTMLInputElement;

    await fireEvent.change(expInput, { target: { files: [earlier] } });
    await waitFor(() => expect(earlierRead).toHaveBeenCalledOnce());

    const newer = new File(
      ["# The New Adventure\n\n## Scene 1\nNew content"],
      "newer.md",
      { type: "text/markdown" },
    );
    await fireEvent.change(expInput, { target: { files: [newer] } });
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

  it("keeps a newer import when an earlier predecessor lookup completes later", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");
    env.listApprovedPackages.mockClear();

    let resolveEarlierLookup!: (items: any[]) => void;
    const earlierLookup = new Promise<any[]>((resolve) => {
      resolveEarlierLookup = resolve;
    });
    env.listApprovedPackages
      .mockReturnValueOnce(earlierLookup)
      .mockImplementation(async () => env.approvedPackages);
    const input = screen.getByTestId(
      "adventure-experimental-file-input",
    ) as HTMLInputElement;
    const earlier = new File(
      ["# Earlier Module\n\n## Scene 1\nOld content"],
      "earlier.md",
      { type: "text/markdown" },
    );
    await fireEvent.change(input, { target: { files: [earlier] } });
    await waitFor(() =>
      expect(env.listApprovedPackages).toHaveBeenCalledOnce(),
    );

    const newer = new File(
      ["# Newer Module\n\n## Scene 1\nNew content"],
      "newer.md",
      { type: "text/markdown" },
    );
    await fireEvent.change(input, { target: { files: [newer] } });
    expect(
      (await screen.findByTestId("adventure-import-review")).textContent,
    ).toContain("Newer Module");

    resolveEarlierLookup([]);
    await waitFor(() => {
      expect(
        screen.getByTestId("adventure-import-review").textContent,
      ).toContain("Newer Module");
    });
  });

  it("lists approved packages and lets users start a pinned session or resume an existing one", async () => {
    const hash = "e".repeat(64);
    env.approvedPackages = [
      {
        hash,
        path: `.codex/adventures/packages/${hash}.json`,
        originFormat: "adventure-json/v1",
        package: {
          formatVersion: "adventure-json/v1",
          id: "the-last-grind",
          title: "The Last Grind",
          version: "1.0.0",
          premise: {
            background: "The village is hungry.",
            hook: "Maren asks for help.",
          },
          source: { title: "The Last Grind" },
          locations: [],
          actors: [],
          factions: [],
          scenes: [],
          encounters: [],
          clues: [],
          rumours: [],
          items: [],
          secrets: [],
          endings: [],
          unresolved: [],
        },
      },
    ];
    env.list.mockResolvedValue({
      effectiveActiveId: "session-pinned-1",
      entries: [
        {
          id: "session-pinned-1",
          title: "Pinned Run",
          status: "active",
          loadCondition: "normal",
          sourcePackage: {
            packageId: "the-last-grind",
            version: "1.0.0",
            formatVersion: "adventure-json/v1",
            hash,
          },
        },
      ],
    });

    render(AdventureSurface);
    await screen.findByTestId("approved-adventure-packages");

    await fireEvent.click(
      screen.getByTestId(
        `approved-package-resume-the-last-grind-${hash.slice(0, 8)}`,
      ),
    );
    expect(env.openSession).toHaveBeenCalledWith("vault-1", "session-pinned-1");

    await fireEvent.click(
      screen.getByTestId(
        `approved-package-start-the-last-grind-${hash.slice(0, 8)}`,
      ),
    );
    const pinnedBanner = await screen.findByTestId("adventure-pinned-package");
    expect(pinnedBanner.textContent).toContain("the-last-grind v1.0.0");
  });

  it("shows an already-imported notice for an identical re-import without entering review or writing", async () => {
    const pkg = entrySampleJson();
    env.approvedPackages = [await storedApproved(pkg)];
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const file = new File([JSON.stringify(pkg)], "sunken-mill.json", {
      type: "application/json",
    });
    await fireEvent.change(screen.getByTestId("adventure-file-input"), {
      target: { files: [file] },
    });

    const notice = await screen.findByTestId(
      "adventure-import-duplicate-notice",
    );
    expect(notice.textContent).toContain("Already imported");
    expect(notice.textContent).toContain("The Sunken Mill");
    expect(notice.textContent).toContain("the-sunken-mill");
    expect(notice.textContent).toContain("v1.0.0");
    expect(screen.queryByTestId("adventure-import-review")).toBeNull();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("deduplicates a legacy approved package by normalized canonical content", async () => {
    const pkg = entrySampleJson();
    const stored = await storedApproved(pkg);
    const legacyFileHash = "f".repeat(64);
    env.approvedPackages = [
      {
        ...stored,
        hash: legacyFileHash,
        path: `.codex/adventures/packages/${legacyFileHash}.json`,
        originFormat: "legacy-source-package",
      },
    ];
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const file = new File([JSON.stringify(pkg)], "sunken-mill.json", {
      type: "application/json",
    });
    await fireEvent.change(screen.getByTestId("adventure-file-input"), {
      target: { files: [file] },
    });

    const notice = await screen.findByTestId(
      "adventure-import-duplicate-notice",
    );
    expect(notice.textContent).toContain(legacyFileHash.slice(0, 12));
    expect(screen.queryByTestId("adventure-import-review")).toBeNull();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("enters review with the diff for a changed package and warns when the version did not increase", async () => {
    const v1 = entrySampleJson();
    env.approvedPackages = [await storedApproved(v1)];
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    const changed = entrySampleJson({
      scenes: [
        {
          id: "scene-1",
          title: "Scene 1: The Ferry Landing",
          summary: "Arrival at midnight, revised.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
    });
    const file = new File([JSON.stringify(changed)], "sunken-mill-v2.json", {
      type: "application/json",
    });
    await fireEvent.change(screen.getByTestId("adventure-file-input"), {
      target: { files: [file] },
    });

    const review = await screen.findByTestId("adventure-import-review");
    expect(review).toBeTruthy();
    const diff = screen.getByTestId("adventure-import-diff");
    expect(diff.textContent).toContain("the-sunken-mill");
    expect(diff.textContent).toContain("v1.0.0");
    expect(
      screen.getByTestId("adventure-import-diff-version-warning").textContent,
    ).toContain("did not increase");
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByTestId("adventure-cancel-button"));
    expect(screen.queryByTestId("adventure-import-review")).toBeNull();
    expect(env.saveApprovedPackage).not.toHaveBeenCalled();
  });

  it("treats a deduplicated approval as already-imported success, not an approve error", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");
    const pkg = entrySampleJson();
    const hash = await computeAdventureJsonHash(pkg);
    env.saveApprovedPackage.mockResolvedValueOnce({
      status: "deduplicated",
      path: `.codex/adventures/packages/${hash}.json`,
      hash,
      package: pkg,
    });

    const file = new File([JSON.stringify(pkg)], "sunken-mill.json", {
      type: "application/json",
    });
    await fireEvent.change(screen.getByTestId("adventure-file-input"), {
      target: { files: [file] },
    });
    await screen.findByTestId("adventure-import-review");
    await fireEvent.click(screen.getByTestId("adventure-approve-button"));

    await waitFor(() => {
      expect(
        screen.getByTestId("adventure-package-status").textContent,
      ).toContain("Approved");
    });
    expect(screen.queryByTestId("adventure-approve-error")).toBeNull();
    expect(env.notify).toHaveBeenCalledWith(
      expect.stringContaining("already imported"),
      "success",
    );
  });

  it("groups versions by id and keeps a v1 session resumable after v2 is listed", async () => {
    const v1 = entrySampleJson();
    const v2 = entrySampleJson({ version: "1.1.0", title: "The Sunken Mill" });
    const storedV1 = await storedApproved(v1);
    const storedV2 = await storedApproved(v2);
    env.approvedPackages = [storedV2, storedV1];
    env.list.mockResolvedValue({
      effectiveActiveId: "session-v1",
      entries: [
        {
          id: "session-v1",
          title: "First Run",
          status: "active",
          loadCondition: "normal",
          sourcePackage: {
            packageId: "the-sunken-mill",
            version: "1.0.0",
            formatVersion: "adventure-json/v1",
            hash: storedV1.hash,
          },
        },
      ],
    });
    render(AdventureSurface);
    await screen.findByTestId("approved-adventure-packages");

    const group = screen.getByTestId("approved-package-group-the-sunken-mill");
    expect(group.textContent).toContain("2 versions");
    await fireEvent.click(
      screen.getByTestId(
        `approved-package-resume-the-sunken-mill-${storedV1.hash.slice(0, 8)}`,
      ),
    );
    expect(env.openSession).toHaveBeenCalledWith("vault-1", "session-v1");

    await fireEvent.click(
      screen.getByTestId(
        `approved-package-start-the-sunken-mill-${storedV2.hash.slice(0, 8)}`,
      ),
    );
    const banner = await screen.findByTestId("adventure-pinned-package");
    expect(banner.textContent).toContain("the-sunken-mill v1.1.0");
  });

  it("refuses removal of an in-use version (active and archived sessions) with a plain explanation", async () => {
    const v1 = entrySampleJson();
    const storedV1 = await storedApproved(v1);
    env.approvedPackages = [storedV1];
    env.list.mockResolvedValue({
      effectiveActiveId: "session-active",
      entries: [
        {
          id: "session-active",
          title: "Active Run",
          status: "active",
          loadCondition: "normal",
          sourcePackage: {
            packageId: "the-sunken-mill",
            version: "1.0.0",
            formatVersion: "adventure-json/v1",
            hash: storedV1.hash,
          },
        },
        {
          id: "session-archived",
          title: "Archived Run",
          status: "archived",
          loadCondition: "normal",
          sourcePackage: {
            packageId: "the-sunken-mill",
            version: "1.0.0",
            formatVersion: "adventure-json/v1",
            hash: storedV1.hash,
          },
        },
      ],
    });
    render(AdventureSurface);
    await screen.findByTestId("approved-adventure-packages");

    await fireEvent.click(
      screen.getByTestId(
        `approved-package-remove-the-sunken-mill-${storedV1.hash.slice(0, 8)}`,
      ),
    );
    const error = await screen.findByTestId("approved-package-removal-error");
    expect(error.textContent).toContain("still in use");
    expect(env.removeApprovedPackage).toHaveBeenCalledTimes(1);
    expect(env.approvedPackages).toHaveLength(1);
  });

  it("removes an unused version and leaves the other version listed", async () => {
    const v1 = entrySampleJson();
    const v2 = entrySampleJson({ version: "1.1.0" });
    const storedV1 = await storedApproved(v1);
    const storedV2 = await storedApproved(v2);
    env.approvedPackages = [storedV1, storedV2];
    env.list.mockResolvedValue({ effectiveActiveId: null, entries: [] });
    render(AdventureSurface);
    await screen.findByTestId("approved-adventure-packages");

    await fireEvent.click(
      screen.getByTestId(
        `approved-package-remove-the-sunken-mill-${storedV1.hash.slice(0, 8)}`,
      ),
    );
    const message = await screen.findByTestId(
      "approved-package-removal-message",
    );
    expect(message.textContent).toContain("Removed");
    await waitFor(() => {
      expect(env.approvedPackages.map((item) => item.hash)).toEqual([
        storedV2.hash,
      ]);
    });
    expect(
      screen.queryByTestId(
        `approved-package-item-the-sunken-mill-${storedV1.hash.slice(0, 8)}`,
      ),
    ).toBeNull();
    expect(
      screen.getByTestId(
        `approved-package-item-the-sunken-mill-${storedV2.hash.slice(0, 8)}`,
      ),
    ).toBeTruthy();
  });
});
