/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

const {
  updateEntity,
  addResult,
  sendResolvedRollMessage,
  vaultState,
  templateState,
} = vi.hoisted(() => ({
  updateEntity: vi.fn(),
  addResult: vi.fn().mockResolvedValue(undefined),
  sendResolvedRollMessage: vi.fn(),
  vaultState: { isGuest: false },
  templateState: {
    categoryDefaults: {} as Record<string, string>,
    allTemplates: [
      {
        id: "builtin-dnd-npc",
        name: "D&D NPC",
        fields: [
          { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 20 },
        ],
      },
    ],
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    get isGuest() {
      return vaultState.isGuest;
    },
    updateEntity,
  },
}));

vi.mock("$lib/stores/stat-sheet-templates.svelte", () => ({
  statSheetTemplates: {
    get categoryDefaults() {
      return templateState.categoryDefaults;
    },
    get allTemplates() {
      return templateState.allTemplates;
    },
    cloneTemplateFields: (t: any) => t.fields.map((f: any) => ({ ...f })),
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
  diceParser: {
    parse: vi.fn((formula: string) => {
      if (formula.includes("invalid")) throw new Error("Invalid formula");
      return formula;
    }),
  },
  diceEngine: {
    execute: vi.fn(() => ({ total: 17, parts: [] })),
  },
}));

import StatSheetView from "./StatSheetView.svelte";

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

describe("StatSheetView", () => {
  beforeEach(() => {
    updateEntity.mockClear();
    addResult.mockClear();
    sendResolvedRollMessage.mockClear();
    templateState.categoryDefaults = {};
  });

  it("renders an empty state when there are no fields", () => {
    render(StatSheetView, { entity: buildEntity() });
    expect(screen.getByTestId("stat-sheet-empty")).toBeTruthy();
  });

  it("does not show an apply-default button when the category has no default configured", () => {
    render(StatSheetView, { entity: buildEntity() });
    expect(screen.queryByTestId("stat-sheet-apply-default")).toBeNull();
  });

  it("offers to apply the category's configured default template from the empty state", async () => {
    templateState.categoryDefaults = { npc: "builtin-dnd-npc" };
    const entity = buildEntity();
    render(StatSheetView, { entity });

    const button = screen.getByTestId("stat-sheet-apply-default");
    expect(button.textContent).toContain("D&D NPC");

    await fireEvent.click(button);

    expect(updateEntity).toHaveBeenCalledWith("goblin-1", {
      statSheet: {
        templateId: "builtin-dnd-npc",
        fields: [
          { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 20 },
        ],
      },
    });
  });

  it("does not show an apply-default button in guest/read-only mode even when a default is configured", () => {
    templateState.categoryDefaults = { npc: "builtin-dnd-npc" };
    vaultState.isGuest = true;
    try {
      render(StatSheetView, { entity: buildEntity() });
      expect(screen.queryByTestId("stat-sheet-apply-default")).toBeNull();
    } finally {
      vaultState.isGuest = false;
    }
  });

  it("increments a counter field and persists the updated value", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "hp",
            label: "Hit Points",
            type: "counter",
            value: 10,
            max: 20,
          },
        ],
      },
    });
    render(StatSheetView, { entity });

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
          },
        ],
      },
    });
  });

  it("clamps a counter decrement at its min bound", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "hp", label: "Hit Points", type: "counter", value: 0, min: 0 },
        ],
      },
    });
    render(StatSheetView, { entity });

    await fireEvent.click(screen.getByLabelText("Decrease Hit Points"));

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ value: 0 })],
        }),
      }),
    );
  });

  it("persists text field edits", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "conditions", label: "Conditions", type: "text", value: "" },
        ],
      },
    });
    render(StatSheetView, { entity });

    await fireEvent.input(screen.getByDisplayValue(""), {
      target: { value: "Prone" },
    });

    expect(updateEntity).toHaveBeenCalledWith("goblin-1", {
      statSheet: {
        templateId: null,
        fields: [
          {
            id: "conditions",
            label: "Conditions",
            type: "text",
            value: "Prone",
          },
        ],
      },
    });
  });

  it("rolls a dice field and broadcasts the result to the VTT session", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "atk", label: "Attack", type: "dice", formula: "1d20+5" },
        ],
      },
    });
    render(StatSheetView, { entity });

    await fireEvent.click(screen.getByLabelText("Roll Attack"));

    expect(addResult).toHaveBeenCalled();
    expect(sendResolvedRollMessage).toHaveBeenCalledWith(
      "Attack: 1d20+5",
      expect.objectContaining({ total: 17 }),
    );
    expect(screen.getByTestId("stat-sheet-dice-result").textContent).toContain(
      "17",
    );
  });

  it("shows a validation error for an invalid dice formula without crashing", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "atk", label: "Attack", type: "dice", formula: "invalid+d" },
        ],
      },
    });
    render(StatSheetView, { entity });

    await fireEvent.click(screen.getByLabelText("Roll Attack"));

    expect(screen.getByTestId("stat-sheet-dice-result").textContent).toContain(
      "Invalid formula",
    );
  });

  it("collapses and expands fields under a heading section", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "sec", label: "Combat", type: "heading", collapsed: false },
          { id: "hp", label: "Hit Points", type: "counter", value: 10 },
        ],
      },
    });
    render(StatSheetView, { entity });

    expect(screen.getByTestId("stat-sheet-counter")).toBeTruthy();

    await fireEvent.click(screen.getByTestId("stat-sheet-heading"));

    expect(updateEntity).toHaveBeenCalledWith("goblin-1", {
      statSheet: {
        templateId: null,
        fields: [
          { id: "sec", label: "Combat", type: "heading", collapsed: true },
          { id: "hp", label: "Hit Points", type: "counter", value: 10 },
        ],
      },
    });
  });

  it("hides fields under an already-collapsed heading", () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "sec", label: "Combat", type: "heading", collapsed: true },
          { id: "hp", label: "Hit Points", type: "counter", value: 10 },
        ],
      },
    });
    render(StatSheetView, { entity });

    expect(screen.queryByTestId("stat-sheet-counter")).toBeNull();
  });

  it("disables controls and hides the layout editor link in guest/read-only mode", async () => {
    vaultState.isGuest = true;
    try {
      const entity = buildEntity({
        statSheet: {
          fields: [
            { id: "hp", label: "Hit Points", type: "counter", value: 10 },
          ],
        },
      });
      render(StatSheetView, { entity });

      expect(
        (screen.getByLabelText("Increase Hit Points") as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      expect(screen.queryByTestId("stat-sheet-edit-layout")).toBeNull();
    } finally {
      vaultState.isGuest = false;
    }
  });

  it("self-heals duplicate field ids (e.g. from appending two built-in templates that both used the same id) by regenerating and persisting unique ids", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "hp", label: "Hit Points", type: "counter", value: 10 },
          { id: "ac", label: "Armor Class", type: "number", value: 15 },
          { id: "hp", label: "Hit Points", type: "counter", value: 24 },
        ],
      },
    });

    render(StatSheetView, { entity });

    await vi.waitFor(() => expect(updateEntity).toHaveBeenCalled());

    const [, payload] = updateEntity.mock.calls[0];
    const ids = payload.statSheet.fields.map((f: { id: string }) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    // The first occurrence keeps its original id; only the later duplicate
    // is reassigned, so existing per-field state isn't churned unnecessarily.
    expect(payload.statSheet.fields[0].id).toBe("hp");
    expect(payload.statSheet.fields[2].id).not.toBe("hp");
  });

  it("does not attempt to self-heal duplicate ids in guest/read-only mode", () => {
    vaultState.isGuest = true;
    try {
      const entity = buildEntity({
        statSheet: {
          fields: [
            { id: "hp", label: "Hit Points", type: "counter", value: 10 },
            { id: "hp", label: "Hit Points", type: "counter", value: 24 },
          ],
        },
      });
      render(StatSheetView, { entity });
      expect(updateEntity).not.toHaveBeenCalled();
    } finally {
      vaultState.isGuest = false;
    }
  });
});
