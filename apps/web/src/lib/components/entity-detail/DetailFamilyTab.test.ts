/** @vitest-environment jsdom */
import { render, screen, fireEvent, within } from "@testing-library/svelte";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Entity } from "schema";

const { hero, parent, vaultMock } = vi.hoisted(() => {
  const hero = {
    id: "hero",
    type: "character",
    title: "Hero",
    connections: [{ target: "parent", type: "child_of", strength: 1 }],
  } as unknown as Entity;
  const parent = {
    id: "parent",
    type: "character",
    title: "Parent Entity",
    connections: [{ target: "hero", type: "parent_of", strength: 1 }],
  } as unknown as Entity;
  const vaultMock = {
    entities: { hero, parent },
    selectedEntityId: null as string | null,
    addFamilyLink: vi.fn(),
    createEntity: vi.fn(),
  };
  return { hero, parent, vaultMock };
});

vi.mock("$lib/stores/vault.svelte", () => ({ vault: vaultMock }));

// EmptyFamilySlot pulls in the search-worker-backed Autocomplete; stub it.
vi.mock("$lib/components/ui/Autocomplete.svelte", async () => {
  const mod = await import("./MockAutocomplete.svelte");
  return { default: mod.default };
});

import DetailFamilyTab from "./DetailFamilyTab.svelte";

describe("DetailFamilyTab navigation", () => {
  beforeEach(() => {
    vaultMock.selectedEntityId = null;
  });

  it("opening a relative calls the provided onNavigate callback", async () => {
    const onNavigate = vi.fn();
    render(DetailFamilyTab, { entity: hero, onNavigate });

    // Both the parent's card and the focus card itself render an "open"
    // control — scope to the parents row to open the relative, not the focus.
    const parentsRow = screen.getByTestId("family-generation-parents");
    await fireEvent.click(within(parentsRow).getByTestId("family-card-open"));

    expect(onNavigate).toHaveBeenCalledWith(parent.id);
    // A custom onNavigate means the default vault.selectedEntityId path is
    // NOT used — this is what makes "open" work correctly inside zen mode,
    // which navigates via its own callback instead.
    expect(vaultMock.selectedEntityId).toBeNull();
  });

  it("defaults to setting vault.selectedEntityId when no onNavigate is given", async () => {
    render(DetailFamilyTab, { entity: hero });

    const parentsRow = screen.getByTestId("family-generation-parents");
    await fireEvent.click(within(parentsRow).getByTestId("family-card-open"));

    expect(vaultMock.selectedEntityId).toBe(parent.id);
  });
});

describe("DetailFamilyTab zoom + full screen controls", () => {
  it("zooms out and in, updating the percentage, and resets", async () => {
    render(DetailFamilyTab, { entity: hero });

    const reset = screen.getByTestId("family-zoom-reset");
    expect(reset.textContent?.trim()).toBe("100%");

    await fireEvent.click(screen.getByTestId("family-zoom-out"));
    expect(reset.textContent?.trim()).toBe("90%");

    await fireEvent.click(screen.getByTestId("family-zoom-in"));
    await fireEvent.click(screen.getByTestId("family-zoom-in"));
    expect(reset.textContent?.trim()).toBe("110%");

    await fireEvent.click(reset);
    expect(reset.textContent?.trim()).toBe("100%");
  });

  it("clamps zoom out at the minimum (disables the button)", async () => {
    render(DetailFamilyTab, { entity: hero });
    const out = screen.getByTestId("family-zoom-out");
    // 100% -> 50% is five steps of 10%.
    for (let i = 0; i < 6; i++) await fireEvent.click(out);
    expect(screen.getByTestId("family-zoom-reset").textContent?.trim()).toBe(
      "50%",
    );
    expect((out as HTMLButtonElement).disabled).toBe(true);
  });

  it("exposes a full-screen toggle", () => {
    render(DetailFamilyTab, { entity: hero });
    expect(screen.getByTestId("family-fullscreen")).toBeTruthy();
  });

  it("enters full screen only when the dialog can open, and exits cleanly", () => {
    const proto = HTMLDialogElement.prototype;
    const origShowModal = proto.showModal;
    const origClose = proto.close;
    const showModal = vi.fn();
    // Real close() dispatches a "close" event; emulate that so onclose runs.
    const close = vi.fn(function (this: HTMLDialogElement) {
      this.dispatchEvent(new Event("close"));
    });
    proto.showModal = showModal;
    proto.close = close;

    try {
      render(DetailFamilyTab, { entity: hero });

      fireEvent.click(screen.getByTestId("family-fullscreen"));
      expect(showModal).toHaveBeenCalledTimes(1);
      // Entered full screen: exit control present, enter control gone.
      expect(screen.getByTestId("family-exit-fullscreen")).toBeTruthy();
      expect(screen.queryByTestId("family-fullscreen")).toBeNull();

      fireEvent.click(screen.getByTestId("family-exit-fullscreen"));
      expect(close).toHaveBeenCalledTimes(1);
      // onclose flipped the state back.
      expect(screen.getByTestId("family-fullscreen")).toBeTruthy();
      expect(screen.queryByTestId("family-exit-fullscreen")).toBeNull();
    } finally {
      proto.showModal = origShowModal;
      proto.close = origClose;
    }
  });

  it("does not enter full screen when showModal is unavailable", () => {
    const proto = HTMLDialogElement.prototype;
    const origShowModal = proto.showModal;
    // Simulate an environment without dialog.showModal support.
    // @ts-expect-error intentionally removing for the test
    proto.showModal = undefined;

    try {
      render(DetailFamilyTab, { entity: hero });
      fireEvent.click(screen.getByTestId("family-fullscreen"));
      // Stayed out of full screen: the tree/toggle remain, no exit control.
      expect(screen.getByTestId("family-fullscreen")).toBeTruthy();
      expect(screen.queryByTestId("family-exit-fullscreen")).toBeNull();
    } finally {
      proto.showModal = origShowModal;
    }
  });
});
