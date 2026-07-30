/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createVaultMock,
  createEntityMock,
  addConnectionMock,
  setThemeMock,
  reviseNewEntityDraftMock,
  requestLayoutMock,
} = vi.hoisted(() => ({
  createVaultMock: vi.fn(async () => "vault-1"),
  createEntityMock: vi.fn(
    async (
      _type: string,
      title: string,
      _initialData?: Record<string, unknown>,
    ) => `id-${title}`,
  ),
  addConnectionMock: vi.fn(
    async (_source: string, _target: string, _relation: string) => true,
  ),
  setThemeMock: vi.fn(async () => undefined),
  // Mirrors the real AI-disabled/guest fallback: pass the draft through as-is.
  reviseNewEntityDraftMock: vi.fn(
    async (
      _title: string,
      _type: string,
      draft: { chronicle: string; lore: string },
    ) => ({ content: draft.chronicle, lore: draft.lore }),
  ),
  requestLayoutMock: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    createVault: createVaultMock,
    createEntity: createEntityMock,
    addConnection: addConnectionMock,
    isGuest: false,
    selectedEntityId: null,
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    setTheme: setThemeMock,
  },
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    isEnabled: false,
    reviseNewEntityDraft: reviseNewEntityDraftMock,
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: vi.fn(),
  },
}));

vi.mock("$lib/services/generators/ai-generator-gateway", () => ({
  aiGeneratorGateway: {
    complete: vi.fn(),
  },
}));

vi.mock("$lib/stores/graph.svelte", () => ({
  graph: {
    requestLayout: requestLayoutMock,
  },
}));

import QuickStartModal from "./QuickStartModal.svelte";

describe("QuickStartModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!Element.prototype.animate) {
      Element.prototype.animate = vi.fn(
        () =>
          ({
            finished: Promise.resolve(),
            cancel: vi.fn(),
            play: vi.fn(),
          }) as unknown as Animation,
      );
    }
    document.body.innerHTML = "";
  });

  const renderModal = () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onClose = vi.fn();
    render(QuickStartModal, { target, props: { onClose } });
    return { onClose };
  };

  it("shows a theme selector and premise input", () => {
    renderModal();
    expect(screen.getByLabelText("Theme")).toBeTruthy();
    expect(screen.getByLabelText("Seed Premise (optional)")).toBeTruthy();
  });

  it("generates a starter world locally (AI disabled) and creates entities with connections", async () => {
    const { onClose } = renderModal();

    await fireEvent.change(screen.getByLabelText("Theme"), {
      target: { value: "cyberpunk" },
    });
    await fireEvent.input(screen.getByLabelText("Seed Premise (optional)"), {
      target: { value: "Corporation hijacking the net grid" },
    });
    await fireEvent.click(screen.getByTestId("quick-start-generate"));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createVaultMock).toHaveBeenCalled();
    expect(setThemeMock).toHaveBeenCalledWith("cyberpunk");
    // 5 entities in the local starter constellation.
    expect(createEntityMock).toHaveBeenCalledTimes(5);
    expect(addConnectionMock).toHaveBeenCalled();
  });

  it("creates each relationship as a single connection, never a duplicate/reverse pair", async () => {
    renderModal();

    await fireEvent.click(screen.getByTestId("quick-start-generate"));
    await waitFor(() => expect(addConnectionMock).toHaveBeenCalled());

    // 4 relationships in the local starter constellation (settlement→region,
    // faction→settlement, character→faction, threat→settlement).
    expect(addConnectionMock).toHaveBeenCalledTimes(4);

    const pairs = addConnectionMock.mock.calls.map(
      ([source, target]) => `${source}->${target}`,
    );
    for (const [source, target] of addConnectionMock.mock.calls) {
      expect(pairs).not.toContain(`${target}->${source}`);
    }
  });

  it("runs each generated entity through the revise pipeline (auto-approved, no manual review) before saving", async () => {
    renderModal();

    await fireEvent.click(screen.getByTestId("quick-start-generate"));
    await waitFor(() => expect(createEntityMock).toHaveBeenCalledTimes(5));

    expect(reviseNewEntityDraftMock).toHaveBeenCalledTimes(5);
    const factionCall = createEntityMock.mock.calls.find(
      ([type]) => type === "faction",
    );
    expect(factionCall).toBeTruthy();
    const initialData = factionCall?.[2] as
      { lore?: string; content?: string } | undefined;
    // Falls back to the raw generated draft as-is (AI disabled here) — never a
    // raw, unfilled template spliced into the entity.
    expect(initialData?.content?.length).toBeGreaterThan(0);
    expect(initialData?.lore?.length).toBeGreaterThan(0);
    expect(initialData?.lore).not.toContain("## Summary");
  });

  it("saves the generated threat entity as an event, since 'threat' isn't a real vault category", async () => {
    renderModal();

    await fireEvent.click(screen.getByTestId("quick-start-generate"));
    await waitFor(() => expect(createEntityMock).toHaveBeenCalledTimes(5));

    expect(
      createEntityMock.mock.calls.some(([type]) => type === "threat"),
    ).toBe(false);
    const eventCall = createEntityMock.mock.calls.find(
      ([type]) => type === "event",
    );
    expect(eventCall).toBeTruthy();
  });

  it("requests a graph layout redraw once all entities and connections are created", async () => {
    renderModal();

    await fireEvent.click(screen.getByTestId("quick-start-generate"));
    await waitFor(() => expect(requestLayoutMock).toHaveBeenCalledTimes(1));

    // Must run after every entity/connection was created, not before.
    const layoutOrder = requestLayoutMock.mock.invocationCallOrder[0];
    const lastCreateOrder =
      createEntityMock.mock.invocationCallOrder.at(-1) ?? 0;
    const lastConnectOrder =
      addConnectionMock.mock.invocationCallOrder.at(-1) ?? 0;
    expect(layoutOrder).toBeGreaterThan(lastCreateOrder);
    expect(layoutOrder).toBeGreaterThan(lastConnectOrder);
  });
});
