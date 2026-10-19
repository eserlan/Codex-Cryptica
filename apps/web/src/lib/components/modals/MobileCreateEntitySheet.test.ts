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

const profile = vi.hoisted(() => ({ isTalesOfTheValiant: false }));

vi.mock("$lib/stores/system-profile.svelte", () => ({
  systemProfileStore: {
    get isTalesOfTheValiant() {
      return profile.isTalesOfTheValiant;
    },
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

const mockEntityTemplateStore = vi.hoisted(() => ({
  loaded: true,
  templatesFor: vi.fn((type: string) => [
    {
      id: `tmpl-${type}-default`,
      name: `Default ${type}`,
      entityType: type,
    },
    {
      id: `tmpl-${type}-archetype`,
      name: `Special ${type}`,
      entityType: type,
    },
  ]),
  effectiveDefaultFor: vi.fn((type: string) => `tmpl-${type}-default`),
}));

vi.mock("$lib/stores/entity-templates/entity-template-store.svelte", () => ({
  entityTemplateStore: mockEntityTemplateStore,
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

  it("renders template archetype selector when multiple templates exist for selected category", () => {
    render(MobileCreateEntitySheet);

    const templateSelect = screen.getByTestId(
      "mobile-create-entity-template",
    ) as HTMLSelectElement;
    expect(templateSelect).toBeTruthy();
    expect(templateSelect.value).toBe("tmpl-character-default");
  });

  it("passes selected templateId to entityTemplateService.resolveTemplate upon creating entity", async () => {
    const { entityTemplateService } =
      await import("$lib/services/EntityTemplateService.svelte");
    render(MobileCreateEntitySheet);

    const titleInput = screen.getByTestId("mobile-create-entity-title");
    await fireEvent.input(titleInput, { target: { value: "Solstice Gala" } });

    const templateSelect = screen.getByTestId("mobile-create-entity-template");
    await fireEvent.change(templateSelect, {
      target: { value: "tmpl-character-archetype" },
    });

    const createBtn = screen.getByTestId("mobile-create-entity-submit");
    await fireEvent.click(createBtn);

    expect(entityTemplateService.resolveTemplate).toHaveBeenCalledWith(
      "character",
      "workspace",
      null,
      { templateId: "tmpl-character-archetype" },
    );
  });
});

describe("MobileCreateEntitySheet: stat block import entry point", () => {
  it("offers FROM STAT BLOCK in a ToV vault", () => {
    profile.isTalesOfTheValiant = true;
    modalUIStore.showMobileCreateSheet = true;
    modalUIStore.pendingCreateDate = { year: 2026, month: 6, day: 18 };
    render(MobileCreateEntitySheet);
    expect(screen.getByTestId("mobile-new-from-stat-block")).toBeTruthy();
  });

  it("does not offer it in other vaults", () => {
    profile.isTalesOfTheValiant = false;
    modalUIStore.showMobileCreateSheet = true;
    modalUIStore.pendingCreateDate = { year: 2026, month: 6, day: 18 };
    render(MobileCreateEntitySheet);
    expect(screen.queryByTestId("mobile-new-from-stat-block")).toBeNull();
  });
});
