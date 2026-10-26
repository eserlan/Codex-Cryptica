/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity, StatSheetTemplate } from "schema";

const { updateEntity, setDefaultPresentationTemplate, templatesForSchema } =
  vi.hoisted(() => ({
    updateEntity: vi.fn(),
    setDefaultPresentationTemplate: vi.fn(),
    templatesForSchema: [
      {
        id: "presentation-a",
        vaultId: "vault-1",
        schemaTemplateId: "schema-1",
        name: "Layout A",
        source: "{{stat.hp}}",
        formatVersion: 1,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      {
        id: "presentation-b",
        vaultId: "vault-1",
        schemaTemplateId: "schema-1",
        name: "Layout B",
        source: "{{stat.hp}}",
        formatVersion: 1,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      {
        id: "presentation-other-schema",
        vaultId: "vault-1",
        schemaTemplateId: "schema-2",
        name: "Layout for a different schema",
        source: "{{stat.hp}}",
        formatVersion: 1,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
  }));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { isGuest: false, updateEntity },
}));

vi.mock("$lib/stores/stat-sheet-templates.svelte", () => ({
  statSheetTemplates: {
    getDefaultPresentationTemplateId: () => null,
    setDefaultPresentationTemplate,
  },
}));

vi.mock("$lib/stores/presentation-templates.svelte", () => ({
  presentationTemplates: {
    availableTemplatesForSchema: (schemaId: string) =>
      templatesForSchema.filter((t) => t.schemaTemplateId === schemaId),
  },
}));

import PresentationTemplatePicker from "./PresentationTemplatePicker.svelte";

const schema: StatSheetTemplate = {
  id: "schema-1",
  name: "Test Schema",
  isBuiltIn: true,
  fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
};

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
      fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
    },
    ...overrides,
  } as Entity;
}

describe("PresentationTemplatePicker", () => {
  it("offers only templates exact-matching the entity's schema", () => {
    render(PresentationTemplatePicker, { entity: buildEntity(), schema });

    const select = screen.getByTestId("presentation-template-select");
    const optionLabels = Array.from(select.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(optionLabels.some((t) => t?.includes("Layout A"))).toBe(true);
    expect(optionLabels.some((t) => t?.includes("Layout B"))).toBe(true);
    expect(optionLabels.some((t) => t?.includes("different schema"))).toBe(
      false,
    );
  });

  it("lists all compatible templates independently selectable, and switching updates the entity override", async () => {
    render(PresentationTemplatePicker, { entity: buildEntity(), schema });

    const select = screen.getByTestId(
      "presentation-template-select",
    ) as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "presentation-b" } });

    expect(updateEntity).toHaveBeenCalledWith("goblin-1", {
      statSheet: {
        templateId: "schema-1",
        fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
        presentationTemplateId: "presentation-b",
      },
    });
  });

  it("does not alter underlying statSheet field values when switching templates", async () => {
    const entity = buildEntity({
      statSheet: {
        templateId: "schema-1",
        fields: [{ id: "hp", label: "Hit Points", type: "counter", value: 7 }],
      },
    });
    render(PresentationTemplatePicker, { entity, schema });

    const select = screen.getByTestId(
      "presentation-template-select",
    ) as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "presentation-a" } });

    expect(updateEntity).toHaveBeenCalledWith("goblin-1", {
      statSheet: {
        templateId: "schema-1",
        fields: [{ id: "hp", label: "Hit Points", type: "counter", value: 7 }],
        presentationTemplateId: "presentation-a",
      },
    });
  });
});
