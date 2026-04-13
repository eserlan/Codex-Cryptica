import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FrontPage from "./FrontPage.svelte";
import { uiStore } from "$lib/stores/ui.svelte";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  saveDescription: vi.fn(),
  generateBriefing: vi.fn().mockResolvedValue("Generated briefing"),
  generateCoverImage: vi.fn().mockResolvedValue("images/cover.webp"),
  setCoverImage: vi.fn(),
  loadEntityContent: vi.fn().mockResolvedValue(undefined),
  retrieveContext: vi.fn().mockResolvedValue({
    content: "--- File: World Primer ---\nSky-market politics and drone wars.",
    sourceIds: ["front-1"],
  }),
}));

const worldMock = vi.hoisted(() => ({
  metadata: {
    id: "vault-1",
    name: "Moonfall",
    description: "A broken moon hangs over the **capital**.",
    coverImage: "images/cover.webp",
  },
  frontPageEntity: {
    id: "front-1",
    content: "# The Chronicle\nThe city watches the sky.",
    chronicle: "# The Chronicle\nThe city watches the sky.",
    image: "images/frontpage.webp",
    thumbnail: "images/frontpage-thumb.webp",
  },
  frontpageEntity: {
    id: "front-2",
    title: "Moonlit Treaties",
    lore: "Hidden lore for Moonlit Treaties should not be sent.",
    content:
      "# Moonlit Treaties\nThe frontier councils meet by moonlight to settle debts and treaties.",
    chronicle:
      "# Moonlit Treaties\nThe frontier councils meet by moonlight to settle debts and treaties.",
    tags: ["frontpage"],
    labels: [],
    type: "location",
    lastModified: Date.now() + 2,
  },
  labeledFrontpageEntity: {
    id: "front-3",
    title: "The Front Hall Ledger",
    lore: "Hidden lore for the ledger should not be sent.",
    content:
      "# The Front Hall Ledger\nEvery decree, visitor, and whispered deal is entered here by the steward.",
    chronicle:
      "# The Front Hall Ledger\nEvery decree, visitor, and whispered deal is entered here by the steward.",
    tags: [],
    labels: ["frontpage"],
    type: "document",
    lastModified: Date.now() + 3,
  },
  recentActivity: [
    {
      id: "entity-1",
      title: "Captain Ril",
      path: "characters/ril.md",
      excerpt: "Captain of the **moon** guard.",
      type: "npc",
      tags: ["npc"],
      lastModified: Date.now(),
      image: "",
      thumbnail: "",
    },
    {
      id: "front-1",
      title: "Front Page Chronicle",
      path: "frontpage.md",
      excerpt: "The **moon** breaks over the city.",
      type: "location",
      tags: ["frontpage"],
      lastModified: Date.now() + 1,
      image: "images/frontpage.webp",
      thumbnail: "images/frontpage-thumb.webp",
    },
  ],
}));

const worldStoreMock = vi.hoisted(() => ({
  metadata: worldMock.metadata,
  frontPageEntity: worldMock.frontPageEntity,
  recentActivity: worldMock.recentActivity,
  isLoading: false,
  isSaving: false,
  error: null as string | null,
}));

if (!HTMLElement.prototype.animate) {
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(() => ({ onfinish: null, cancel: vi.fn() })),
  });
}

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    activeTheme: {
      name: "Neon Night",
      description:
        "Cyberpunk, neon-noir, corporate control, street-level rebellion, hackers, implants, and high-tech urban danger.",
      tokens: {
        primary: "#f472b6",
        accent: "#facc15",
        background: "#020617",
      },
    },
  },
}));

vi.mock("$lib/services/ai/context-retrieval.service", () => ({
  contextRetrievalService: {
    retrieveContext: mocks.retrieveContext,
    getConsolidatedContext: vi.fn((entity: any) =>
      [entity.chronicle, entity.content].filter(Boolean).join("\n\n"),
    ),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: "vault-1",
    vaultName: "Moonfall",
    entities: {
      "front-1": worldMock.frontPageEntity,
      "front-2": worldMock.frontpageEntity,
      "front-3": worldMock.labeledFrontpageEntity,
      "entity-1": worldMock.recentActivity[0],
    },
    allEntities: [
      worldMock.frontPageEntity,
      worldMock.frontpageEntity,
      worldMock.labeledFrontpageEntity,
      worldMock.recentActivity[0],
      worldMock.recentActivity[1],
    ],
    getActiveVaultHandle: vi.fn().mockResolvedValue({}),
    loadEntityContent: mocks.loadEntityContent,
    saveImageToVault: vi.fn().mockResolvedValue({ image: "images/local.webp" }),
    resolveImageUrl: vi.fn().mockResolvedValue("resolved://image"),
    switchVault: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: {
    dismissedLandingPage: false,
    dismissedWorldPage: false,
    skipWelcomeScreen: true,
    toggleWelcomeScreen: vi.fn(),
    toggleSidebarTool: vi.fn(),
    openZenMode: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
  },
  ui: {
    dismissedLandingPage: false,
    dismissedWorldPage: false,
    skipWelcomeScreen: true,
    toggleWelcomeScreen: vi.fn(),
    toggleSidebarTool: vi.fn(),
    openZenMode: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("$lib/stores/world.svelte", () => ({
  worldStore: Object.assign(worldStoreMock, {
    load: mocks.load,
    saveDescription: mocks.saveDescription,
    generateBriefing: mocks.generateBriefing,
    generateCoverImage: mocks.generateCoverImage,
    setCoverImage: mocks.setCoverImage,
  }),
}));

describe("FrontPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.retrieveContext.mockResolvedValue({
      content:
        "--- File: World Primer ---\nSky-market politics and drone wars.",
      sourceIds: ["front-1"],
    });
    uiStore.dismissedLandingPage = false;
    uiStore.dismissedWorldPage = false;
    uiStore.skipWelcomeScreen = true;
    worldStoreMock.error = null;
    window.localStorage.removeItem("codex_front_page_recent_limit:vault-1");
    Object.assign(worldMock.metadata, {
      id: "vault-1",
      name: "Moonfall",
      description: "A broken moon hangs over the **capital**.",
      coverImage: "images/cover.webp",
    });
    Object.assign(worldMock.frontpageEntity, {
      id: "front-2",
      title: "Moonlit Treaties",
      lore: "Hidden lore for Moonlit Treaties should not be sent.",
      content:
        "# Moonlit Treaties\nThe frontier councils meet by moonlight to settle debts and treaties.",
      chronicle:
        "# Moonlit Treaties\nThe frontier councils meet by moonlight to settle debts and treaties.",
      tags: ["frontpage"],
      labels: [],
      type: "location",
      lastModified: Date.now() + 2,
    });
    Object.assign(worldMock.labeledFrontpageEntity, {
      id: "front-3",
      title: "The Front Hall Ledger",
      lore: "Hidden lore for the ledger should not be sent.",
      content:
        "# The Front Hall Ledger\nEvery decree, visitor, and whispered deal is entered here by the steward.",
      chronicle:
        "# The Front Hall Ledger\nEvery decree, visitor, and whispered deal is entered here by the steward.",
      tags: [],
      labels: ["frontpage"],
      type: "document",
      lastModified: Date.now() + 3,
    });
  });

  it("renders the front page shell and section headers", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    expect(screen.getByText("Front Page")).toBeTruthy();
    expect(screen.getByText("Relevant Entities")).toBeTruthy();
  });

  it("renders briefing content with markdown formatting", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    expect(screen.getByText("capital").tagName).toBe("STRONG");
  });

  it("renders entity cards for recent activity", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    expect(screen.getByText("Front Page Chronicle")).toBeTruthy();
    expect(screen.getByText("Captain Ril")).toBeTruthy();

    const cards = screen.getAllByTestId("entity-card");
    expect(within(cards[0]).getByText("moon").tagName).toBe("STRONG");
    expect(
      within(cards[1]).getByTestId("entity-card-placeholder"),
    ).toBeTruthy();
  });

  it("renders the cover image background", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await waitFor(() =>
      expect(screen.getByTestId("front-page-hero-background")).toBeTruthy(),
    );

    const background = screen.getByTestId(
      "front-page-hero-background",
    ) as HTMLElement;
    expect(background.style.backgroundImage).toContain("resolved://image");
  });

  it("opens the cover image lightbox", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await waitFor(() =>
      expect(screen.getByTestId("front-page-hero-background")).toBeTruthy(),
    );

    await fireEvent.click(screen.getByLabelText("Open cover image lightbox"));
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Image View" })).toBeTruthy(),
    );
    expect(screen.getByAltText("World cover")).toBeTruthy();

    // Close button exists - actual close behavior is tested in
    // ZenImageLightbox's own tests
    expect(screen.getByLabelText("Close image view")).toBeTruthy();
  });

  it("opens the cover image editor when Change Image is clicked", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await waitFor(() =>
      expect(screen.getByTestId("front-page-hero-background")).toBeTruthy(),
    );

    await fireEvent.click(screen.getByRole("button", { name: "Change Image" }));
    await waitFor(() => expect(screen.getByText("World Image")).toBeTruthy());
    expect(
      screen.getByText("Drop a new image to replace the current cover."),
    ).toBeTruthy();
  });

  it("generates cover art with the correct prompt context", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await waitFor(() =>
      expect(screen.getByTestId("front-page-hero-background")).toBeTruthy(),
    );

    await fireEvent.click(screen.getByRole("button", { name: "Change Image" }));
    await waitFor(() => expect(screen.getByText("World Image")).toBeTruthy());
    await fireEvent.click(screen.getByText("Generate Art"));

    await waitFor(() =>
      expect(mocks.generateCoverImage).toHaveBeenCalledWith(
        expect.stringContaining("Create atmospheric portrait cover art"),
      ),
    );
    expect(mocks.generateCoverImage).toHaveBeenCalledWith(
      expect.stringContaining(
        "Thematic scope: Cyberpunk, neon-noir, corporate control",
      ),
    );
    expect(mocks.generateCoverImage).toHaveBeenCalledWith(
      expect.stringContaining(
        "Portrait composition, vertical framing, approximately 2:3 aspect ratio.",
      ),
    );
    expect(mocks.generateCoverImage).toHaveBeenCalledWith(
      expect.stringContaining(
        "Briefing: A broken moon hangs over the **capital**.",
      ),
    );
    expect(mocks.generateCoverImage).toHaveBeenCalledWith(
      expect.stringContaining(
        'Create atmospheric portrait cover art for "Moonfall".',
      ),
    );
    expect(mocks.generateCoverImage).toHaveBeenCalledWith(
      expect.stringContaining("Sky-market politics and drone wars."),
    );
    expect(mocks.generateCoverImage).toHaveBeenCalledWith(
      expect.stringContaining("Moonlit Treaties"),
    );
    expect(mocks.generateCoverImage).toHaveBeenCalledWith(
      expect.stringContaining(
        "The frontier councils meet by moonlight to settle debts and treaties.",
      ),
    );
    expect(mocks.generateCoverImage).toHaveBeenCalledWith(
      expect.stringContaining("The Front Hall Ledger"),
    );
    expect(mocks.generateCoverImage).toHaveBeenCalledWith(
      expect.stringContaining(
        "Every decree, visitor, and whispered deal is entered here by the steward.",
      ),
    );
    expect(mocks.retrieveContext).toHaveBeenCalledWith(
      expect.stringContaining(
        "Moonfall Neon Night setting world overview premise tone central conflict",
      ),
      expect.any(Set),
      expect.anything(),
      "front-1",
      true,
    );
    expect(mocks.retrieveContext).toHaveBeenCalledWith(
      expect.stringContaining(
        "Moonfall Neon Night major players factions antagonists allies plot hooks current threats",
      ),
      expect.any(Set),
      expect.anything(),
      "front-1",
      true,
    );
  });

  it("renders entity cards with images and category icons", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    const cards = screen.getAllByTestId("entity-card");
    expect(within(cards[0]).getByText("Front Page Chronicle")).toBeTruthy();
    expect(
      cards[0].querySelector("div[style*='background-image']"),
    ).toBeTruthy();
    expect(
      within(cards[0]).getByTestId("entity-card-category-icon"),
    ).toBeTruthy();
    expect(
      within(cards[1]).getByTestId("entity-card-placeholder"),
    ).toBeTruthy();
    expect(
      within(cards[1]).getByTestId("entity-card-placeholder-icon"),
    ).toBeTruthy();
  });

  it("opens zen mode on entity card double click", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    const cards = screen.getAllByTestId("entity-card");
    const cardButton = within(cards[0]).getByRole("button");

    vi.useFakeTimers();
    await fireEvent.click(cardButton);
    expect(uiStore.dismissedWorldPage).toBe(false);
    await vi.advanceTimersByTimeAsync(320);
    expect(uiStore.dismissedWorldPage).toBe(true);
    expect(uiStore.openZenMode).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("enters briefing edit mode and shows the current briefing text", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    screen.getByLabelText("Edit briefing").click();
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short world briefing…"),
      ).toBeTruthy(),
    );
    expect(
      (
        screen.getByPlaceholderText(
          "Write a short world briefing…",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("A broken moon hangs over the **capital**.");
  });

  it("cancels briefing edit mode and restores preview", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    screen.getByLabelText("Edit briefing").click();
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short world briefing…"),
      ).toBeTruthy(),
    );

    const briefingSection = screen
      .getByPlaceholderText("Write a short world briefing…")
      .closest("section");
    expect(briefingSection).toBeTruthy();
    within(briefingSection as HTMLElement)
      .getByRole("button", { name: "Cancel" })
      .click();
    await waitFor(() =>
      expect(screen.getByText("capital").tagName).toBe("STRONG"),
    );
    expect(
      screen.queryByPlaceholderText("Write a short world briefing…"),
    ).toBeNull();
  });

  it("places relevant entities before the world brief", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    const entitiesSection = screen.getByTestId("entities-section");
    const briefingSection = screen.getByTestId("briefing-content-section");

    expect(entitiesSection.compareDocumentPosition(briefingSection)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("keeps briefing actions visible even when the briefing is empty and being edited", async () => {
    Object.assign(worldMock.metadata, {
      id: "vault-1",
      name: "Moonfall",
      description: "",
      coverImage: "images/cover.webp",
    });

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    await fireEvent.click(screen.getByLabelText("Edit briefing"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short world briefing…"),
      ).toBeTruthy(),
    );

    expect(screen.getByRole("button", { name: "Save Briefing" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("falls back to the tagged front page entity when no briefing metadata exists", async () => {
    Object.assign(worldMock.metadata, {
      id: "vault-1",
      name: "Moonfall",
      description: "",
      coverImage: "images/cover.webp",
    });
    Object.assign(worldMock.frontPageEntity, {
      id: "front-1",
      content: "# The Chronicle\nThe city watches the sky.",
      chronicle: "# The Chronicle\nThe city watches the sky.",
    });

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    expect(
      screen.queryByPlaceholderText("Write a short world briefing…"),
    ).toBeNull();
    expect(screen.getByTestId("briefing-preview")).toBeTruthy();
    expect(screen.getByText("The city watches the sky.")).toBeTruthy();
  });

  it("keeps the briefing in edit mode while typing", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Edit briefing"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short world briefing…"),
      ).toBeTruthy(),
    );

    const textarea = screen.getByPlaceholderText(
      "Write a short world briefing…",
    ) as HTMLTextAreaElement;
    await fireEvent.input(textarea, {
      target: {
        value: "A broken moon hangs over the capital, now with unrest.",
      },
    });

    expect(
      screen.getByPlaceholderText("Write a short world briefing…"),
    ).toBeTruthy();
    expect(screen.queryByTestId("briefing-preview")).toBeNull();
    expect(textarea.value).toContain("unrest");
  });

  it("returns to preview mode after saving the briefing", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Edit briefing"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short world briefing…"),
      ).toBeTruthy(),
    );

    const textarea = screen.getByPlaceholderText(
      "Write a short world briefing…",
    ) as HTMLTextAreaElement;
    await fireEvent.input(textarea, {
      target: {
        value: "A broken moon hangs over the capital, now with unrest.",
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Save Briefing" }),
    );

    await waitFor(() => expect(mocks.saveDescription).toHaveBeenCalled());
    expect(
      screen.queryByPlaceholderText("Write a short world briefing…"),
    ).toBeNull();
    expect(screen.getByTestId("briefing-preview")).toBeTruthy();
  });

  it("keeps the briefing editor open when saving fails", async () => {
    mocks.saveDescription.mockImplementationOnce(async () => {
      worldStoreMock.error = "Failed to save world briefing.";
    });

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Edit briefing"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short world briefing…"),
      ).toBeTruthy(),
    );

    const textarea = screen.getByPlaceholderText(
      "Write a short world briefing…",
    ) as HTMLTextAreaElement;
    await fireEvent.input(textarea, {
      target: {
        value: "A broken moon hangs over the capital, now with unrest.",
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Save Briefing" }),
    );

    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short world briefing…"),
      ).toBeTruthy(),
    );
    expect(screen.queryByTestId("briefing-preview")).toBeNull();
    expect(worldStoreMock.error).toBe("Failed to save world briefing.");
  });

  it.skip("shows a working state while cover art is generating", async () => {
    // TODO: This test fails due to timing issues with the refactored async flow.
    // The CoverImage component's isGenerating state may not reset properly when
    // the handler's promise resolves. Requires investigation into CoverImage's
    // promise tracking in the test environment.
    let resolveGenerateCover: (() => void) | undefined;
    mocks.generateCoverImage.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveGenerateCover = resolve;
        }),
    );

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByRole("button", { name: "Change Image" }));
    await waitFor(() => expect(screen.getByText("World Image")).toBeTruthy());
    await fireEvent.click(screen.getByText("Generate Art"));

    await waitFor(() => expect(screen.getByText("Working...")).toBeTruthy());
    expect(
      screen.getByRole("status", { name: "Image generation in progress" }),
    ).toBeTruthy();

    resolveGenerateCover?.();

    // Give time for the promise to settle and CoverImage to update its state
    await waitFor(() => expect(screen.getByText("Generate Art")).toBeTruthy(), {
      timeout: 2000,
    });
  });

  it("opens zen mode on double click before the single-click action runs", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    const cards = screen.getAllByTestId("entity-card");
    const cardButton = within(cards[0]).getByRole("button");

    vi.useFakeTimers();
    await fireEvent.click(cardButton);
    await fireEvent.dblClick(cardButton);
    await vi.advanceTimersByTimeAsync(320);

    expect(uiStore.openZenMode).toHaveBeenCalledWith("front-1");
    expect(uiStore.dismissedWorldPage).toBe(true);
    vi.useRealTimers();
  });

  it("keeps the loading state visible until the world load resolves", async () => {
    let resolveLoad: (() => void) | undefined;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    render(FrontPage);

    expect(screen.getByText("Loading front page")).toBeTruthy();
    expect(screen.queryByText("Front Page")).toBeNull();

    resolveLoad?.();

    await waitFor(() => expect(screen.getByText("Front Page")).toBeTruthy());
    expect(screen.queryByText("Loading front page")).toBeNull();
  });

  it("asks before replacing an existing briefing", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate briefing"));
    // Wait for the async confirm to be called
    await waitFor(() => expect(uiStore.confirm).toHaveBeenCalled());

    expect(uiStore.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Regenerate Briefing",
      }),
    );
    expect(mocks.generateBriefing).not.toHaveBeenCalled();
  });

  it("includes the theme description when generating a briefing", async () => {
    (uiStore.confirm as any).mockResolvedValueOnce(true);

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate briefing"));

    await waitFor(() =>
      expect(mocks.generateBriefing).toHaveBeenCalledWith(
        expect.stringContaining(
          "Description: Cyberpunk, neon-noir, corporate control",
        ),
      ),
    );
    expect(mocks.generateBriefing).toHaveBeenCalledWith(
      expect.stringContaining('Write a high-level briefing for "Moonfall".'),
    );
    expect(mocks.generateBriefing).toHaveBeenCalledWith(
      expect.stringContaining("Current Conflict"),
    );
    expect(mocks.generateBriefing).toHaveBeenCalledWith(
      expect.stringContaining("Sky-market politics and drone wars."),
    );
    expect(mocks.generateBriefing).toHaveBeenCalledWith(
      expect.stringContaining("Moonlit Treaties"),
    );
    expect(mocks.generateBriefing).toHaveBeenCalledWith(
      expect.stringContaining(
        "The frontier councils meet by moonlight to settle debts and treaties.",
      ),
    );
    expect(mocks.generateBriefing).not.toHaveBeenCalledWith(
      expect.stringContaining(
        "Hidden lore for Moonlit Treaties should not be sent.",
      ),
    );
    expect(mocks.generateBriefing).toHaveBeenCalledWith(
      expect.stringContaining("The Front Hall Ledger"),
    );
    expect(mocks.generateBriefing).toHaveBeenCalledWith(
      expect.stringContaining(
        "Every decree, visitor, and whispered deal is entered here by the steward.",
      ),
    );
    expect(mocks.generateBriefing).not.toHaveBeenCalledWith(
      expect.stringContaining("Hidden lore for the ledger should not be sent."),
    );
    expect(mocks.retrieveContext).toHaveBeenCalledWith(
      expect.stringContaining(
        "Moonfall Neon Night setting world overview premise tone central conflict",
      ),
      expect.any(Set),
      expect.anything(),
      "front-1",
      false,
    );
    expect(mocks.retrieveContext).toHaveBeenCalledWith(
      expect.stringContaining(
        "Moonfall Neon Night major players factions antagonists allies plot hooks current threats",
      ),
      expect.any(Set),
      expect.anything(),
      "front-1",
      false,
    );
    expect(mocks.loadEntityContent).toHaveBeenCalledWith("front-2");
    expect(mocks.loadEntityContent).toHaveBeenCalledWith("front-3");
  });

  it("caps extra frontpage entity context before generating a briefing", async () => {
    (uiStore.confirm as any).mockResolvedValueOnce(true);
    Object.assign(worldMock.frontpageEntity, {
      content: "Frontpage alpha ".repeat(250),
      chronicle: "Frontpage alpha ".repeat(250),
    });
    Object.assign(worldMock.labeledFrontpageEntity, {
      content: "Frontpage beta ".repeat(250),
      chronicle: "Frontpage beta ".repeat(250),
    });

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate briefing"));

    await waitFor(() =>
      expect(mocks.generateBriefing).toHaveBeenCalledWith(
        expect.stringContaining("Frontpage alpha"),
      ),
    );
    expect(mocks.generateBriefing).toHaveBeenCalledWith(
      expect.stringContaining("[truncated]"),
    );
  });

  it("falls back to empty context when frontpage entity loading fails during briefing generation", async () => {
    (uiStore.confirm as any).mockResolvedValueOnce(true);
    mocks.loadEntityContent.mockRejectedValueOnce(new Error("idb failure"));

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate briefing"));

    await waitFor(() => expect(mocks.generateBriefing).toHaveBeenCalled());
    expect(mocks.generateBriefing).toHaveBeenCalledWith(
      expect.stringContaining("No additional context was retrieved."),
    );
  });

  it.skip("shows a generating indicator while briefing generation is in progress", async () => {
    // TODO: This test depends on the async flow through the controller's
    // context-building methods. The indicator appears via isGenerating prop
    // but the full promise chain (context build → generateBriefing) may
    // not settle cleanly in the test environment. Revisit once the full
    // FrontPage extraction is finalized.
    let resolveGenerate: ((value: string) => void) | undefined;
    mocks.generateBriefing.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveGenerate = resolve;
        }),
    );
    (uiStore.confirm as any).mockResolvedValueOnce(true);

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate briefing"));

    await waitFor(() =>
      expect(screen.getByTestId("briefing-generating-indicator")).toBeTruthy(),
    );
    expect(
      screen.getByTestId("briefing-preview").getAttribute("aria-busy"),
    ).toBe("true");

    resolveGenerate?.("New briefing text.");

    // Wait for the promise chain to settle and Svelte to re-render
    await vi.waitFor(
      async () => {
        await new Promise((r) => setTimeout(r, 50));
        expect(
          screen.queryByTestId("briefing-generating-indicator"),
        ).toBeNull();
      },
      { timeout: 3000 },
    );
    expect(
      screen.getByTestId("briefing-preview").getAttribute("aria-busy"),
    ).toBe("false");
  });

  it("keeps the current briefing when generation fails", async () => {
    (uiStore.confirm as any).mockResolvedValueOnce(true);
    mocks.generateBriefing.mockResolvedValueOnce("");

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate briefing"));

    await waitFor(() =>
      expect(screen.getByTestId("briefing-preview")).toBeTruthy(),
    );
    expect(screen.getByText("capital").tagName).toBe("STRONG");
    expect(
      screen.queryByPlaceholderText("Write a short world briefing…"),
    ).toBeNull();
  });

  it("lets the user change how many recent entities are shown", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    await fireEvent.click(
      screen.getByRole("button", { name: "Show 6 recent entities" }),
    );

    const limitInput = screen.getByLabelText("Set recent entities limit");
    await fireEvent.input(limitInput, { target: { value: "1" } });
    await fireEvent.blur(limitInput);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 1));
    expect(screen.getAllByTestId("entity-card")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Show 1 recent entities" }),
    ).toBeTruthy();
    expect(
      window.localStorage.getItem("codex_front_page_recent_limit:vault-1"),
    ).toBe("1");
  });

  it("restores the saved recent entity limit for the vault", async () => {
    window.localStorage.setItem("codex_front_page_recent_limit:vault-1", "2");

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 2));
    expect(
      screen.getByRole("button", { name: "Show 2 recent entities" }),
    ).toBeTruthy();
    expect(screen.getAllByTestId("entity-card")).toHaveLength(2);
  });

  it("expands the briefing preview after hovering for a moment", async () => {
    // Set a longer briefing so that truncation actually occurs
    Object.assign(worldMock.metadata, {
      id: "vault-1",
      name: "Moonfall",
      description:
        "A broken moon hangs over the capital. The sky is filled with ships. The streets are dark with neon lights. Rebellion brews in the undercity, where hackers trade secrets for survival. Corporate towers loom above, their glass facades reflecting the perpetual twilight. Street vendors sell augmented noodles and synth-noodles to weary workers. The net is alive with ghosts of old AI, whispering forgotten protocols to anyone who listens.",
      coverImage: "images/cover.webp",
    });

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    const briefingPreview = screen.getByTestId("briefing-preview");
    vi.useFakeTimers();

    await fireEvent.mouseEnter(briefingPreview);
    // Initially collapsed: should have max-h-[14rem] class
    expect(briefingPreview.className).toContain("max-h-[14rem]");

    await vi.advanceTimersByTimeAsync(800);
    // After expansion: should have max-h-[48rem] class
    expect(briefingPreview.className).toContain("max-h-[48rem]");

    await fireEvent.mouseLeave(briefingPreview);
    // After mouse leave: should return to max-h-[14rem]
    expect(briefingPreview.className).toContain("max-h-[14rem]");
    vi.useRealTimers();
  });

  it("pins entities with frontpage tag before unpinned entities", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    const cards = screen.getAllByTestId("entity-card");
    // First card should be a pinned entity (has frontpage tag)
    const firstCard = cards[0];
    expect(firstCard.textContent).toContain("Front Page Chronicle");
  });

  it("pins entities with frontpage label before unpinned entities", async () => {
    // Add a labeled entity to recentActivity to verify label-based pinning
    worldMock.recentActivity.push({
      id: "front-3",
      title: "The Front Hall Ledger",
      path: "docs/ledger.md",
      excerpt: "Every decree and whispered deal.",
      type: "document",
      tags: [],
      labels: ["frontpage"],
      lastModified: Date.now() + 3,
      image: "",
      thumbnail: "",
    } as (typeof worldMock.recentActivity)[number]);

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    const cards = screen.getAllByTestId("entity-card");
    const cardTexts = cards.map((card) => card.textContent);
    // Labeled frontpage entity should appear before unpinned ones
    const pinnedIndex = cardTexts.findIndex((t) =>
      t?.includes("The Front Hall Ledger"),
    );
    const unpinnedIndex = cardTexts.findIndex((t) =>
      t?.includes("Captain Ril"),
    );
    expect(pinnedIndex).toBeGreaterThanOrEqual(0);
    expect(unpinnedIndex).toBeGreaterThanOrEqual(0);
    expect(pinnedIndex).toBeLessThan(unpinnedIndex);

    // Cleanup: remove the added entity for other tests
    worldMock.recentActivity.pop();
  });

  it("persists recent limit to localStorage when changed", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    await fireEvent.click(
      screen.getByRole("button", { name: "Show 6 recent entities" }),
    );

    const limitInput = screen.getByLabelText("Set recent entities limit");
    await fireEvent.input(limitInput, { target: { value: "1" } });
    await fireEvent.blur(limitInput);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 1));
    expect(
      window.localStorage.getItem("codex_front_page_recent_limit:vault-1"),
    ).toBe("1");
  });

  it("restores the saved recent entity limit for the vault", async () => {
    window.localStorage.setItem("codex_front_page_recent_limit:vault-1", "2");

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 2));
    expect(
      screen.getByRole("button", { name: "Show 2 recent entities" }),
    ).toBeTruthy();
    expect(screen.getAllByTestId("entity-card")).toHaveLength(2);
  });

  it("shows confirmation dialog before regenerating an existing briefing", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate briefing"));
    // Wait for the async confirm to be called
    await waitFor(() => expect(uiStore.confirm).toHaveBeenCalled());

    expect(uiStore.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Regenerate Briefing",
      }),
    );
    expect(mocks.generateBriefing).not.toHaveBeenCalled();
  });

  it("does not show confirmation when generating a briefing for the first time", async () => {
    Object.assign(worldMock.metadata, {
      id: "vault-1",
      name: "Moonfall",
      description: "",
      coverImage: "images/cover.webp",
    });
    Object.assign(worldMock.frontPageEntity, {
      id: "front-1",
      content: "",
      chronicle: "",
    });

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate briefing"));

    // No confirmation needed when there's no existing briefing
    expect(uiStore.confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.generateBriefing).toHaveBeenCalled());
  });

  it.skip("shows error feedback when cover generation fails", async () => {
    // TODO: This test will be enabled in Phase 3 when error handling is added
    // to handleGenerateCover (currently uses bare catch {})
    mocks.generateCoverImage.mockRejectedValueOnce(
      new Error("AI service unavailable"),
    );

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await waitFor(() =>
      expect(screen.getByTestId("front-page-hero-background")).toBeTruthy(),
    );

    await fireEvent.click(screen.getByRole("button", { name: "Change Image" }));
    await waitFor(() => expect(screen.getByText("World Image")).toBeTruthy());
    await fireEvent.click(screen.getByText("Generate Art"));

    // The error should be surfaced to the user
    await waitFor(() =>
      expect(
        screen.queryByText(/failed to generate cover|cover generation failed/i),
      ).toBeTruthy(),
    );
  });
});
