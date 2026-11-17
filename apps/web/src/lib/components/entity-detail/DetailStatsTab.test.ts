/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity, StatSheetTemplate } from "schema";

const {
  updateEntity,
  bulkUpdate,
  schema,
  usableTemplate,
  customPresentation,
  perCharacterTemplate,
} = vi.hoisted(() => {
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
  // Lays out a field the character carries but the shared stat template
  // does not — the Mythras/BRP "this one has Cow Milking" case.
  const perCharacterTemplate = {
    ...usableTemplate,
    id: "presentation-per-character",
    source: '{{stat.cow_milking display="plain"}}',
  };
  return {
    updateEntity: vi.fn(),
    bulkUpdate: vi.fn(),
    schema,
    usableTemplate,
    customPresentation,
    perCharacterTemplate,
  };
});

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { isGuest: false, allEntities: [], updateEntity, bulkUpdate },
}));

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { confirm: vi.fn(), notify: vi.fn() },
}));

vi.mock("#lib/stores/stat-sheet-templates.svelte.js", () => ({
  statSheetTemplates: {
    categoryDefaults: {},
    allTemplates: [schema],
    availableTemplates: [schema],
    getDefaultPresentationTemplateId: () => null,
  },
}));

vi.mock("#lib/stores/presentation-templates.svelte.js", () => ({
  presentationTemplates: {
    availableTemplatesForSchema: (schemaId: string) =>
      schemaId.startsWith("entity-local-stat-sheet:")
        ? [customPresentation]
        : [usableTemplate, perCharacterTemplate],
  },
}));

import { EntitySchema } from "schema";
import { previewSpecies } from "@codex/stat-sheet-engine";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
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

  it("lays out a field the character has but its stat template does not", () => {
    // Systems like Mythras/BRP/WFRP give each character its own skills, so a
    // bound stat template is only the starting sheet. Before the schema
    // unioned in the entity's own fields, this rendered "(missing field)".
    const entity = buildEntity({
      statSheet: {
        templateId: "schema-1",
        fields: [
          { id: "hp", label: "Hit Points", type: "counter", value: 5, max: 10 },
          {
            id: "cow_milking",
            label: "Cow Milking",
            type: "number",
            value: 62,
          },
        ],
        presentationTemplateId: "presentation-per-character",
      },
    });

    render(DetailStatsTab, { entity });

    expect(screen.getByTestId("presentation-renderer")).toBeTruthy();
    expect(screen.queryByText(/missing field/i)).toBeNull();
    expect(screen.getByTestId("presentation-field-number")).toBeTruthy();
    expect((screen.getByRole("spinbutton") as HTMLInputElement).value).toBe(
      "62",
    );
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

describe("species across sheet layouts", () => {
  it("retains traits outside the custom presentation and sheet clearing", async () => {
    const source = EntitySchema.parse({
      id: "k",
      title: "Kethari",
      type: "creature",
      speciesDefinition: {
        kind: "species",
        version: 1,
        traits: [
          {
            id: "power",
            name: "Powerful",
            description: "Strong",
            adjustments: [{ key: "strength", amount: 2 }],
          },
        ],
      },
    });
    const base = buildEntity({
      statSheet: {
        templateId: "schema-1",
        presentationTemplateId: "presentation-per-character",
        fields: [
          {
            id: "cow_milking",
            key: "strength",
            label: "Might",
            type: "number",
            value: 10,
          },
        ],
      },
    });
    const entity = { ...base, appliedSpecies: previewSpecies(base, source) };
    updateEntity.mockClear();
    const view = render(DetailStatsTab, { entity });
    expect(screen.getByTestId("presentation-renderer")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Choose Species/Ancestry" }),
    ).toBeTruthy();
    expect(screen.getByText("Powerful")).toBeTruthy();
    expect(screen.getAllByText(/Base 10; Effective 12/)).toHaveLength(2);
    expect(updateEntity).not.toHaveBeenCalled();
    vi.mocked(notificationStore.confirm).mockResolvedValueOnce(true);
    await fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(updateEntity).toHaveBeenLastCalledWith(entity.id, {
      statSheet: { templateId: null, fields: [], presentationTemplateId: null },
    });
    await view.rerender({ entity: { ...entity, statSheet: { fields: [] } } });
    expect(screen.getByText("Powerful")).toBeTruthy();
    expect(screen.getByText(/Bound field is unavailable/)).toBeTruthy();
  });
});

describe("species editing boundaries", () => {
  beforeEach(() => {
    bulkUpdate.mockReset();
  });
  it("discards an authoring draft when navigating to another Creature", async () => {
    const first = buildEntity({
      id: "first",
      type: "creature",
      statSheet: { fields: [] },
    });
    const view = render(DetailStatsTab, { entity: first });
    await fireEvent.click(
      screen.getByRole("button", { name: "Designate Species/Ancestry" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: "Add trait" }));
    await fireEvent.input(screen.getByLabelText("Trait name 1"), {
      target: { value: "First's trait" },
    });
    await view.rerender({
      entity: { ...first, id: "second", title: "Second" },
    });
    expect(screen.queryByLabelText("Trait name 1")).toBeNull();
    expect(bulkUpdate).not.toHaveBeenCalled();
  });

  it("disables base edits during staged selection persistence and restores focus", async () => {
    const source = EntitySchema.parse({
      id: "k",
      title: "Kethari",
      type: "creature",
      speciesDefinition: { kind: "species", version: 1, traits: [] },
    });
    const base = buildEntity({
      statSheet: {
        fields: [
          {
            id: "a",
            key: "strength",
            label: "Might",
            type: "number",
            value: 10,
          },
        ],
      },
    });
    const entity = { ...base, appliedSpecies: previewSpecies(base, source) };
    let finish!: (result: { succeededIds: string[] }) => void;
    bulkUpdate.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(DetailStatsTab, { entity });
    await fireEvent.click(
      screen.getByRole("button", { name: "Choose Species/Ancestry" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm species selection" }),
    );
    expect(
      screen.getByRole("spinbutton", { name: "Might" }).matches(":disabled"),
    ).toBe(true);
    expect(bulkUpdate).toHaveBeenCalledWith({
      [entity.id]: { appliedSpecies: undefined },
    });
    expect(entity.statSheet!.fields[0].value).toBe(10);
    finish({ succeededIds: [entity.id] });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByRole("spinbutton", { name: "Might" }).matches(":disabled"),
    ).toBe(false);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Choose Species/Ancestry" }),
    );
  });
});
