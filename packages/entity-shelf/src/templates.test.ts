import { describe, expect, it } from "vitest";
import type { PresentationTemplate, StatSheetTemplate } from "schema";
import { decideTemplate } from "./templates";

function schemaTemplate(
  overrides: Partial<StatSheetTemplate> = {},
): StatSheetTemplate {
  return {
    id: "tpl-monster",
    name: "Monster",
    fields: [{ id: "hp", label: "HP", type: "number" }],
    ...overrides,
  } as StatSheetTemplate;
}

function presentationTemplate(
  overrides: Partial<PresentationTemplate> = {},
): PresentationTemplate {
  return {
    id: "pres-monster",
    vaultId: "vault-a",
    schemaTemplateId: "tpl-monster",
    name: "Monster Sheet",
    description: null,
    source: "# {{name}}",
    formatVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as PresentationTemplate;
}

describe("decideTemplate — schema templates", () => {
  it("brings in a template the target vault has never seen (FR-015)", () => {
    const decision = decideTemplate({
      flavour: "schema",
      incoming: schemaTemplate(),
      existing: null,
    });
    expect(decision.kind).toBe("bring-in");
    expect(decision.unresolved).toBe(false);
  });

  it("reuses an identical existing template silently, with no prompt (FR-015)", () => {
    const decision = decideTemplate({
      flavour: "schema",
      incoming: schemaTemplate(),
      existing: schemaTemplate(),
    });
    expect(decision.kind).toBe("reuse-existing");
    expect(decision.unresolved).toBe(false);
  });

  it("treats templates differing only in vault-scoped bookkeeping as identical (research R6)", () => {
    // Comparing raw stored records would flag a conflict on every single
    // import, turning a rare decision into a nuisance authors click through.
    const decision = decideTemplate({
      flavour: "schema",
      incoming: schemaTemplate(),
      existing: {
        ...schemaTemplate(),
        vaultId: "vault-b",
      } as StatSheetTemplate,
    });
    expect(decision.kind).toBe("reuse-existing");
  });

  it("raises a conflict when the same id holds genuinely different content (FR-016)", () => {
    const decision = decideTemplate({
      flavour: "schema",
      incoming: schemaTemplate(),
      existing: schemaTemplate({
        fields: [{ id: "ac", label: "AC", type: "number" }],
      } as Partial<StatSheetTemplate>),
    });
    expect(decision.kind).toBe("conflict-keep-existing");
    expect(decision.unresolved).toBe(true);
  });
});

describe("decideTemplate — presentation templates", () => {
  it("ignores vaultId and timestamps when comparing (research R6)", () => {
    const decision = decideTemplate({
      flavour: "presentation",
      incoming: presentationTemplate(),
      existing: presentationTemplate({
        vaultId: "vault-b",
        createdAt: "2026-08-12T00:00:00.000Z",
        updatedAt: "2026-08-12T00:00:00.000Z",
      }),
    });
    expect(decision.kind).toBe("reuse-existing");
  });

  it("raises a conflict when the rendered source differs", () => {
    const decision = decideTemplate({
      flavour: "presentation",
      incoming: presentationTemplate(),
      existing: presentationTemplate({ source: "# something else" }),
    });
    expect(decision.kind).toBe("conflict-keep-existing");
    expect(decision.unresolved).toBe(true);
  });
});
