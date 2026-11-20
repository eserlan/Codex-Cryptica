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
    async listLimited(dir: string, limit: number) {
      const entries = await io.list(dir);
      return {
        entries: entries.slice(0, limit),
        truncated: entries.length > limit,
      };
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

  it("renders a compact above-the-fold review receipt with identity, hook, validation status, accurate collection counts, and collapsed disclosures by default (#5060)", async () => {
    const draft = createTestAdventureJson();
    draft.source.publisher = "Riverstone Press";
    draft.source.publishedDate = "2026-04-01";
    draft.source.url = "https://example.com/mill-mystery";
    draft.source.documentHash = "a".repeat(64);

    render(AdventureImportReview, {
      props: {
        draft,
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    // Above-the-fold identity & hook
    expect(
      screen.getByRole("heading", { level: 1, name: "The Mill Mystery" }),
    ).toBeTruthy();
    expect(
      screen.getByTestId("adventure-header-system").textContent?.trim(),
    ).toBe("System-agnostic");
    expect(
      screen.getByTestId("adventure-header-authors").textContent?.trim(),
    ).toBe("By A. Author");
    expect(
      screen.getByTestId("adventure-header-tone-genre").textContent?.trim(),
    ).toBe("tense · mystery");
    expect(
      screen.getByTestId("adventure-header-hook").textContent?.trim(),
    ).toBe("Maren asks the party to inspect the sluice gate.");

    // Validation status & exact counts derived from parsed package
    const validationStatus = screen.getByTestId("review-validation-status");
    expect(validationStatus.getAttribute("role")).toBe("status");
    expect(validationStatus.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Validated · 1 unresolved item",
    );
    expect(
      screen
        .getByTestId("review-import-total-count")
        .textContent?.replace(/\s+/g, " ")
        .trim(),
    ).toBe("8 imported records across 7 collections");

    expect(screen.getByTestId("review-count-locations").textContent).toContain(
      "2",
    );
    expect(screen.getByTestId("review-count-actors").textContent).toContain(
      "1",
    );
    expect(screen.getByTestId("review-count-scenes").textContent).toContain(
      "1",
    );
    expect(screen.getByTestId("review-count-encounters").textContent).toContain(
      "1",
    );
    expect(screen.getByTestId("review-count-clues").textContent).toContain("1");
    expect(screen.getByTestId("review-count-secrets").textContent).toContain(
      "1",
    );
    expect(screen.getByTestId("review-count-unresolved").textContent).toContain(
      "1",
    );

    // Zero-count optional collections are reported as 0
    const emptyLine = screen.getByTestId("review-empty-collections");
    expect(emptyLine.textContent).toContain("Factions (0)");
    expect(emptyLine.textContent).toContain("Rumours (0)");
    expect(emptyLine.textContent).toContain("Items (0)");
    expect(emptyLine.textContent).toContain("Endings (0)");

    // Source details disclosure is collapsed by default, but reachable on demand
    const sourceDetails = screen.getByTestId(
      "review-source-details",
    ) as HTMLDetailsElement;
    expect(sourceDetails.open).toBe(false);
    await fireEvent.click(screen.getByTestId("review-source-details-summary"));
    sourceDetails.open = true;
    expect(sourceDetails.open).toBe(true);
    expect(sourceDetails.textContent).toContain("Riverstone Press");
    expect(sourceDetails.textContent).toContain("CC0-1.0");
    expect(sourceDetails.textContent).toContain("a".repeat(64));

    // Detailed import sections default to collapsed while unresolved summary remains visible
    expect(screen.getByTestId("review-unresolved").textContent).toContain(
      "Unresolved (1)",
    );
    for (const disclosureId of [
      "review-locations-disclosure",
      "review-actors-disclosure",
      "review-scenes-disclosure",
      "review-encounters-disclosure",
      "review-clues-disclosure",
      "review-secrets-disclosure",
    ]) {
      const details = screen.getByTestId(disclosureId) as HTMLDetailsElement;
      expect(details.open).toBe(false);
    }
  });

  it("visually caps long hook, description, and background prose with keyboard-accessible Read more / Show less controls (#5060)", async () => {
    const draft = createTestAdventureJson();
    const longHook = `${"A signal flare arcs above the flooded transformer yard while the backup generator coughs black smoke. ".repeat(4)}Final hook sentence.`;
    const longDescription = `${"An industrial horror scenario aboard a decaying orbital power relay with eleven interconnected maintenance rooms. ".repeat(4)}Final description sentence.`;
    const longBackground = `${"Three shifts ago the coolant pumps seized and the night crew sealed the lower conduit bulkhead from the inside. ".repeat(4)}Final background sentence.`;

    draft.premise.hook = longHook;
    draft.description = longDescription;
    draft.premise.background = longBackground;

    render(AdventureImportReview, {
      props: {
        draft,
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    // Header hook is truncated initially
    const headerHook = screen.getByTestId("adventure-header-hook");
    expect(headerHook.textContent).not.toContain("Final hook sentence.");
    const headerToggle = screen.getByTestId("adventure-header-hook-toggle");
    expect(headerToggle.getAttribute("aria-expanded")).toBe("false");
    await fireEvent.click(headerToggle);
    expect(headerToggle.getAttribute("aria-expanded")).toBe("true");
    expect(headerHook.textContent).toContain("Final hook sentence.");
    await fireEvent.click(headerToggle);
    expect(headerToggle.getAttribute("aria-expanded")).toBe("false");

    // Premise and Source description, background, and hook toggles work independently
    const metaDesc = screen.getByTestId("review-metadata-description");
    expect(metaDesc.textContent).not.toContain("Final description sentence.");
    const descToggle = screen.getByTestId("review-description-read-more");
    await fireEvent.click(descToggle);
    expect(metaDesc.textContent).toContain("Final description sentence.");

    const metaBg = screen.getByTestId("review-metadata-background");
    expect(metaBg.textContent).not.toContain("Final background sentence.");
    const bgToggle = screen.getByTestId("review-background-read-more");
    await fireEvent.click(bgToggle);
    expect(metaBg.textContent).toContain("Final background sentence.");

    const metaHook = screen.getByTestId("review-metadata-hook");
    expect(metaHook.textContent).not.toContain("Final hook sentence.");
    const hookToggle = screen.getByTestId("review-hook-read-more");
    await fireEvent.click(hookToggle);
    expect(metaHook.textContent).toContain("Final hook sentence.");
  });

  it("announces validation failure in the import summary when draft checks fail and never implies validated (#5060)", () => {
    const invalidDraft = createTestAdventureJson();
    // Introduce an unresolved reference so validator fails
    invalidDraft.scenes = [
      {
        ...invalidDraft.scenes[0]!,
        locationId: "non-existent-location",
      },
    ];

    render(AdventureImportReview, {
      props: {
        draft: invalidDraft,
        onApprove: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    const status = screen.getByTestId("review-validation-status");
    expect(status.getAttribute("role")).toBe("alert");
    expect(status.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Validation failed (1 error)",
    );
    expect(status.textContent).not.toContain("Validated");

    const errorBox = screen.getByTestId("review-validation-errors");
    expect(errorBox.textContent).toContain("UNRESOLVED_REFERENCE");
    expect(errorBox.textContent).toContain("non-existent-location");
  });
});
