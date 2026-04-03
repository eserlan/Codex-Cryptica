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
  generateDescription: vi.fn().mockResolvedValue("Generated summary"),
  generateCoverImage: vi.fn().mockResolvedValue("images/cover.webp"),
  setCoverImage: vi.fn(),
  retrieveContext: vi.fn().mockResolvedValue({
    content: "--- File: World Primer ---\nSky-market politics and drone wars.",
    sourceIds: ["front-1"],
  }),
}));

const campaignMock = vi.hoisted(() => ({
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

const campaignStoreMock = vi.hoisted(() => ({
  metadata: campaignMock.metadata,
  frontPageEntity: campaignMock.frontPageEntity,
  recentActivity: campaignMock.recentActivity,
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
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: "vault-1",
    vaultName: "Moonfall",
    getActiveVaultHandle: vi.fn().mockResolvedValue({}),
    saveImageToVault: vi.fn().mockResolvedValue({ image: "images/local.webp" }),
    resolveImageUrl: vi.fn().mockResolvedValue("resolved://image"),
    switchVault: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: {
    dismissedLandingPage: false,
    dismissedCampaignPage: false,
    toggleWelcomeScreen: vi.fn(),
    toggleSidebarTool: vi.fn(),
    openZenMode: vi.fn(),
  },
  ui: {
    dismissedLandingPage: false,
    dismissedCampaignPage: false,
    toggleWelcomeScreen: vi.fn(),
    toggleSidebarTool: vi.fn(),
    openZenMode: vi.fn(),
  },
}));

vi.mock("$lib/stores/campaign.svelte", () => ({
  campaignStore: Object.assign(campaignStoreMock, {
    load: mocks.load,
    saveDescription: mocks.saveDescription,
    generateDescription: mocks.generateDescription,
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
    uiStore.dismissedCampaignPage = false;
    campaignStoreMock.error = null;
    window.localStorage.removeItem("codex_front_page_recent_limit:vault-1");
    Object.assign(campaignMock.metadata, {
      id: "vault-1",
      name: "Moonfall",
      description: "A broken moon hangs over the **capital**.",
      coverImage: "images/cover.webp",
    });
  });

  it("renders campaign metadata, content, and cards", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    expect(screen.getByText("Front Page")).toBeTruthy();
    expect(screen.getByText("Relevant Entities")).toBeTruthy();
    expect(screen.getByText("capital").tagName).toBe("STRONG");
    expect(screen.getByText("Front Page Chronicle")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId("front-page-hero-background")).toBeTruthy(),
    );
    await fireEvent.click(screen.getByLabelText("Open cover image lightbox"));
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Image View" })).toBeTruthy(),
    );
    expect(screen.getByAltText("Campaign cover")).toBeTruthy();
    await fireEvent.click(screen.getByLabelText("Close image view"));
    expect(
      (screen.getByTestId("front-page-hero-background") as HTMLElement).style
        .backgroundImage,
    ).toContain("resolved://image");
    await fireEvent.click(screen.getByRole("button", { name: "Change Image" }));
    await waitFor(() =>
      expect(screen.getByText("Campaign Image")).toBeTruthy(),
    );
    expect(
      screen.getByText("Drop a new image to replace the current cover."),
    ).toBeTruthy();
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
        "Summary: A broken moon hangs over the **capital**.",
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
    expect(mocks.retrieveContext).toHaveBeenCalledWith(
      expect.stringContaining(
        "Moonfall Neon Night setting world campaign overview premise tone central conflict",
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
    expect(within(cards[0]).getByText("moon").tagName).toBe("STRONG");
    const cardButton = within(cards[0]).getByRole("button");
    vi.useFakeTimers();
    await fireEvent.click(cardButton);
    expect(uiStore.dismissedCampaignPage).toBe(false);
    await vi.advanceTimersByTimeAsync(320);
    expect(uiStore.dismissedCampaignPage).toBe(true);
    expect(uiStore.openZenMode).not.toHaveBeenCalled();
    vi.useRealTimers();
    screen.getByLabelText("Edit summary").click();
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short campaign summary..."),
      ).toBeTruthy(),
    );
    expect(
      (
        screen.getByPlaceholderText(
          "Write a short campaign summary...",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("A broken moon hangs over the **capital**.");
    const summarySection = screen
      .getByPlaceholderText("Write a short campaign summary...")
      .closest("section");
    expect(summarySection).toBeTruthy();
    within(summarySection as HTMLElement)
      .getByRole("button", { name: "Cancel" })
      .click();
    await waitFor(() =>
      expect(screen.getByText("capital").tagName).toBe("STRONG"),
    );
    expect(
      screen.queryByPlaceholderText("Write a short campaign summary..."),
    ).toBeNull();
    expect(screen.getByText("Captain Ril")).toBeTruthy();
  });

  it("places relevant entities before the world brief", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    const entitiesSection = screen.getByTestId("entities-section");
    const summarySection = screen.getByTestId("summary-section");

    expect(entitiesSection.compareDocumentPosition(summarySection)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("keeps summary actions visible even when the summary is empty and being edited", async () => {
    Object.assign(campaignMock.metadata, {
      id: "vault-1",
      name: "Moonfall",
      description: "",
      coverImage: "images/cover.webp",
    });

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    await fireEvent.click(screen.getByLabelText("Edit summary"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short campaign summary..."),
      ).toBeTruthy(),
    );

    expect(screen.getByRole("button", { name: "Save Summary" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("falls back to the tagged front page entity when no summary metadata exists", async () => {
    Object.assign(campaignMock.metadata, {
      id: "vault-1",
      name: "Moonfall",
      description: "",
      coverImage: "images/cover.webp",
    });
    Object.assign(campaignMock.frontPageEntity, {
      id: "front-1",
      content: "# The Chronicle\nThe city watches the sky.",
      chronicle: "# The Chronicle\nThe city watches the sky.",
    });

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    expect(
      screen.queryByPlaceholderText("Write a short campaign summary..."),
    ).toBeNull();
    expect(screen.getByTestId("summary-preview")).toBeTruthy();
    expect(screen.getByText("The city watches the sky.")).toBeTruthy();
  });

  it("keeps the summary in edit mode while typing", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Edit summary"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short campaign summary..."),
      ).toBeTruthy(),
    );

    const textarea = screen.getByPlaceholderText(
      "Write a short campaign summary...",
    ) as HTMLTextAreaElement;
    await fireEvent.input(textarea, {
      target: {
        value: "A broken moon hangs over the capital, now with unrest.",
      },
    });

    expect(
      screen.getByPlaceholderText("Write a short campaign summary..."),
    ).toBeTruthy();
    expect(screen.queryByTestId("summary-preview")).toBeNull();
    expect(textarea.value).toContain("unrest");
  });

  it("returns to preview mode after saving the summary", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Edit summary"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short campaign summary..."),
      ).toBeTruthy(),
    );

    const textarea = screen.getByPlaceholderText(
      "Write a short campaign summary...",
    ) as HTMLTextAreaElement;
    await fireEvent.input(textarea, {
      target: {
        value: "A broken moon hangs over the capital, now with unrest.",
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: "Save Summary" }));

    await waitFor(() => expect(mocks.saveDescription).toHaveBeenCalled());
    expect(
      screen.queryByPlaceholderText("Write a short campaign summary..."),
    ).toBeNull();
    expect(screen.getByTestId("summary-preview")).toBeTruthy();
  });

  it("keeps the summary editor open when saving fails", async () => {
    mocks.saveDescription.mockImplementationOnce(async () => {
      campaignStoreMock.error = "Failed to save campaign summary.";
    });

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Edit summary"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short campaign summary..."),
      ).toBeTruthy(),
    );

    const textarea = screen.getByPlaceholderText(
      "Write a short campaign summary...",
    ) as HTMLTextAreaElement;
    await fireEvent.input(textarea, {
      target: {
        value: "A broken moon hangs over the capital, now with unrest.",
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: "Save Summary" }));

    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Write a short campaign summary..."),
      ).toBeTruthy(),
    );
    expect(screen.queryByTestId("summary-preview")).toBeNull();
    expect(campaignStoreMock.error).toBe("Failed to save campaign summary.");
  });

  it("shows a working state while cover art is generating", async () => {
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
    await waitFor(() =>
      expect(screen.getByText("Campaign Image")).toBeTruthy(),
    );
    await fireEvent.click(screen.getByText("Generate Art"));

    await waitFor(() => expect(screen.getByText("Working...")).toBeTruthy());
    expect(
      screen.getByRole("status", { name: "Image generation in progress" }),
    ).toBeTruthy();

    resolveGenerateCover?.();

    await waitFor(() => expect(screen.getByText("Generate Art")).toBeTruthy());
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
    expect(uiStore.dismissedCampaignPage).toBe(true);
    vi.useRealTimers();
  });

  it("keeps the loading state visible until the campaign load resolves", async () => {
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

  it("asks before replacing an existing summary", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate summary"));

    expect(window.confirm).toHaveBeenCalledWith(
      "Generate a new summary and replace the existing one?",
    );
    expect(mocks.generateDescription).not.toHaveBeenCalled();
  });

  it("includes the theme description when generating a summary", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate summary"));

    await waitFor(() =>
      expect(mocks.generateDescription).toHaveBeenCalledWith(
        expect.stringContaining(
          "Description: Cyberpunk, neon-noir, corporate control",
        ),
      ),
    );
    expect(mocks.generateDescription).toHaveBeenCalledWith(
      expect.stringContaining(
        'Write a front-page campaign summary for "Moonfall".',
      ),
    );
    expect(mocks.generateDescription).toHaveBeenCalledWith(
      expect.stringContaining(
        "Follow with 3 to 5 markdown bullet points using bold labels",
      ),
    );
    expect(mocks.generateDescription).toHaveBeenCalledWith(
      expect.stringContaining("Sky-market politics and drone wars."),
    );
    expect(mocks.retrieveContext).toHaveBeenCalledWith(
      expect.stringContaining(
        "Moonfall Neon Night setting world campaign overview premise tone central conflict",
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
  });

  it("keeps the current summary when generation fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.generateDescription.mockImplementationOnce(async () => {
      campaignStoreMock.error = "Failed to generate campaign summary.";
      return "";
    });

    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));
    await fireEvent.click(screen.getByLabelText("Generate summary"));

    await waitFor(() =>
      expect(screen.getByTestId("summary-preview")).toBeTruthy(),
    );
    expect(screen.getByText("capital").tagName).toBe("STRONG");
    expect(
      screen.queryByPlaceholderText("Write a short campaign summary..."),
    ).toBeNull();
    expect(campaignStoreMock.error).toBe(
      "Failed to generate campaign summary.",
    );
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

  it("expands the summary preview after hovering for a moment", async () => {
    render(FrontPage);

    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("vault-1", 6));

    const summaryPreview = screen.getByTestId("summary-preview");
    vi.useFakeTimers();

    await fireEvent.mouseEnter(summaryPreview);
    expect(summaryPreview.className).toContain("max-h-[14rem]");

    await vi.advanceTimersByTimeAsync(800);
    expect(summaryPreview.className).toContain("max-h-[48rem]");

    await fireEvent.mouseLeave(summaryPreview);
    expect(summaryPreview.className).toContain("max-h-[14rem]");
    vi.useRealTimers();
  });
});
