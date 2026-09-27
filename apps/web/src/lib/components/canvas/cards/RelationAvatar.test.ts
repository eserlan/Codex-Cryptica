/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { vaultMock } = vi.hoisted(() => ({
  vaultMock: {
    entities: {} as Record<string, any>,
    resolveImageUrl: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: vaultMock,
}));

import RelationAvatar from "./RelationAvatar.svelte";

describe("RelationAvatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaultMock.resolveImageUrl.mockResolvedValue(null);
    vaultMock.entities = {};
  });

  it("shows the related portrait when it resolves", async () => {
    vaultMock.entities = { e2: { image: "images/lajos.png" } };
    vaultMock.resolveImageUrl.mockResolvedValue("blob:lajos");
    render(RelationAvatar, { props: { entityId: "e2", title: "Lajos" } });

    const portrait = await screen.findByRole("img", { name: "Lajos" });
    expect(portrait.getAttribute("src")).toBe("blob:lajos");
    expect(vaultMock.resolveImageUrl).toHaveBeenCalledWith("images/lajos.png");
  });

  it("falls back to an initial when the entity has no portrait", () => {
    vaultMock.entities = { e2: { title: "Lajos" } };
    render(RelationAvatar, { props: { entityId: "e2", title: "Lajos" } });

    expect(screen.getByLabelText("Lajos")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("falls back to an initial for unknown entities", () => {
    render(RelationAvatar, { props: { entityId: "ghost", title: "Unknown" } });

    expect(screen.getByLabelText("Unknown")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
