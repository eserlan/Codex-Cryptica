import { describe, expect, it, vi } from "vitest";
import type { PresentationTemplate, StatSheetTemplate } from "schema";
vi.mock("#lib/stores/presentation-templates.svelte.js", () => ({
  presentationTemplates: {},
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: {},
}));
import { importPresentationFile } from "./presentation-template-import";

const schema: StatSheetTemplate = {
  id: "schema",
  name: "Schema",
  isBuiltIn: false,
  fields: [{ id: "hp", label: "Health", type: "counter" }],
};
const imported = {
  schemaTemplateId: "original",
  name: "Layout",
  source: "{{stat.hp}}",
  formatVersion: 1,
};
const saved: PresentationTemplate = {
  ...imported,
  id: "saved",
  schemaTemplateId: schema.id,
  name: "Layout (2)",
  vaultId: "vault",
  isBuiltIn: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
function setup() {
  const saveTemplate = vi.fn().mockResolvedValue(saved);
  const uniqueNameForSchema = vi.fn().mockReturnValue("Layout (2)");
  const notify = vi.fn();
  const dependencies = {
    templates: { saveTemplate, uniqueNameForSchema },
    notifications: { notify },
  };
  const file = (value: unknown = imported) => ({
    text: async () => JSON.stringify(value),
  });
  return { saveTemplate, uniqueNameForSchema, notify, dependencies, file };
}

describe("importPresentationFile", () => {
  it("retargets the package and saves with a unique name and nullable description", async () => {
    const { file, dependencies, saveTemplate, uniqueNameForSchema, notify } =
      setup();
    expect(
      await importPresentationFile(file(), () => schema, dependencies),
    ).toBeNull();
    expect(uniqueNameForSchema).toHaveBeenCalledWith("Layout", schema.id);
    expect(saveTemplate).toHaveBeenCalledWith({
      ...imported,
      schemaTemplateId: schema.id,
      name: "Layout (2)",
      description: null,
    });
    expect(notify).toHaveBeenCalledWith(
      'Imported template "Layout (2)"',
      "success",
    );
  });

  it.each([
    [
      "<script>bad()</script>{{stat.hp}}",
      " (1 disallowed item removed)",
      "success",
    ],
    [
      "<script>a()</script><script>b()</script>{{stat.unknown}}",
      " (2 disallowed items removed) (Note: unmapped fields: unknown)",
      "info",
    ],
  ])(
    "reports sanitization and unmapped references (%s)",
    async (source, notice, level) => {
      const { file, dependencies, saveTemplate, notify } = setup();
      await importPresentationFile(
        file({ ...imported, source, description: "Description" }),
        () => schema,
        dependencies,
      );
      expect(saveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          source: source.includes("unknown")
            ? "{{stat.unknown}}"
            : "{{stat.hp}}",
          description: "Description",
        }),
      );
      expect(notify).toHaveBeenCalledWith(
        `Imported template "Layout (2)"${notice}`,
        level,
      );
    },
  );

  it("returns validation feedback without saving or notifying", async () => {
    const { file, dependencies, saveTemplate, notify } = setup();
    expect(
      await importPresentationFile(file({}), () => schema, dependencies),
    ).not.toBe("");
    expect(saveTemplate).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("returns the save failure when persistence returns null", async () => {
    const { file, dependencies, saveTemplate, notify } = setup();
    saveTemplate.mockResolvedValueOnce(null);
    expect(
      await importPresentationFile(file(), () => schema, dependencies),
    ).toBe("Failed to import template.");
    expect(notify).not.toHaveBeenCalled();
  });

  it.each(["parse", "read", "save"])(
    "returns inline feedback for a %s exception",
    async (failure) => {
      const { file, dependencies, saveTemplate, notify } = setup();
      let input = file();
      if (failure === "parse") input = { text: async () => "{" };
      if (failure === "read")
        input = {
          text: async () => {
            throw new Error("Read failed");
          },
        };
      if (failure === "save")
        saveTemplate.mockRejectedValueOnce(new Error("Disk full"));
      expect(
        await importPresentationFile(input, () => schema, dependencies),
      ).toBe("This file isn't a valid presentation template.");
      expect(notify).not.toHaveBeenCalled();
    },
  );

  it("resolves the active schema after the asynchronous read", async () => {
    const { dependencies, saveTemplate } = setup();
    let active = schema;
    const getSchema = vi.fn(() => active);
    let finishRead!: (value: string) => void;
    const importing = importPresentationFile(
      {
        text: () =>
          new Promise<string>((resolve) => {
            finishRead = resolve;
          }),
      },
      getSchema,
      dependencies,
    );
    expect(getSchema).not.toHaveBeenCalled();
    active = { ...schema, id: "new-schema" };
    finishRead(JSON.stringify(imported));
    await importing;
    expect(saveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ schemaTemplateId: "new-schema" }),
    );
  });
});
