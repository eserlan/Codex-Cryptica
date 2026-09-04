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

// Real store, not a mock: the draft-retention behaviour under test lives here,
// and each test resets it so nothing leaks between renders.
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
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

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

  beforeEach(() => {
    modalUIStore.quickStartDraft = { themeId: null, premise: "" };
  });

  const renderModal = () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const onClose = vi.fn();
    render(QuickStartModal, { target, props: { onClose } });
    return { onClose };
  };

  it("shows a genre selector and premise input", () => {
    renderModal();
    expect(screen.getByLabelText("World genre and look")).toBeTruthy();
    expect(screen.getByLabelText("Seed Premise (optional)")).toBeTruthy();
  });

  it("names both the genre and the appearance in every option", () => {
    renderModal();
    const select = screen.getByLabelText(
      "World genre and look",
    ) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.textContent ?? "");

    // The visual theme name alone ("Ancient Parchment") does not tell anyone
    // they are about to generate a fantasy world.
    expect(options).toContain("Classic Fantasy (Ancient Parchment look)");
    expect(options).toContain("Space Exploration (LCARS Interface look)");
    expect(options).toContain("Space Western (Frontier Scoundrels look)");
    expect(options.every((label) => label.includes("look"))).toBe(true);
  });

  it("states that the one choice sets both the world and the workspace", () => {
    renderModal();
    const help = screen.getByTestId("quick-start-theme-help");
    expect(help.textContent).toContain("One choice, two effects");
    expect(help.textContent).toContain("Ancient Parchment");
  });

  it("previews what will be generated, in the selected genre's own words", async () => {
    renderModal();
    const preview = screen.getByTestId("quick-start-preview");
    expect(preview.textContent).toContain("Classic Fantasy");
    expect(preview.textContent).toContain("Region");

    await fireEvent.change(screen.getByLabelText("World genre and look"), {
      target: { value: "scifi" },
    });

    expect(preview.textContent).toContain("Sector");
    expect(preview.textContent).not.toContain("Classic Fantasy");
  });

  it("says the flow works without AI when the Oracle is unavailable", () => {
    renderModal();
    // The mocked oracle is disabled, matching a first-run/no-key user.
    expect(screen.getByTestId("quick-start-ai-note").textContent).toContain(
      "No AI and no account needed",
    );
  });

  it("suggests a premise from the chosen genre rather than a fixed one", async () => {
    renderModal();
    const premise = screen.getByLabelText(
      "Seed Premise (optional)",
    ) as HTMLTextAreaElement;
    const fantasyHint = premise.placeholder;

    await fireEvent.change(screen.getByLabelText("World genre and look"), {
      target: { value: "cyberpunk" },
    });

    expect(premise.placeholder).not.toBe(fantasyHint);
  });

  it("generates a starter world locally (AI disabled) and creates entities with connections", async () => {
    const { onClose } = renderModal();

    await fireEvent.change(screen.getByLabelText("World genre and look"), {
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

describe("QuickStartModal draft retention", () => {
  beforeEach(() => {
    modalUIStore.quickStartDraft = { themeId: null, premise: "" };
  });

  it("restores the previous choice when the dialog is reopened", async () => {
    const first = document.createElement("div");
    document.body.appendChild(first);
    const { unmount } = render(QuickStartModal, {
      target: first,
      props: { onClose: vi.fn() },
    });

    await fireEvent.change(screen.getByLabelText("World genre and look"), {
      target: { value: "western" },
    });
    await fireEvent.input(screen.getByLabelText("Seed Premise (optional)"), {
      target: { value: "a stagecoach robbery" },
    });
    unmount();

    const second = document.createElement("div");
    document.body.appendChild(second);
    render(QuickStartModal, { target: second, props: { onClose: vi.fn() } });

    const select = screen.getByLabelText(
      "World genre and look",
    ) as HTMLSelectElement;
    const premise = screen.getByLabelText(
      "Seed Premise (optional)",
    ) as HTMLTextAreaElement;
    expect(select.value).toBe("western");
    expect(premise.value).toBe("a stagecoach robbery");
  });
});
