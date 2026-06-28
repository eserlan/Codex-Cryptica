/** @vitest-environment jsdom */

import { render, waitFor, fireEvent } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClosePlotDialog, mockGeneratePlotAnalysis, mockSearch } =
  vi.hoisted(() => ({
    mockClosePlotDialog: vi.fn(),
    mockGeneratePlotAnalysis: vi.fn(),
    mockSearch: vi.fn(),
  }));

// --- dialog state ---
let plotDialogState = { open: false, entityId: null as string | null };

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    get plotDialog() {
      return plotDialogState;
    },
    closePlotDialog: mockClosePlotDialog,
    openPlotDialog: vi.fn(),
  },
}));

// --- vault ---
const vaultEntities: Record<string, any> = {
  "entity-1": {
    id: "entity-1",
    title: "Mara Voss",
    type: "character",
    content: "A rogue operative.",
    lore: "",
    connections: [],
  },
};

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    get entities() {
      return vaultEntities;
    },
    get inboundConnections() {
      return {};
    },
    isGuest: false,
  },
}));

vi.mock("$lib/services/search.svelte", () => ({
  searchService: { search: mockSearch },
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    effectiveApiKey: "test-key",
    modelName: "test-model",
    textGeneration: { generatePlotAnalysis: mockGeneratePlotAnalysis },
  },
}));

vi.mock("marked", () => ({
  marked: { parse: (s: string) => `<p>${s}</p>` },
}));

// --- tests ---

import PlotModal, { clearPlotCache } from "./PlotModal.svelte";

describe("PlotModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPlotCache();
    plotDialogState = { open: false, entityId: null };
    mockSearch.mockResolvedValue([]);
    mockGeneratePlotAnalysis.mockResolvedValue("# Plot\nA story hook.");
    // Reset vault to base state
    delete vaultEntities["entity-2"];
  });

  it("renders nothing when dialog is closed", () => {
    const { container } = render(PlotModal);
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("renders the modal and shows entity name when open", async () => {
    plotDialogState = { open: true, entityId: "entity-1" };
    const { getByRole, getByText } = render(PlotModal);

    await waitFor(() => expect(getByRole("dialog")).toBeTruthy());
    expect(getByText("Mara Voss")).toBeTruthy();
  });

  it("passes plain cloneable objects to generatePlotAnalysis, not Svelte proxies", async () => {
    plotDialogState = { open: true, entityId: "entity-1" };
    render(PlotModal);

    await waitFor(() => expect(mockGeneratePlotAnalysis).toHaveBeenCalled());

    const [, , entityArg, connectedArg] =
      mockGeneratePlotAnalysis.mock.calls[0];

    expect(() => structuredClone(entityArg)).not.toThrow();
    expect(() => structuredClone(connectedArg)).not.toThrow();
    expect(entityArg.title).toBe("Mara Voss");
  });

  it("shows rendered markdown result after generation", async () => {
    plotDialogState = { open: true, entityId: "entity-1" };
    const { container } = render(PlotModal);

    await waitFor(() =>
      expect(container.querySelector(".plot-modal-prose")).toBeTruthy(),
    );
  });

  it("shows Regenerate and Copy buttons after generation", async () => {
    plotDialogState = { open: true, entityId: "entity-1" };
    const { getByText } = render(PlotModal);

    await waitFor(() => {
      expect(getByText(/Regenerate/i)).toBeTruthy();
      expect(getByText(/Copy/i)).toBeTruthy();
    });
  });

  it("shows cached result immediately on second open without re-generating", async () => {
    // First open — generates and caches
    plotDialogState = { open: true, entityId: "entity-1" };
    const { unmount } = render(PlotModal);
    await waitFor(() =>
      expect(mockGeneratePlotAnalysis).toHaveBeenCalledTimes(1),
    );
    unmount();

    // Second open — should use cache, no new generate call
    mockGeneratePlotAnalysis.mockClear();
    plotDialogState = { open: true, entityId: "entity-1" };
    render(PlotModal);

    // Give it a tick to settle
    await waitFor(() => {
      expect(mockGeneratePlotAnalysis).not.toHaveBeenCalled();
    });
  });

  it("re-generates and busts cache when Regenerate is clicked", async () => {
    plotDialogState = { open: true, entityId: "entity-1" };
    const { getByText } = render(PlotModal);

    await waitFor(() => expect(getByText(/Regenerate/i)).toBeTruthy());
    mockGeneratePlotAnalysis.mockClear();
    await fireEvent.click(getByText(/Regenerate/i));

    await waitFor(() =>
      expect(mockGeneratePlotAnalysis).toHaveBeenCalledTimes(1),
    );
  });

  it("calls closePlotDialog when Close is clicked", async () => {
    plotDialogState = { open: true, entityId: "entity-1" };
    const { getByText } = render(PlotModal);

    await waitFor(() => getByText(/Close/i));
    await fireEvent.click(getByText(/Close/i));

    expect(mockClosePlotDialog).toHaveBeenCalled();
  });

  it("calls closePlotDialog on Escape key", async () => {
    plotDialogState = { open: true, entityId: "entity-1" };
    render(PlotModal);

    await waitFor(() => expect(mockGeneratePlotAnalysis).toHaveBeenCalled());
    await fireEvent.keyDown(window, { key: "Escape" });

    expect(mockClosePlotDialog).toHaveBeenCalled();
  });

  it("shows error message when generation fails", async () => {
    mockGeneratePlotAnalysis.mockRejectedValue(new Error("AI unavailable"));
    plotDialogState = { open: true, entityId: "entity-1" };
    const { getByText } = render(PlotModal);

    await waitFor(() => expect(getByText("AI unavailable")).toBeTruthy());
  });

  it("includes unlinked search mentions in the connected context", async () => {
    vaultEntities["entity-2"] = {
      id: "entity-2",
      title: "The Guild",
      type: "faction",
      content: "Mentions Mara Voss.",
      connections: [],
    };
    mockSearch.mockResolvedValue([
      { id: "entity-2", title: "The Guild", score: 0.9 },
    ]);

    plotDialogState = { open: true, entityId: "entity-1" };
    render(PlotModal);

    await waitFor(() => expect(mockGeneratePlotAnalysis).toHaveBeenCalled());

    const [, , , connectedArg] = mockGeneratePlotAnalysis.mock.calls[0];
    const mention = connectedArg.find((c: any) => c.entity.id === "entity-2");
    expect(mention).toBeDefined();
    expect(mention.connectionType).toBe("mention");
  });
});
