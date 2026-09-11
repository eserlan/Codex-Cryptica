/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileCreateEntitySheet from "./MobileCreateEntitySheet.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isInitialized: true,
    isGuest: false,
    selectedEntityId: null,
    createEntity: vi.fn(async () => "new-entity-id"),
    getActiveFolderHandle: vi.fn(async () => null),
    getActiveVaultHandle: vi.fn(async () => null),
  },
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [
      { id: "event", label: "Event" },
      { id: "character", label: "Character" },
    ],
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    jargon: { entity: "entity", vault: "vault" },
    worldThemeId: "workspace",
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", async () => {
  const actual = await vi.importActual<
    typeof import("$lib/stores/ui/modal-ui.svelte")
  >("$lib/stores/ui/modal-ui.svelte");
  return actual;
});

vi.mock("$lib/actions/focusTrap", () => ({
  focusTrap: () => ({ destroy() {} }),
}));

vi.mock("$lib/services/EntityTemplateService.svelte", () => ({
  entityTemplateService: {
    resolveTemplate: vi.fn(async () => ""),
    extractSummary: vi.fn(() => ""),
  },
}));

vi.mock("$lib/stores/proposer.svelte", () => ({
  proposerStore: {
    draftEntity: null,
    clearDraftEntity: vi.fn(),
  },
}));

describe("MobileCreateEntitySheet", () => {
  beforeEach(() => {
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
    modalUIStore.showMobileCreateSheet = true;
    modalUIStore.pendingCreateDate = { year: 2026, month: 6, day: 18 };
  });

  it("shows the selected start date and clears it when the sheet closes", async () => {
    render(MobileCreateEntitySheet);

    expect(screen.getByText("Start date: 2026-06-18")).toBeTruthy();
    await fireEvent.click(screen.getByLabelText("Cancel"));
    expect(modalUIStore.showMobileCreateSheet).toBe(false);
    expect(modalUIStore.pendingCreateDate).toBeNull();
  });

  it("hides the no-vault state icons from screen readers", () => {
    (vault as any).isInitialized = false;
    render(MobileCreateEntitySheet);

    expect(
      document
        .querySelector(".icon-\\[lucide--database\\]")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      document
        .querySelector(".icon-\\[lucide--plus\\]")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      document
        .querySelector(".icon-\\[lucide--folder-open\\]")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");

    (vault as any).isInitialized = true;
  });

  it("hides the guest state icon from screen readers", () => {
    (vault as any).isGuest = true;
    render(MobileCreateEntitySheet);

    expect(
      document
        .querySelector(".icon-\\[lucide--lock\\]")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");

    (vault as any).isGuest = false;
  });

  it("hides the labelled action button icons from screen readers", () => {
    render(MobileCreateEntitySheet);

    expect(
      document
        .querySelector(".icon-\\[lucide--calendar\\]")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      document
        .querySelector(".icon-\\[lucide--wand-2\\]")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
  });
});
