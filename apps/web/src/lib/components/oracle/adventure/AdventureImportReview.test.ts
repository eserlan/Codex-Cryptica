/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import {
  ADVENTURE_JSON_V1_FORMAT_VERSION,
  computeAdventureJsonHash,
  saveApprovedAdventureJson,
  validateAdventureJson,
  type AdventureJsonV1,
  type AdventurePackageFileIO,
} from "@codex/adventure-engine";
import AdventureEntryChoices from "./AdventureEntryChoices.svelte";
import AdventureImportReview from "./AdventureImportReview.svelte";

function createTestAdventureJson(): AdventureJsonV1 {
  return {
    formatVersion: ADVENTURE_JSON_V1_FORMAT_VERSION,
    id: "the-mill-mystery",
    title: "The Mill Mystery",
    version: "1.0.0",
    description: "A short mystery at a silent river mill.",
    premise: {
      background: "The stone mill stopped turning three nights ago.",
      hook: "Maren asks the party to inspect the sluice gate.",
      theme: ["mystery"],
      tone: "tense",
    },
    source: {
      title: "The Mill Mystery",
      authors: ["A. Author"],
      license: "CC0-1.0",
    },
    system: {
      name: "System-agnostic",
    },
    locations: [
      {
        id: "loc-landing",
        name: "The Ferry Landing",
        summary: "A rotting jetty across the reeds.",
        visibility: "player-visible",
        epistemicStatus: "explicit",
        sourceRef: { page: 1, section: "Scene 1: The Ferry Landing" },
      },
      {
        id: "loc-wheel",
        name: "The Wheel Room",
        summary: "Dimly lit room with a jammed sluice lever.",
        visibility: "gm-only",
        epistemicStatus: "inferred",
        sourceRef: { page: 2, pageEnd: 4, section: "Scene 2: The Wheel Room" },
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
        sourceRef: { section: "Scene 1: The Ferry Landing" },
      },
    ],
    factions: [],
    scenes: [
      {
        id: "scene-landing",
        title: "Scene 1: The Ferry Landing",
        summary: "Arrival at the jetty.",
        locationId: "loc-landing",
        readAloud: "The ferry bell tolls twice.",
        conditions: ["Players arrive at dusk"],
        visibility: "player-visible",
        epistemicStatus: "explicit",
        sourceRef: { page: 1, section: "Scene 1: The Ferry Landing" },
      },
    ],
    encounters: [
      {
        id: "enc-wheel",
        title: "Jammed Waterwheel",
        description: "The waterwheel is blocked by iron chains.",
        locationId: "loc-wheel",
        alternativeSolutions: [
          {
            method: "Persuasion",
            description: "Convince Wick to share the winch key.",
            socialBypassOfCombat: true,
          },
        ],
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    clues: [
      {
        id: "clue-prints",
        text: "Muddy bootprints lead to the sluice lever.",
        placedLocationId: "loc-landing",
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    rumours: [],
    items: [],
    secrets: [
      {
        id: "secret-1",
        text: "Wick hid the ledger inside the millstone.",
        relatedEntityIds: ["loc-wheel"],
        visibility: "gm-only",
        epistemicStatus: "explicit",
        sourceRef: { page: 3 },
      },
    ],
    endings: [],
    unresolved: [
      {
        id: "amb-1",
        code: "MISSING_HEADING",
        message: "Unlabelled subsection under Scene 2.",
        context: "Page 3",
        epistemicStatus: "unresolved",
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
      if (value === undefined) throw new Error(`Missing file: ${path}`);
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

describe("AdventureImportReview (AdventureJsonV1)", () => {
  it("AC3: keeps secrets locked gm-only while toggling non-secret entity visibility and updating canonical hash", async () => {
    const draft = createTestAdventureJson();
    const initialHash = await computeAdventureJsonHash(draft);
    const onApprove = vi.fn();

    render(AdventureImportReview, {
      props: {
        draft,
        onApprove,
        onCancel: vi.fn(),
      },
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("adventure-package-hash").textContent?.trim(),
      ).toBe(initialHash);
    });

    expect(
      screen.getByTestId("secret-classification-0").textContent?.trim(),
    ).toContain("GM-only");
    expect(screen.queryByTestId("secret-toggle-0")).toBeNull();

    expect(
      screen.getByTestId("locations-visibility-0").textContent?.trim(),
    ).toBe("Player-visible");
    const locToggle = screen.getByTestId("locations-visibility-toggle-0");
    await fireEvent.click(locToggle);
    expect(
      screen.getByTestId("locations-visibility-0").textContent?.trim(),
    ).toBe("GM-only");

    await waitFor(() => {
      const updatedHash = screen
        .getByTestId("adventure-package-hash")
        .textContent?.trim();
      expect(updatedHash).toMatch(/^[a-f0-9]{64}$/);
      expect(updatedHash).not.toBe(initialHash);
    });

    await fireEvent.click(screen.getByTestId("adventure-approve-button"));
    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledTimes(1);
    });
    const approved = onApprove.mock.calls[0][0] as AdventureJsonV1;
    expect(approved.locations[0]?.visibility).toBe("gm-only");
    expect(approved.secrets[0]?.visibility).toBe("gm-only");
  });

  it("AC4/AC5: locks editing controls after approval and deduplicates a re-approval of the same content in storage", async () => {
    const draft = createTestAdventureJson();
    const io = createMemoryIO();
    render(AdventureImportReview, {
      props: {
        draft,
        onApprove: async (approved) => {
          await saveApprovedAdventureJson(io, approved);
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
      (screen.getByTestId("locations-visibility-toggle-0") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId("adventure-approve-button") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByTestId("adventure-approved-confirmation")).toBeTruthy();

    const writesBefore = io.writeCalls;
    const deduplicated = await saveApprovedAdventureJson(io, draft);
    expect(deduplicated.status).toBe("deduplicated");
    expect(io.writeCalls).toBe(writesBefore);
  });

  it("AC6: invokes onCancel and writes zero files when Cancel is clicked", async () => {
    const draft = createTestAdventureJson();
    const io = createMemoryIO();
    const onCancel = vi.fn();
    render(AdventureImportReview, {
      props: {
        draft,
        onApprove: async (approved) => {
          await saveApprovedAdventureJson(io, approved);
        },
        onCancel,
      },
    });

    await fireEvent.click(screen.getByTestId("locations-visibility-toggle-0"));
    await fireEvent.click(screen.getByTestId("adventure-cancel-button"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(io.writeCalls).toBe(0);
    expect(io.files.size).toBe(0);
  });

  it("AC7: renders pre-approval AI/storage notice for Adventure JSON before the Approve button", () => {
    const draft = createTestAdventureJson();
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
    const noticeText = notice.textContent?.replace(/\s+/g, " ") ?? "";
    expect(noticeText).toContain("Adventure JSON file");
    expect(noticeText).toContain("validated locally with zero AI calls");
    expect(noticeText).toContain(
      "not currently included in Codex Cryptica Cloud Backup",
    );
    expect(noticeText).toContain("selected Oracle AI provider");
    expect(noticeText).toContain(
      "without claiming complete analysis, resolved ambiguities, or play readiness",
    );
    expect(
      Boolean(
        notice.compareDocumentPosition(approveButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it("AC8: renders validation error list in alert when Adventure JSON validation fails and writes zero files", async () => {
    const io = createMemoryIO();
    const result = validateAdventureJson({ formatVersion: "bad" });
    expect(result.ok).toBe(false);
    if (result.ok) return;

    render(AdventureEntryChoices, {
      props: {
        onDiscover: vi.fn(),
        onOwnPremise: vi.fn(),
        importError: "Adventure JSON validation failed.",
        importValidationErrors: result.errors,
      },
    });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("INVALID_FORMAT_VERSION");
    expect(io.writeCalls).toBe(0);
    expect(io.files.size).toBe(0);
  });

  it("shows the structural diff against a predecessor and hides it without one", async () => {
    const previous = createTestAdventureJson();
    const changed = createTestAdventureJson();
    changed.version = "1.1.0";
    changed.scenes = [
      {
        ...changed.scenes[0],
        summary: "Arrival at the jetty, revised.",
        conditions: ["Players arrive at midnight"],
      },
    ];
    changed.clues = [];
    render(AdventureImportReview, {
      props: {
        draft: changed,
        previousPackage: previous,
        previousHash: await computeAdventureJsonHash(previous),
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    const diff = screen.getByTestId("adventure-import-diff");
    expect(diff.textContent).toContain("the-mill-mystery");
    expect(diff.textContent).toContain("v1.0.0");
    expect(diff.textContent).toContain("Scene 1: The Ferry Landing");
    expect(diff.textContent).toContain("summary");
    expect(diff.textContent).toContain("conditions");
    expect(diff.textContent).toContain("Muddy bootprints");
    expect(
      screen.getByTestId("adventure-import-diff-unresolved").textContent,
    ).toContain("clue-prints");
    expect(
      screen.queryByTestId("adventure-import-diff-version-warning"),
    ).toBeNull();
  });

  it("shows when a scene reorder changes the entry scene", () => {
    const previous = createTestAdventureJson();
    previous.scenes = [
      {
        ...previous.scenes[0],
        branches: [
          { targetSceneId: "scene-next", description: "Enter the mill." },
        ],
      },
      {
        id: "scene-next",
        title: "Inside the Mill",
        summary: "The waterwheel is still.",
        branches: [
          {
            targetSceneId: "scene-landing",
            description: "Return outside.",
            optional: true,
          },
        ],
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ];
    const reordered = createTestAdventureJson();
    reordered.scenes = [...previous.scenes].reverse();

    render(AdventureImportReview, {
      props: {
        draft: reordered,
        previousPackage: previous,
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(
      screen.getByTestId("adventure-import-diff-entry-scene").textContent,
    ).toContain("scene-landing to scene-next");
    expect(screen.getByTestId("adventure-import-diff").textContent).toContain(
      "0 added, 0 removed, 1 changed.",
    );
  });

  it("warns when the version number did not increase and shows no diff without a predecessor", () => {
    const previous = createTestAdventureJson();
    const sameVersionChanged = createTestAdventureJson();
    sameVersionChanged.scenes = [
      {
        ...sameVersionChanged.scenes[0],
        summary: "Arrival at the jetty, rewritten.",
      },
    ];
    const { unmount } = render(AdventureImportReview, {
      props: {
        draft: sameVersionChanged,
        previousPackage: previous,
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    expect(
      screen.getByTestId("adventure-import-diff-version-warning").textContent,
    ).toContain("did not increase");
    unmount();

    render(AdventureImportReview, {
      props: {
        draft: createTestAdventureJson(),
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    expect(screen.queryByTestId("adventure-import-diff")).toBeNull();
  });

  it("displays sourceRef page citations (p. N / pp. N–M) on entities", () => {
    const draft = createTestAdventureJson();
    render(AdventureImportReview, {
      props: {
        draft,
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    const refs = screen
      .getAllByTestId("entity-source-ref")
      .map((el) => el.textContent?.trim());
    expect(refs).toContain("p. 1 · Scene 1: The Ferry Landing");
    expect(refs).toContain("pp. 2–4 · Scene 2: The Wheel Room");
    expect(refs).toContain("p. 3");
  });
});
