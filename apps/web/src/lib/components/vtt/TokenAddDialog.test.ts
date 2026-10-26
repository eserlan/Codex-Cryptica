/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const makeChar = (n: number) => ({
  id: `char-${n}`,
  title: `Character ${n}`,
  type: "character",
  image: null,
});

const vaultMock = vi.hoisted(() => ({
  allEntities: [
    { id: "char-1", title: "Alyx", type: "character", image: null },
    { id: "cre-1", title: "Dire Wolf", type: "creature", image: null },
    { id: "loc-1", title: "Old Keep", type: "location", image: null },
    { id: "evt-1", title: "The Eclipse", type: "event", image: null },
  ],
  entities: {
    "char-1": { id: "char-1", title: "Alyx", type: "character", image: null },
    "cre-1": { id: "cre-1", title: "Dire Wolf", type: "creature", image: null },
    "loc-1": { id: "loc-1", title: "Old Keep", type: "location", image: null },
    "evt-1": { id: "evt-1", title: "The Eclipse", type: "event", image: null },
  },
}));

const mapSessionMock = vi.hoisted(() => ({
  pendingTokenCoords: { x: 120, y: 80 },
  addToken: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: vaultMock,
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mapSessionMock,
}));

import TokenAddDialog from "./TokenAddDialog.svelte";

describe("TokenAddDialog", () => {
  beforeEach(() => {
    mapSessionMock.pendingTokenCoords = { x: 120, y: 80 };
    mapSessionMock.addToken.mockReset();
  });

  it("limits entity selection to characters and creatures", async () => {
    render(TokenAddDialog);

    expect(screen.getByText("Alyx")).toBeTruthy();
    expect(screen.getByText("Dire Wolf")).toBeTruthy();
    expect(screen.queryByText("Old Keep")).toBeNull();
    expect(screen.queryByText("The Eclipse")).toBeNull();

    await fireEvent.click(screen.getByText("Alyx"));
    await fireEvent.click(screen.getByText("Create Token"));

    expect(mapSessionMock.addToken).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: "char-1",
        name: "Alyx",
      }),
    );
  });

  it("closes on Escape and backdrop click", async () => {
    render(TokenAddDialog);

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(mapSessionMock.pendingTokenCoords).toBeNull();

    // Re-open a fresh instance for the backdrop click assertion.
    cleanup();
    mapSessionMock.pendingTokenCoords = { x: 120, y: 80 };
    render(TokenAddDialog);

    await fireEvent.click(screen.getByTestId("token-add-backdrop"));
    expect(mapSessionMock.pendingTokenCoords).toBeNull();
  });

  it("filters entities by query case-insensitively", async () => {
    render(TokenAddDialog);

    const searchInput = screen.getByPlaceholderText(
      "Search characters and creatures...",
    );

    // Lowercase query should match title with different casing.
    await fireEvent.input(searchInput, { target: { value: "dire" } });
    expect(screen.getByText("Dire Wolf")).toBeTruthy();
    expect(screen.queryByText("Alyx")).toBeNull();

    // Uppercase query should also match.
    await fireEvent.input(searchInput, { target: { value: "ALYX" } });
    expect(screen.getByText("Alyx")).toBeTruthy();
    expect(screen.queryByText("Dire Wolf")).toBeNull();

    // Non-matching query shows no-results message.
    await fireEvent.input(searchInput, { target: { value: "zzz" } });
    expect(screen.getByText("No matching entities.")).toBeTruthy();
  });

  it("caps results at 12 and exits early when limit is reached", async () => {
    cleanup();

    // Build 15 characters — only 12 should be shown.
    const manyEntities = Array.from({ length: 15 }, (_, i) => makeChar(i + 1));
    vaultMock.allEntities = manyEntities;
    mapSessionMock.pendingTokenCoords = { x: 120, y: 80 };

    const { container } = render(TokenAddDialog);

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).filter((b) => b.textContent?.includes("Character"));
    expect(buttons.length).toBe(12);

    // Restore the default mock data for subsequent tests.
    vaultMock.allEntities = [
      { id: "char-1", title: "Alyx", type: "character", image: null },
      { id: "cre-1", title: "Dire Wolf", type: "creature", image: null },
      { id: "loc-1", title: "Old Keep", type: "location", image: null },
      { id: "evt-1", title: "The Eclipse", type: "event", image: null },
    ];
  });
});
