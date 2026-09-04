import { render, fireEvent, screen, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SILHOUETTES, clearSilhouetteCache } from "schema";
import Page from "./+page.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$app/environment", () => ({
  browser: true,
}));

describe("Public Silhouette Gallery (/silhouettes)", { timeout: 15000 }, () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  const ARTWORK =
    '<svg width="512" height="512" viewBox="0 0 512 512"><path fill="currentColor" d="M0 0h1v1H0z"/></svg>';

  beforeEach(() => {
    vi.clearAllMocks();
    // Artwork is fetched from R2 rather than inlined in the bundle.
    clearSilhouetteCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(ARTWORK, { status: 200 })),
    );

    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    }
  });

  it("renders hero header with title and dynamic silhouettes count", () => {
    render(Page);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Vector RPG Silhouettes & Token Art");
    expect(
      screen.getByText(
        new RegExp(`${SILHOUETTES.length}\\+ Vector Silhouettes`, "i"),
      ),
    ).toBeTruthy();
    expect(screen.getByText(/CC-BY-4.0/i)).toBeTruthy();
  });

  it("renders live theme palette switcher and allows changing palettes", async () => {
    render(Page);

    // Initial palette is Amber Gold
    expect(screen.getByRole("button", { name: /Amber Gold/i })).toBeTruthy();

    // Click Blood Crimson palette button
    const crimsonBtn = screen.getByRole("button", { name: /Blood Crimson/i });
    await fireEvent.click(crimsonBtn);

    expect(
      screen.getByText(/Gothic horror, vampire clans & combat/i),
    ).toBeTruthy();
  });

  it("filters silhouettes in real-time by search query", async () => {
    const { container } = render(Page);

    const searchInput = screen.getByPlaceholderText(
      /Search silhouettes by archetype/i,
    );
    await fireEvent.input(searchInput, { target: { value: "alien" } });

    // Alien Scientist should appear in the grid
    expect(
      container.querySelector('[data-silhouette-id="scifi-scientist-alien"]'),
    ).toBeTruthy();
    // Fantasy Warrior should not appear in the grid
    expect(
      container.querySelector('[data-silhouette-id="fantasy-warrior-male"]'),
    ).toBeNull();
  });

  it("shows friendly empty state and reset button when search yields no matches", async () => {
    const { container } = render(Page);

    const searchInput = screen.getByPlaceholderText(
      /Search silhouettes by archetype/i,
    );
    await fireEvent.input(searchInput, {
      target: { value: "zzzznonexistentquery999" },
    });

    expect(screen.getByText("No silhouettes found")).toBeTruthy();

    // Click reset button
    const resetBtn = screen.getByRole("button", {
      name: /Clear search & filters/i,
    });
    await fireEvent.click(resetBtn);

    expect(screen.queryByText("No silhouettes found")).toBeNull();
    expect(
      container.querySelector('[data-silhouette-id="fantasy-warrior-male"]'),
    ).toBeTruthy();
  });

  it("filters silhouettes by genre chips", async () => {
    const { container } = render(Page);

    // Filter by Cyberpunk genre
    const cyberpunkChip = screen.getByTestId("genre-filter-cyberpunk");
    await fireEvent.click(cyberpunkChip);

    // Cyberpunk silhouettes should appear
    expect(
      container.querySelector('[data-silhouette-id="cyberpunk-hacker-female"]'),
    ).toBeTruthy();
    // Fantasy Warrior (M) only has fantasy & gothic
    expect(
      container.querySelector('[data-silhouette-id="fantasy-warrior-male"]'),
    ).toBeNull();
  });

  it("filters silhouettes by category chips", async () => {
    const { container } = render(Page);

    // Filter by Locations
    const locationsChip = screen.getByTestId("category-filter-location");
    await fireEvent.click(locationsChip);

    // Location silhouette should be present
    expect(
      container.querySelector('[data-silhouette-id="location-citadel-castle"]'),
    ).toBeTruthy();
    // Character should be filtered out
    expect(
      container.querySelector('[data-silhouette-id="fantasy-warrior-male"]'),
    ).toBeNull();
  });

  it("updates large preview pane when clicking or hovering a silhouette", async () => {
    const { container } = render(Page);

    // Locate Alien Scientist
    const searchInput = screen.getByPlaceholderText(
      /Search silhouettes by archetype/i,
    );
    await fireEvent.input(searchInput, { target: { value: "scientist" } });

    const card = container.querySelector(
      '[data-silhouette-id="scifi-scientist-alien"]',
    ) as HTMLElement;
    expect(card).toBeTruthy();
    await fireEvent.click(card);

    // Large preview should display Alien Scientist metadata
    const previewHeading = screen.getByTestId("preview-title");
    expect(previewHeading.textContent).toContain("Alien Scientist");
  });

  it("copies SVG markup to clipboard when clicking Copy SVG", async () => {
    render(Page);

    const copySvgBtn = screen.getByRole("button", { name: /Copy SVG/i });
    await fireEvent.click(copySvgBtn);

    await waitFor(() => expect(writeTextMock).toHaveBeenCalledTimes(1));
    const copiedContent = writeTextMock.mock.calls[0][0];
    expect(copiedContent).toContain("<svg");
    // Exported in the palette colour, not as an uncoloured currentColor asset.
    expect(copiedContent).not.toContain("currentColor");
    expect(copiedContent).toContain("fill=");
  });

  it("copies Cloudflare CDN link when clicking Copy CDN Link", async () => {
    render(Page);

    const cdnBtn = screen.getByRole("button", {
      name: /Copy Cloudflare CDN Link/i,
    });
    await fireEvent.click(cdnBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedContent = writeTextMock.mock.calls[0][0];
    expect(copiedContent).toMatch(
      /^https:\/\/assets\.codexcryptica\.com\/silhouettes\/.*\.svg$/,
    );
  });

  it("triggers file download when clicking Download SVG", async () => {
    render(Page);

    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");

    const downloadBtn = screen.getByRole("button", { name: /Download SVG/i });
    await fireEvent.click(downloadBtn);

    await waitFor(() => expect(appendChildSpy).toHaveBeenCalled());
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it("renders Codex Cryptica in-app campaign integration CTA", () => {
    render(Page);

    expect(
      screen.getByText("Auto-Match Silhouettes Directly in Offline Vaults"),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Explore Campaign Workspace/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Browse All RPG Tools & Generators/i }),
    ).toBeTruthy();
  });

  it("constrains the artwork inside cards to prevent hit-box overlap", async () => {
    const { container } = render(Page);

    const cards = container.querySelectorAll('[data-testid="silhouette-card"]');
    expect(cards.length).toBeGreaterThan(0);

    const firstCard = cards[0] as HTMLElement;
    expect(firstCard.className).toContain("overflow-hidden");

    const glyph = firstCard.querySelector('[data-testid="silhouette-glyph"]');
    expect(glyph).toBeTruthy();
    expect(glyph?.className).toContain("pointer-events-none");

    await waitFor(() =>
      expect(firstCard.querySelector("svg")?.getAttribute("viewBox")).toBe(
        "0 0 512 512",
      ),
    );
  });
});
