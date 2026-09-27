/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { vaultMock } = vi.hoisted(() => ({
  vaultMock: {
    entities: {} as Record<string, any>,
    resolveImageUrl: vi.fn().mockResolvedValue(null),
    updateEntity: vi.fn(),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: vaultMock,
}));

vi.mock("@xyflow/svelte", () => ({
  Handle: function HandleMock() {
    return {};
  },
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
}));

import EntityNode from "./EntityNode.svelte";

function entity(overrides: Record<string, any> = {}) {
  return {
    id: "e1",
    type: "note",
    title: "Test Entity",
    labels: [],
    aliases: [],
    connections: [],
    content: "Some content.",
    ...overrides,
  };
}

describe("EntityNode card variants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaultMock.resolveImageUrl.mockResolvedValue(null);
    vaultMock.entities = {};
  });

  function renderNode(
    entityId = "e1",
    dataOverrides: Record<string, any> = {},
  ) {
    return render(EntityNode, {
      props: {
        data: { id: "node-1", entityId, ...dataOverrides },
        selected: false,
      } as any,
    });
  }

  it("keeps relationships off normal-size cards", () => {
    vaultMock.entities = {
      e1: entity({
        type: "character",
        title: "Vargas",
        content: "A rogue with a past.",
        labels: ["rogue", "younglings"],
        connections: [
          {
            target: "e2",
            type: "friendly",
            strength: 1,
            label: "Sworn Ally",
          },
        ],
      }),
      e2: entity({ id: "e2", type: "character", title: "Lajos" }),
    };
    renderNode();

    expect(screen.getByText("Vargas")).toBeTruthy();
    expect(screen.queryByText("Lajos")).toBeNull();
    expect(screen.queryByText("Sworn Ally")).toBeNull();
    expect(screen.queryByTestId("grouped-relation-links")).toBeNull();
  });

  it("groups links by kind on large character cards", () => {
    vaultMock.entities = {
      e1: entity({
        type: "character",
        title: "Vargas",
        content: "A rogue with a past.",
        connections: [
          {
            target: "e2",
            type: "friendly",
            strength: 1,
            label: "Sworn Ally",
          },
          {
            target: "e3",
            type: "part_of",
            strength: 1,
            label: "member of",
          },
          {
            target: "e4",
            type: "located_in",
            strength: 1,
            label: "hides in",
          },
        ],
      }),
      e2: entity({ id: "e2", type: "character", title: "Lajos" }),
      e3: entity({ id: "e3", type: "faction", title: "Black Eagles" }),
      e4: entity({ id: "e4", type: "location", title: "Buried Tower" }),
    };
    renderNode("e1", { largeCard: true });

    expect(screen.getByText("Characters")).toBeTruthy();
    expect(screen.getByText("Lajos")).toBeTruthy();
    expect(screen.getByText("Sworn Ally")).toBeTruthy();
    expect(screen.getByText("Factions")).toBeTruthy();
    expect(screen.getByText("Black Eagles")).toBeTruthy();
    expect(screen.getByText("Locations")).toBeTruthy();
    expect(screen.getByText("Buried Tower")).toBeTruthy();
  });

  it("keeps the large flag dormant on standard cards", () => {
    vaultMock.entities = {
      e1: entity({
        type: "note",
        title: "Field Note",
        content: "Remember this.",
        connections: [{ target: "e2", type: "related_to", strength: 1 }],
      }),
      e2: entity({ id: "e2", type: "character", title: "Lajos" }),
    };
    renderNode("e1", { largeCard: true });

    expect(screen.getByText("Remember this.")).toBeTruthy();
    expect(screen.queryByTestId("grouped-relation-links")).toBeNull();
  });

  it("renders member dots and count for faction entities without a portrait", async () => {
    vaultMock.entities = {
      e1: entity({
        type: "faction",
        title: "Black Eagles",
        image: "images/eagles.png",
        connections: [
          { target: "e2", type: "part_of", strength: 1 },
          { target: "e3", type: "part_of", strength: 1 },
        ],
      }),
      e2: entity({ id: "e2", type: "character", title: "Vargas" }),
      e3: entity({ id: "e3", type: "character", title: "Lajos" }),
    };
    vaultMock.resolveImageUrl.mockResolvedValue("blob:eagles");
    renderNode();

    await vi.waitFor(() =>
      expect(vaultMock.resolveImageUrl).toHaveBeenCalledWith(
        "images/eagles.png",
      ),
    );
    expect(screen.getByText("2 members")).toBeTruthy();
    expect(screen.getByTitle("Vargas")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders coordinates and connection count for location entities", () => {
    vaultMock.entities = {
      e1: entity({
        type: "location",
        title: "Buried Tower",
        content: "A sunken spire.",
        metadata: { coordinates: { x: 12, y: -4 } },
        connections: [{ target: "e2", type: "located_in", strength: 1 }],
      }),
    };
    renderNode();

    expect(screen.getByText("12, -4")).toBeTruthy();
    expect(screen.getByText("1 connection")).toBeTruthy();
  });

  it("keeps the legacy card for other entity types", () => {
    vaultMock.entities = {
      e1: entity({
        type: "note",
        title: "Field Note",
        content: "Remember this.",
      }),
    };
    renderNode();

    expect(screen.getByText("Remember this.")).toBeTruthy();
    expect(screen.queryByText("Relationships")).toBeNull();
    expect(screen.queryByTestId("faction-card-membership")).toBeNull();
    expect(screen.queryByTestId("location-card-meta")).toBeNull();
  });

  it("falls back gracefully when the entity is missing", () => {
    renderNode("ghost");

    expect(screen.getByText("Missing Entity")).toBeTruthy();
    expect(screen.queryByText("Relationships")).toBeNull();
  });

  it("honours a standard-card override on a character entity", () => {
    vaultMock.entities = {
      e1: entity({
        type: "character",
        title: "Vargas",
        content: "A rogue with a past.",
        connections: [
          { target: "e2", type: "friendly", strength: 1, label: "Sworn Ally" },
        ],
      }),
    };
    renderNode("e1", { cardView: "default" });

    expect(screen.getByText("A rogue with a past.")).toBeTruthy();
    expect(screen.queryByText("Relationships")).toBeNull();
  });

  it("honours a forced faction card on a non-faction entity", () => {
    vaultMock.entities = {
      e1: entity({
        type: "note",
        title: "Crew List",
        connections: [
          { target: "e2", type: "part_of", strength: 1 },
          { target: "e3", type: "part_of", strength: 1 },
        ],
      }),
      e2: entity({ id: "e2", type: "character", title: "Vargas" }),
      e3: entity({ id: "e3", type: "character", title: "Lajos" }),
    };
    renderNode("e1", { cardView: "faction" });

    expect(screen.getByText("2 members")).toBeTruthy();
  });

  it("shows an explicit quote on character cards only when the entity has one", () => {
    vaultMock.entities = {
      e1: entity({
        type: "character",
        title: "Vargas",
        content: "A rogue with a past.\n\n> Protect the weak.",
      }),
      e2: entity({
        id: "e2",
        type: "character",
        title: "Lajos",
        content: "Just a description.",
      }),
    };
    const { unmount } = renderNode("e1");
    expect(screen.getByTestId("character-card-quote")).toBeTruthy();
    unmount();

    renderNode("e2");
    expect(screen.queryByTestId("character-card-quote")).toBeNull();
  });

  it("renders a compact node with avatar and stance badge when cardView is compact", () => {
    vaultMock.entities = {
      e1: entity({
        type: "character",
        title: "Lady Alistra",
        labels: ["Alliert"],
      }),
    };
    renderNode("e1", { cardView: "compact" });

    expect(screen.getByTestId("compact-entity-node")).toBeTruthy();
    expect(screen.getByText("Lady Alistra")).toBeTruthy();
    expect(screen.getByText("(Ally)")).toBeTruthy();
  });

  it("renders a compact node with English Enemy badge", () => {
    vaultMock.entities = {
      e1: entity({
        type: "character",
        title: "Lord Malakor",
        labels: ["Enemy"],
      }),
    };
    renderNode("e1", { cardView: "compact" });

    expect(screen.getByTestId("compact-entity-node")).toBeTruthy();
    expect(screen.getByText("Lord Malakor")).toBeTruthy();
    expect(screen.getByText("(Enemy)")).toBeTruthy();
  });

  it("places category icon in front of entity title without writing category type text", () => {
    vaultMock.entities = {
      e1: entity({
        type: "character",
        title: "Kael Thorne",
        content: "A wandering scout.",
      }),
    };
    const { container } = renderNode("e1");

    expect(screen.getByText("Kael Thorne")).toBeTruthy();
    expect(screen.queryByText("character")).toBeNull();
    expect(screen.queryByText("Character")).toBeNull();
    const iconSpan = container.querySelector("span[class*='icon-']");
    expect(iconSpan).toBeTruthy();
  });

  it("renders an image-only node when cardView is image_only", async () => {
    vaultMock.entities = {
      e1: entity({
        type: "character",
        title: "Kael Thorne",
        image: "images/kael.png",
      }),
    };
    vaultMock.resolveImageUrl.mockResolvedValue("blob:kael-art");
    renderNode("e1", { cardView: "image_only" });

    await vi.waitFor(() =>
      expect(vaultMock.resolveImageUrl).toHaveBeenCalledWith("images/kael.png"),
    );
    expect(screen.getByTestId("image-only-entity-node")).toBeTruthy();
    expect(screen.getByText("Kael Thorne")).toBeTruthy();
  });

  it("renders a fallback placeholder when cardView is image_only but entity has no image", () => {
    vaultMock.entities = {
      e1: entity({
        type: "character",
        title: "Ghost Figure",
      }),
    };
    renderNode("e1", { cardView: "image_only" });

    expect(screen.getByTestId("image-only-entity-node")).toBeTruthy();
    expect(screen.getByText("Ghost Figure")).toBeTruthy();
    expect(screen.getByText("No image")).toBeTruthy();
  });

  it("handles duplicate connections to the same target without crashing Svelte each blocks", () => {
    vaultMock.entities = {
      e1: entity({
        type: "character",
        title: "Aniko",
        connections: [
          { target: "artifact-1", type: "related", strength: 1 },
          { target: "artifact-1", type: "related", strength: 1 },
        ],
      }),
      "artifact-1": entity({
        id: "artifact-1",
        type: "item",
        title: "Sssylthri Artifact",
      }),
    };
    renderNode("e1", { largeCard: true });
    expect(screen.getByText("Aniko")).toBeTruthy();
    expect(screen.getByText("Sssylthri Artifact")).toBeTruthy();
  });

  it("applies custom background presets to the entity card container", () => {
    vaultMock.entities = {
      e1: entity({ title: "Tinted Entity" }),
    };
    renderNode("e1", { background: "accent" });

    const card = screen.getByRole("button", { name: "Tinted Entity" });
    expect(card.style.backgroundColor).toContain("var(--color-theme-accent)");
  });

  it("applies transparent background styling with dashed border when transparent preset is set", () => {
    vaultMock.entities = {
      e1: entity({ title: "Transparent Entity" }),
    };
    renderNode("e1", { background: "transparent" });

    const card = screen.getByRole("button", { name: "Transparent Entity" });
    expect(card.style.backgroundColor).toBe("transparent");
    expect(card.className).toContain("border-dashed");
    expect(card.className).not.toContain("shadow-lg");
  });

  it("toggles to image only view when clicking the image button in header", async () => {
    vaultMock.entities = {
      e1: entity({
        title: "Portrait Hero",
        image: "images/hero.png",
      }),
    };
    vaultMock.resolveImageUrl.mockResolvedValue("blob:hero-img");
    const onUpdateEntityNode = vi.fn();

    renderNode("e1", { onUpdateEntityNode });

    const btn = await screen.findByRole("button", {
      name: "Switch to image only view",
    });
    await fireEvent.click(btn);
    expect(onUpdateEntityNode).toHaveBeenCalledWith({ cardView: "image_only" });
  });

  it("toggles back to standard view when clicking show card details in image only view", async () => {
    vaultMock.entities = {
      e1: entity({
        title: "Portrait Hero",
        image: "images/hero.png",
      }),
    };
    vaultMock.resolveImageUrl.mockResolvedValue("blob:hero-img");
    const onUpdateEntityNode = vi.fn();

    renderNode("e1", { cardView: "image_only", onUpdateEntityNode });

    const btn = await screen.findByRole("button", {
      name: "Show card details",
    });
    await fireEvent.click(btn);
    expect(onUpdateEntityNode).toHaveBeenCalledWith({ cardView: "auto" });
  });

  it("includes hover title and title attribute in image only view", async () => {
    vaultMock.entities = {
      e1: entity({
        title: "Portrait Hero",
        image: "images/hero.png",
      }),
    };
    vaultMock.resolveImageUrl.mockResolvedValue("blob:hero-img");

    renderNode("e1", { cardView: "image_only" });

    const card = screen.getByRole("button", { name: "Portrait Hero" });
    expect(card.getAttribute("title")).toBe("Portrait Hero");

    const hoverTitle = await screen.findByTestId("image-only-hover-title");
    expect(hoverTitle.textContent).toContain("Portrait Hero");
    expect(hoverTitle.className).toContain("opacity-0");
  });

  it("keeps info overlay visible with opacity-100 when showImageLabels is true", async () => {
    vaultMock.entities = {
      e1: entity({
        title: "Portrait Hero",
        image: "images/hero.png",
      }),
    };
    vaultMock.resolveImageUrl.mockResolvedValue("blob:hero-img");

    renderNode("e1", { cardView: "image_only", showImageLabels: true });

    const hoverTitle = await screen.findByTestId("image-only-hover-title");
    expect(hoverTitle.className).toContain("opacity-100");
    expect(hoverTitle.className).not.toContain("opacity-0");
  });
});
