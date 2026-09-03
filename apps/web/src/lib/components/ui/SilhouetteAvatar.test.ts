/** @vitest-environment jsdom */
import { render, waitFor } from "@testing-library/svelte";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { clearSilhouetteCache, getSilhouetteUrl, SILHOUETTE_MAP } from "schema";
import SilhouetteAvatar from "./SilhouetteAvatar.svelte";

const ARTWORK =
  '<svg width="1024" height="1024" viewBox="0 0 1024 1024"><path fill="currentColor" d="M0 0h1v1H0z"/></svg>';

describe("SilhouetteAvatar", () => {
  beforeEach(() => {
    clearSilhouetteCache();
    // Artwork lives in R2, so the avatar fetches it rather than reading it out
    // of the bundle.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(ARTWORK, { status: 200 })),
    );
  });

  it("renders auto-inferred silhouette for a vampire entity", async () => {
    const { container } = render(SilhouetteAvatar, {
      entity: {
        type: "character",
        title: "Carmilla",
        labels: ["vampire", "noble"],
      },
    });

    await waitFor(() => expect(container.querySelector("svg")).toBeTruthy());
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
      "0 0 1024 1024",
    );
    // Which silhouette the heuristic picks is the resolver's business; what
    // matters here is that the avatar fetched artwork instead of inlining it.
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/assets\.codexcryptica\.com\/silhouettes\/.+\.svg\?v=\d+$/,
      ),
    );
  });

  it("renders explicit silhouetteId when provided", async () => {
    const { container } = render(SilhouetteAvatar, {
      silhouetteId: "scifi-scientist-alien",
    });

    await waitFor(() => expect(container.querySelector("svg")).toBeTruthy());
    expect(container.querySelector("[title='Alien Scientist']")).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      getSilhouetteUrl(SILHOUETTE_MAP.get("scifi-scientist-alien")!),
    );
  });

  it("falls back to a placeholder when the artwork cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const { getByTestId } = render(SilhouetteAvatar, {
      silhouetteId: "fantasy-warrior-male",
    });

    await waitFor(() =>
      expect(getByTestId("silhouette-glyph").dataset.state).toBe("failed"),
    );
  });

  it("shows archetype badge when showBadge is true", () => {
    const { getByText } = render(SilhouetteAvatar, {
      silhouetteId: "fantasy-warrior-male",
      showBadge: true,
    });

    expect(getByText("warrior")).toBeTruthy();
  });
});
