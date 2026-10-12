/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import RoutePage from "./+page.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { graph } from "$lib/stores/graph.svelte";
import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

const { mockPage } = vi.hoisted(() => ({
  mockPage: {
    url: new URL("http://localhost/table"),
  },
}));

vi.mock("$app/state", () => ({
  page: mockPage,
}));

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
    mockPage.url = new URL("http://localhost/table");
    mutableVault.activeVaultId = "v1";
    mutableVault.isInitialized = true;
    mutableVault.allEntities = [];
    // typeFilters/labelFilters now read from these module-level singletons
    // (shared with the Graph view), not private component state, so they
    // must be reset between tests to avoid cross-test leakage.
    graph.clearCategoryFilters();
    explorerUIStore.clearLabelFilters();
    vi.clearAllMocks();
  });

  const openAuditPanel = async () => {
    await fireEvent.click(screen.getByTestId("entity-table-audit-toggle"));
  };

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
    expect(
      screen.getByTestId("entity-table-connections-e1").textContent?.trim(),
    ).toBe("0");
  });

  it("toggles the mobile filter panel and shows active filter badge", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Aldric", type: "character" }),
      entity({ id: "e2", title: "Brindlewood", type: "location" }),
    ];
    render(RoutePage);

    const toggleBtn = screen.getByTestId("entity-table-mobile-filters-toggle");
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("entity-table-active-filter-badge")).toBeNull();

    // Toggle open
    await fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");

    // Click a type filter
    const typeFilters = screen.getAllByTestId("entity-table-type-filter");
    await fireEvent.click(typeFilters[0]);

    // Active filter badge appears with count 1
    const badge = screen.getByTestId("entity-table-active-filter-badge");
    expect(badge.textContent?.trim()).toBe("1");

    // Clear filters
    const clearBtn = screen.getByTestId("entity-table-clear-filters");
    await fireEvent.click(clearBtn);
    expect(screen.queryByTestId("entity-table-active-filter-badge")).toBeNull();
  });

  it("keeps type/label filter state isolated from graph view", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Aldric", type: "character" }),
      entity({ id: "e2", title: "Brindlewood", type: "location" }),
    ];
    render(RoutePage);

    const toggleBtn = screen.getByTestId("entity-table-mobile-filters-toggle");
    await fireEvent.click(toggleBtn);
    await fireEvent.click(screen.getAllByTestId("entity-table-type-filter")[0]);

    // Table view filters are isolated and do not mutate the shared graph store
    expect(graph.activeCategories.size).toBe(0);

    const graphLink = screen.getByTestId("table-browse-as-graph");
    expect(graphLink.getAttribute("href")).toBe("/");
  });

  it("opens VaultAuditPanel automatically when URL has ?mode=audit", () => {
    mockPage.url = new URL("http://localhost/table?mode=audit");
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Aldric", type: "character", image: "" }),
      entity({ id: "e2", title: "Brindlewood", type: "location" }),
    ];
    render(RoutePage);

    expect(screen.getByTestId("vault-audit-panel")).toBeTruthy();
    expect(screen.getByTestId("vault-audit-panel").id).toBe(
      "vault-audit-panel",
    );
    expect(screen.getByText("Vault Audit")).toBeTruthy();
    expect(
      screen.getByText("Missing summary, labels, or connections"),
    ).toBeTruthy();
  });

  it("toggles VaultAuditPanel via the desktop audit button", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Aldric", type: "character" }),
    ];
    render(RoutePage);

    expect(screen.queryByTestId("vault-audit-panel")).toBeNull();
    const auditBtn = screen.getByTestId("entity-table-audit-toggle");
    await fireEvent.click(auditBtn);
    expect(screen.getByTestId("vault-audit-panel")).toBeTruthy();

    await fireEvent.click(screen.getByTestId("vault-audit-close"));
    expect(screen.queryByTestId("vault-audit-panel")).toBeNull();
  });

  it("applies an audit preset when clicked", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Aldric", type: "character", image: "" }),
      entity({
        id: "e2",
        title: "Lyra",
        type: "character",
        image: "images/lyra.png",
      }),
      entity({ id: "e3", title: "Old Keep", type: "location", image: "" }),
    ];
    render(RoutePage);

    const auditBtn = screen.getByTestId("entity-table-audit-toggle");
    await fireEvent.click(auditBtn);

    const presetBtn = screen.getByTestId(
      "audit-preset-characters-missing-portraits",
    );
    await fireEvent.click(presetBtn);

    // Filtered rows should only show Aldric (character with missing image)
    const rows = screen.getAllByTestId("entity-table-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Aldric");
  });

  it("applies finding drill-down when a finding card is clicked", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Aldric", content: "" }),
      entity({ id: "e2", title: "Brindlewood", content: "A bustling town." }),
    ];
    render(RoutePage);

    const auditBtn = screen.getByTestId("entity-table-audit-toggle");
    await fireEvent.click(auditBtn);

    const card = screen.getByTestId("audit-card-missing-descriptions");
    await fireEvent.click(card);

    // Filtered rows should only show Aldric (no summary)
    const rows = screen.getAllByTestId("entity-table-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Aldric");
  });

  it("opens VaultAuditPanel with distribution tab when URL has ?mode=overview", () => {
    mockPage.url = new URL("http://localhost/table?mode=overview");
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Aldric", type: "character" }),
      entity({ id: "e2", title: "Brindlewood", type: "location" }),
    ];
    render(RoutePage);

    expect(screen.getByTestId("vault-audit-panel")).toBeTruthy();
    expect(screen.getByTestId("vault-distribution-chart")).toBeTruthy();
  });

  it("switches between findings and distribution tabs inside VaultAuditPanel", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Aldric", type: "character" }),
      entity({ id: "e2", title: "Brindlewood", type: "location" }),
    ];
    render(RoutePage);

    const auditBtn = screen.getByTestId("entity-table-audit-toggle");
    await fireEvent.click(auditBtn);

    // Starts in findings tab
    expect(screen.getByTestId("audit-card-missing-images")).toBeTruthy();

    // Click distribution tab
    const distTab = screen.getByTestId("audit-tab-distribution");
    await fireEvent.click(distTab);

    expect(screen.getByTestId("vault-distribution-chart")).toBeTruthy();
    expect(screen.queryByTestId("audit-card-missing-images")).toBeNull();

    // Switch back to findings tab
    const findingsTab = screen.getByTestId("audit-tab-findings");
    await fireEvent.click(findingsTab);

    expect(screen.getByTestId("audit-card-missing-images")).toBeTruthy();
  });

  it("filters table entities when clicking a distribution category bar", async () => {
    mockPage.url = new URL("http://localhost/table?mode=overview");
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Aldric", type: "character" }),
      entity({ id: "e2", title: "Brindlewood", type: "location" }),
    ];
    render(RoutePage);

    const charBar = screen.getByTestId("distribution-bar-character");
    await fireEvent.click(charBar);

    const rows = screen.getAllByTestId("entity-table-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Aldric");
  });

  it("filters table entities when clicking a distribution label bar", async () => {
    mockPage.url = new URL("http://localhost/table?mode=overview");
    mutableVault.allEntities = [
      entity({
        id: "e1",
        title: "Aldric",
        type: "character",
        labels: ["Hero"],
      }),
      entity({
        id: "e2",
        title: "Brindlewood",
        type: "location",
        labels: ["Place"],
      }),
    ];
    render(RoutePage);

    // Switch to By Label
    const labelGroupBtn = screen.getByTestId("distribution-group-label");
    await fireEvent.click(labelGroupBtn);

    const heroBar = screen.getByTestId("distribution-bar-Hero");
    await fireEvent.click(heroBar);

    const rows = screen.getAllByTestId("entity-table-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Aldric");
  });

  it("applies the unconnected characters preset to the table rows", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Isolated Character", type: "character" }),
      entity({
        id: "e2",
        title: "Connected Character",
        type: "character",
        connections: [{ target: "e1", type: "related_to", strength: 1 }],
      }),
      entity({ id: "e3", title: "Isolated Location", type: "location" }),
    ];
    render(RoutePage);

    await openAuditPanel();
    await fireEvent.click(
      screen.getByTestId("audit-preset-unconnected-characters"),
    );

    const rows = screen.getAllByTestId("entity-table-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Isolated Character");
  });

  it("applies the sparse locations preset to the table rows", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Sparse Location", type: "location" }),
      entity({
        id: "e2",
        title: "Described Location",
        type: "location",
        content: "A busy market town.",
      }),
      entity({ id: "e3", title: "Undescribed Character", type: "character" }),
    ];
    render(RoutePage);

    await openAuditPanel();
    await fireEvent.click(screen.getByTestId("audit-preset-sparse-locations"));

    const rows = screen.getAllByTestId("entity-table-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Sparse Location");
  });

  it("applies the all flagged preset to the table rows", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Flagged Entity" }),
      entity({
        id: "e2",
        title: "Complete Entity",
        content: "A complete description.",
        labels: ["reviewed"],
        connections: [{ target: "e1", type: "related_to", strength: 1 }],
      }),
    ];
    render(RoutePage);

    await openAuditPanel();
    await fireEvent.click(screen.getByTestId("audit-preset-all-flagged"));

    const rows = screen.getAllByTestId("entity-table-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Flagged Entity");
  });

  it("applies the zero connections drill-down to the table rows", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Isolated Entity" }),
      entity({
        id: "e2",
        title: "Connected Entity",
        connections: [{ target: "e1", type: "related_to", strength: 1 }],
      }),
    ];
    render(RoutePage);

    await openAuditPanel();
    await fireEvent.click(screen.getByTestId("audit-card-zero-connections"));

    const rows = screen.getAllByTestId("entity-table-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Isolated Entity");
  });

  it("applies the unlabelled drill-down to the table rows", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Unlabelled Entity" }),
      entity({ id: "e2", title: "Labelled Entity", labels: ["reviewed"] }),
    ];
    render(RoutePage);

    await openAuditPanel();
    await fireEvent.click(screen.getByTestId("audit-card-unlabelled"));

    const rows = screen.getAllByTestId("entity-table-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Unlabelled Entity");
  });

  it("applies the incomplete drill-down to the table rows", async () => {
    mutableVault.allEntities = [
      entity({ id: "e1", title: "Incomplete Entity" }),
      entity({
        id: "e2",
        title: "Complete Entity",
        content: "A complete description.",
        labels: ["reviewed"],
        connections: [{ target: "e1", type: "related_to", strength: 1 }],
      }),
    ];
    render(RoutePage);

    await openAuditPanel();
    await fireEvent.click(screen.getByTestId("audit-card-incomplete"));

    const rows = screen.getAllByTestId("entity-table-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Incomplete Entity");
  });
});
