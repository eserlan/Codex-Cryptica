/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

const { updateEntity, addResult, sendResolvedRollMessage, vaultState } =
  vi.hoisted(() => ({
    updateEntity: vi.fn(),
    addResult: vi.fn().mockResolvedValue(undefined),
    sendResolvedRollMessage: vi.fn(),
    vaultState: { isGuest: false },
  }));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    get isGuest() {
      return vaultState.isGuest;
    },
    updateEntity,
  },
}));

vi.mock("$lib/stores/dice-history.svelte", () => ({
  diceHistory: { addResult },
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: {
    vttEnabled: true,
    sendResolvedRollMessage,
  },
}));

vi.mock("dice-engine", () => ({
  diceParser: { parse: vi.fn((formula: string) => formula) },
  diceEngine: { execute: vi.fn(() => ({ total: 17, parts: [] })) },
}));

import TokenQuickStats from "./TokenQuickStats.svelte";

function buildEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "goblin-1",
    type: "npc",
    title: "Goblin",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    statSheet: { fields: [] },
    ...overrides,
  } as Entity;
}

describe("TokenQuickStats", () => {
  beforeEach(() => {
    updateEntity.mockClear();
    addResult.mockClear();
    sendResolvedRollMessage.mockClear();
    vaultState.isGuest = false;
  });

  it("shows a hint and nothing else when no fields are favorited", () => {
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "hp", label: "Hit Points", type: "counter", value: 10 }],
      },
    });
    render(TokenQuickStats, { entity });

    expect(screen.getByTestId("token-quick-stats-empty")).toBeTruthy();
    expect(screen.queryByTestId("token-quick-stats")).toBeNull();
  });

  it("renders favorited counter, dice, number, and text fields", () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "hp", label: "HP", type: "counter", value: 12, favorite: true },
          {
            id: "atk",
            label: "Attack",
            type: "dice",
            formula: "1d20+3",
            favorite: true,
          },
          {
            id: "ac",
            label: "Armor Class",
            type: "number",
            value: 16,
            favorite: true,
          },
          {
            id: "align",
            label: "Alignment",
            type: "text",
            value: "Chaotic Evil",
            favorite: true,
          },
          {
            id: "unfav",
            label: "Unfavored",
            type: "number",
            value: 5,
            favorite: false,
          },
        ],
      },
    });

    render(TokenQuickStats, { props: { entity } });

    expect(screen.getByTestId("token-quick-stats-counter")).toBeTruthy();
    expect(screen.getByTestId("token-quick-stats-dice")).toBeTruthy();
    expect(screen.getByTestId("token-quick-stats-number")).toBeTruthy();
    expect(screen.getByTestId("token-quick-stats-text")).toBeTruthy();
    expect(screen.getByText("Armor Class")).toBeTruthy();
    expect(screen.getByText("Alignment")).toBeTruthy();
    expect(screen.getByText("Chaotic Evil")).toBeTruthy();
    expect(screen.queryByText("Unfavored")).toBeNull();
  });

  it("increments a favorited counter and persists the change", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "hp",
            label: "Hit Points",
            type: "counter",
            value: 10,
            max: 20,
            favorite: true,
          },
        ],
      },
    });
    render(TokenQuickStats, { entity });

    await fireEvent.click(screen.getByLabelText("Increase Hit Points"));

    expect(updateEntity).toHaveBeenCalledWith("goblin-1", {
      statSheet: {
        templateId: null,
        fields: [
          {
            id: "hp",
            label: "Hit Points",
            type: "counter",
            value: 11,
            max: 20,
            favorite: true,
          },
        ],
      },
    });
  });

  it("disables counter adjustment in guest/read-only mode", () => {
    vaultState.isGuest = true;
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "hp",
            label: "Hit Points",
            type: "counter",
            value: 10,
            favorite: true,
          },
        ],
      },
    });
    render(TokenQuickStats, { entity });

    expect(
      (screen.getByLabelText("Increase Hit Points") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("rolls a favorited dice field and broadcasts the result", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "atk",
            label: "Attack",
            type: "dice",
            formula: "1d20+5",
            favorite: true,
          },
        ],
      },
    });
    render(TokenQuickStats, { entity });

    await fireEvent.click(screen.getByLabelText("Roll Attack"));

    expect(addResult).toHaveBeenCalled();
    expect(sendResolvedRollMessage).toHaveBeenCalledWith(
      "Attack: 1d20+5",
      expect.objectContaining({ total: 17 }),
    );
    // Roll results appear in VTT chat only, not inline in the quick stats panel.
    expect(screen.queryByTestId("token-quick-stats-dice-result")).toBeNull();
  });

  it("allows guests to roll a favorited dice field even though counters are read-only", async () => {
    vaultState.isGuest = true;
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "atk",
            label: "Attack",
            type: "dice",
            formula: "1d20+5",
            favorite: true,
          },
        ],
      },
    });
    render(TokenQuickStats, { entity });

    await fireEvent.click(screen.getByLabelText("Roll Attack"));

    expect(addResult).toHaveBeenCalled();
  });
});
