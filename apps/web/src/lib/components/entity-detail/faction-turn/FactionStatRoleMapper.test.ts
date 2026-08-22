/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

vi.mock("$lib/stores/faction-turn.svelte", () => ({
  factionTurn: { setRole: vi.fn() },
}));

import FactionStatRoleMapper from "./FactionStatRoleMapper.svelte";

const faction: Entity = {
  id: "black-eagles",
  type: "faction",
  title: "Black Eagles",
  labels: [],
  aliases: [],
  connections: [],
  content: "",
  statSheet: {
    fields: [
      { id: "influence", label: "Influence", type: "number", value: 6 },
      { id: "power", label: "Power", type: "number", value: 3 },
    ],
  },
};

describe("FactionStatRoleMapper", () => {
  it("shows every selectable stat's current value", () => {
    render(FactionStatRoleMapper, { entity: faction, roles: ["influence"] });

    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Not set",
      "Influence (6)",
      "Power (3)",
    ]);
  });

  it("displays built-in faction stats without asking the GM to map them", () => {
    render(FactionStatRoleMapper, {
      entity: {
        ...faction,
        statSheet: {
          ...faction.statSheet!,
          templateId: "builtin-faction-turn",
        },
      },
      roles: ["power", "influence"],
    });

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Power: 3")).toBeTruthy();
    expect(screen.getByText("Influence: 6")).toBeTruthy();
  });
});
