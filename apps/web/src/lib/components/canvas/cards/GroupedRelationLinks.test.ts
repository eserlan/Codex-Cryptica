/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: {},
    resolveImageUrl: vi.fn().mockResolvedValue(null),
  },
}));

import GroupedRelationLinks from "./GroupedRelationLinks.svelte";

const GROUPS = [
  {
    key: "character",
    label: "Characters",
    rows: [{ target: "a", title: "Lajos", text: "Sworn Ally", stance: "ally" }],
  },
  {
    key: "faction",
    label: "Factions",
    rows: [
      {
        target: "ghost",
        title: "Unknown",
        text: "killer of",
        stance: "enemy",
      },
    ],
  },
] as const;

describe("GroupedRelationLinks", () => {
  it("renders each group with named relation rows", () => {
    render(GroupedRelationLinks, {
      props: { groups: [...GROUPS] as any },
    });

    expect(screen.getByTestId("link-group-character")).toBeTruthy();
    expect(screen.getByText("Characters")).toBeTruthy();
    expect(screen.getByText("Lajos")).toBeTruthy();
    expect(screen.getByText("Sworn Ally")).toBeTruthy();
    expect(screen.getByText("Factions")).toBeTruthy();
    expect(screen.getByText("Unknown")).toBeTruthy();
    expect(screen.getByText("killer of")).toBeTruthy();
  });

  it("renders nothing without groups", () => {
    render(GroupedRelationLinks, { props: { groups: [] } });

    expect(screen.queryByTestId("grouped-relation-links")).toBeNull();
  });
});
