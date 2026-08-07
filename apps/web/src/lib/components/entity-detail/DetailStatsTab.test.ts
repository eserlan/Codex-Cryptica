/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity, StatSheetTemplate } from "schema";

const { updateEntity, schema, usableTemplate, customPresentation } = vi.hoisted(
  () => {
    const schema: StatSheetTemplate = {
      id: "schema-1",
      name: "Test Schema",
      isBuiltIn: true,
      fields: [
        { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 10 },
      ],
    };
    const usableTemplate = {
      id: "presentation-usable",
      vaultId: "vault-1",
      schemaTemplateId: "schema-1",
      name: "Usable Layout",
      source: '{{stat.hp display="plain"}}',
      formatVersion: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    const customPresentation = {
      ...usableTemplate,
      id: "builtin-presentation-custom-entity-local-stat-sheet:goblin-1",
      schemaTemplateId: "entity-local-stat-sheet:goblin-1",
      name: "Standard NPC / Monster Sheet",
      source: '{{stat.hp display="current-max"}}',
    };
    return {
      updateEntity: vi.fn(),
      schema,
      usableTemplate,
      customPresentation,
    };
  },
);

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { isGuest: false, updateEntity },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { confirm: vi.fn(), notify: vi.fn() },
}));

vi.mock("$lib/stores/stat-sheet-templates.svelte", () => ({
  statSheetTemplates: {
    allTemplates: [schema],
    availableTemplates: [schema],
    getDefaultPresentationTemplateId: () => null,
  },
}));

vi.mock("$lib/stores/presentation-templates.svelte", () => ({
  presentationTemplates: {
    availableTemplatesForSchema: (schemaId: string) =>
      schemaId.startsWith("entity-local-stat-sheet:")
        ? [customPresentation]
        : [usableTemplate],
  },
}));

import DetailStatsTab from "./DetailStatsTab.svelte";

function buildEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "goblin-1",
    type: "npc",
    title: "Goblin",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    statSheet: {
      templateId: "schema-1",
      fields: [
        { id: "hp", label: "Hit Points", type: "counter", value: 5, max: 10 },
      ],
    },
    ...overrides,
  } as Entity;
}

describe("DetailStatsTab presentation fallback (FR-010)", () => {
  it("falls back to StatSheetView when the entity's presentationTemplateId points at a missing template", () => {
    const entity = buildEntity({
      statSheet: {
        templateId: "schema-1",
        fields: [
          { id: "hp", label: "Hit Points", type: "counter", value: 5, max: 10 },
        ],
        presentationTemplateId: "does-not-exist",
      },
    });

    render(DetailStatsTab, { entity });

    expect(screen.getByTestId("stat-sheet-view")).toBeTruthy();
    expect(screen.queryByTestId("presentation-renderer")).toBeNull();
  });

  it("falls back to StatSheetView when the entity's schema no longer exists", () => {
    const entity = buildEntity({
      statSheet: {
        templateId: "missing-schema",
        fields: [{ id: "hp", label: "Hit Points", type: "counter", value: 5 }],
      },
    });

    render(DetailStatsTab, { entity });

    expect(screen.getByTestId("stat-sheet-view")).toBeTruthy();
    expect(screen.queryByTestId("presentation-renderer")).toBeNull();
  });

  it("offers presentation selection for a manually assembled stat sheet", () => {
    const entity = buildEntity({
      statSheet: {
        templateId: null,
        fields: [
          { id: "hp", label: "Hit Points", type: "counter", value: 5, max: 10 },
        ],
      },
    });

    render(DetailStatsTab, { entity });

    expect(screen.getByTestId("presentation-template-picker")).toBeTruthy();
    expect(
      screen.getByTestId("stat-sheet-open-presentation-templates"),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Standard NPC / Monster Sheet" }),
    ).toBeTruthy();
  });

  it("renders via PresentationRenderer when a valid presentation template resolves", () => {
    const entity = buildEntity({
      statSheet: {
        templateId: "schema-1",
        fields: [
          { id: "hp", label: "Hit Points", type: "counter", value: 5, max: 10 },
        ],
        presentationTemplateId: "presentation-usable",
      },
    });

    render(DetailStatsTab, { entity });

    expect(screen.getByTestId("presentation-renderer")).toBeTruthy();
    expect(screen.queryByTestId("stat-sheet-view")).toBeNull();
  });
});
