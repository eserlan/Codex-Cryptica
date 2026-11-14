import { render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  load: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock("#lib/services/adventure/artwork/default-artwork-catalogue.js", () => ({
  defaultArtworkCatalogue: { get: mocks.get },
}));
vi.mock("#lib/services/adventure/artwork/create-display-service.js", () => ({
  createDisplayService: () => ({
    display: { load: mocks.load },
    destroy: mocks.destroy,
  }),
}));
import AdventureArtworkFeature from "./AdventureArtworkFeature.svelte";

describe("adventure artwork assembly", () => {
  it("loads reviewed catalogue data and disposes the display service", async () => {
    const asset = {
      id: "forest-art",
      type: "location",
      genres: ["fantasy"],
      primaryCues: ["forest"],
      settingCues: [],
      moodCues: [],
      timeCues: [],
      excludes: [],
      review: { status: "approved" },
      alt: "A forest",
      variants: { display: { sha256: "a".repeat(64) } },
      provenance: { attribution: "Artist" },
    };
    mocks.get.mockResolvedValue([asset]);
    mocks.load.mockResolvedValue({ url: "blob:forest", release: vi.fn() });
    const session = {
      id: "s1",
      revision: 2,
      vaultId: "v1",
      currentPlaceId: "p1",
      places: [{ id: "p1", name: "Forest" }],
      artwork: {
        version: 1,
        associations: [
          {
            subject: { kind: "place", id: "p1" },
            association: {
              version: 1,
              automatic: {
                assetId: "forest-art",
                catalogueVersion: 1,
                assignedOnTurnId: "t1",
              },
            },
          },
        ],
      },
    };
    const view = render(AdventureArtworkFeature, {
      props: {
        session,
        activeVaultId: "v1",
        entities: {},
        resolve: async () => "",
        readOnly: false,
        theme: "fantasy",
        mutate: vi.fn(),
      },
    });
    expect((await screen.findByAltText("A forest")).getAttribute("src")).toBe(
      "blob:forest",
    );
    view.unmount();
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
  it("continues without illustrations when metadata is unavailable", async () => {
    mocks.get.mockResolvedValue(null);
    render(AdventureArtworkFeature, {
      props: {
        session: null,
        activeVaultId: "v1",
        entities: {},
        resolve: async () => "",
        readOnly: false,
        theme: "fantasy",
        mutate: vi.fn(),
      },
    });
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders an NPC portrait when provided and omits it when cleared", async () => {
    mocks.get.mockResolvedValue([]);
    const view = render(AdventureArtworkFeature, {
      props: {
        session: null,
        activeVaultId: "v1",
        entities: {},
        resolve: async () => "",
        readOnly: false,
        theme: "fantasy",
        mutate: vi.fn(),
        portrait: {
          name: "Elara",
          src: "blob:elara",
          alt: "Portrait of Elara",
          aiLabel: "AI illustration",
          credits: "Codex Cryptica Team",
        },
      },
    });
    const img = (await screen.findByAltText(
      "Portrait of Elara",
    )) as HTMLImageElement;
    expect(img.src).toBe("blob:elara");
    expect(screen.getByText("Elara")).toBeTruthy();

    await view.rerender({
      session: null,
      activeVaultId: "v1",
      entities: {},
      resolve: async () => "",
      readOnly: false,
      theme: "fantasy",
      mutate: vi.fn(),
      portrait: null,
    });
    expect(screen.queryByAltText("Portrait of Elara")).toBeNull();
  });
});
