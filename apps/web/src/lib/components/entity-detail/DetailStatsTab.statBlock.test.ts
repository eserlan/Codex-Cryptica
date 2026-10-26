/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

const { vaultState, profile, openStatBlockImport } = vi.hoisted(() => ({
  vaultState: { isGuest: false },
  profile: { isTalesOfTheValiant: false },
  openStatBlockImport: vi.fn(),
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    get isGuest() {
      return vaultState.isGuest;
    },
    updateEntity: vi.fn(),
  },
}));

vi.mock("#lib/stores/system-profile.svelte.js", () => ({
  systemProfileStore: {
    get isTalesOfTheValiant() {
      return profile.isTalesOfTheValiant;
    },
  },
}));

vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: { openStatBlockImport },
}));

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { confirm: vi.fn(), notify: vi.fn() },
}));

vi.mock("#lib/stores/stat-sheet-templates.svelte.js", () => ({
  statSheetTemplates: {
    allTemplates: [],
    availableTemplates: [],
    categoryDefaults: {},
    getDefaultPresentationTemplateId: () => null,
  },
}));

vi.mock("#lib/stores/presentation-templates.svelte.js", () => ({
  presentationTemplates: {
    availableTemplatesForSchema: () => [],
  },
}));

import DetailStatsTab from "./DetailStatsTab.svelte";

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "goblin-1",
    type: "creature",
    title: "Goblin",
    labels: [],
    content: "",
    statSheet: { templateId: null, fields: [] },
    ...overrides,
  } as unknown as Entity;
}

describe("DetailStatsTab stat block import entry point", () => {
  beforeEach(() => {
    vaultState.isGuest = false;
    profile.isTalesOfTheValiant = false;
    openStatBlockImport.mockClear();
  });

  it("shows Import in a ToV vault", () => {
    profile.isTalesOfTheValiant = true;
    render(DetailStatsTab, { props: { entity: entity() } });
    expect(screen.getByTestId("stat-sheet-import")).toBeTruthy();
  });

  it("hides Import in a non-ToV vault when the sheet is not a ToV one", () => {
    render(DetailStatsTab, { props: { entity: entity() } });
    expect(screen.queryByTestId("stat-sheet-import")).toBeNull();
  });

  it("shows Import on a ToV monster sheet even in a non-ToV vault", () => {
    render(DetailStatsTab, {
      props: {
        entity: entity({
          statSheet: { templateId: "builtin-tov-monster", fields: [] },
        } as Partial<Entity>),
      },
    });
    expect(screen.getByTestId("stat-sheet-import")).toBeTruthy();
  });

  it("hides Import for a guest, even in a ToV vault", () => {
    vaultState.isGuest = true;
    profile.isTalesOfTheValiant = true;
    render(DetailStatsTab, { props: { entity: entity() } });
    expect(screen.queryByTestId("stat-sheet-import")).toBeNull();
  });

  it("opens the import for this entity", async () => {
    profile.isTalesOfTheValiant = true;
    render(DetailStatsTab, { props: { entity: entity() } });
    await fireEvent.click(screen.getByTestId("stat-sheet-import"));
    expect(openStatBlockImport).toHaveBeenCalledWith({ entityId: "goblin-1" });
  });
});
