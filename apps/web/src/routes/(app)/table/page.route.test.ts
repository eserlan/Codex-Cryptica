/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import RoutePage from "./+page.svelte";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

type MutableVaultMock = {
  activeVaultId: string | null;
  isInitialized: boolean;
  allEntities: Entity[];
};

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: null as string | null,
    isInitialized: false,
    allEntities: [] as Entity[],
  },
}));

function entity(
  partial: Partial<Entity> & { id: string; title: string },
): Entity {
  return {
    type: "character",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    status: "active",
    ...partial,
  } as Entity;
}

const mutableVault = vault as unknown as MutableVaultMock;

describe("/table page", () => {
  beforeEach(() => {
    mutableVault.activeVaultId = "v1";
    mutableVault.isInitialized = true;
    mutableVault.allEntities = [];
    vi.clearAllMocks();
  });

  it("shows a loading state until the vault is initialized", () => {
    mutableVault.isInitialized = false;
    render(RoutePage);
    expect(screen.getByTestId("entity-table-loading")).toBeTruthy();
  });

  it("prompts to open a vault when none is active", () => {
    mutableVault.activeVaultId = null;
    render(RoutePage);
    expect(screen.getByText("No vault open")).toBeTruthy();
  });

  it("shows an empty state when the vault has no entities", () => {
    render(RoutePage);
    expect(screen.getByText("No entities yet")).toBeTruthy();
  });

  it("renders the table with a count when entities exist", () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Aldric" }),
      entity({ id: "e2", title: "Brindlewood", type: "location" }),
    ];
    render(RoutePage);

    expect(screen.getByTestId("entity-table")).toBeTruthy();
    expect(screen.getByTestId("entity-table-count").textContent).toContain("2");
    expect(screen.getAllByTestId("entity-table-row")).toHaveLength(2);
  });
});
