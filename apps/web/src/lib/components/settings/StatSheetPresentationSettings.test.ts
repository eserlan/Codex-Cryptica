/** @vitest-environment jsdom */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  schemas,
  layouts,
  statStore,
  saveTemplate,
  deleteTemplate,
  exportTemplate,
  notify,
  confirm,
  modalUIStore,
} = vi.hoisted(() => {
  const schemas = [
    { id: "schema-1", name: "First Schema", isBuiltIn: false, fields: [] },
    { id: "schema-2", name: "Second Schema", isBuiltIn: false, fields: [] },
  ];
  const layouts = [
    {
      id: "custom",
      schemaTemplateId: "schema-1",
      name: "Custom Layout",
      source: "# Layout",
      formatVersion: 1,
      isBuiltIn: false,
    },
    {
      id: "builtin",
      schemaTemplateId: "schema-1",
      name: "Built-in Layout",
      source: "# Built-in",
      formatVersion: 1,
      isBuiltIn: true,
    },
  ];
  return {
    schemas,
    layouts,
    statStore: {
      availableTemplates: schemas,
      getDefaultPresentationTemplateId: () => "custom",
    },
    saveTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    exportTemplate: vi.fn(),
    notify: vi.fn(),
    confirm: vi.fn(),
    modalUIStore: {
      presentationEditorState: { open: false } as Record<string, unknown>,
    },
  };
});
vi.mock("#lib/stores/stat-sheet-templates.svelte.js", () => ({
  statSheetTemplates: statStore,
}));
vi.mock("#lib/stores/presentation-templates.svelte.js", () => ({
  presentationTemplates: {
    availableTemplatesForSchema: (id: string) =>
      layouts.filter((layout) => layout.schemaTemplateId === id),
    generatedLayoutsForSchema: () => [],
    uniqueNameForSchema: (name: string) => name,
    saveTemplate,
    deleteTemplate,
    exportTemplate,
  },
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { notify, confirm },
}));
vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({ modalUIStore }));
import StatSheetPresentationSettings from "./StatSheetPresentationSettings.svelte";

function layoutRow(name: string) {
  return within(
    screen
      .getByText(name)
      .closest('[data-testid="presentation-template-row"]') as HTMLElement,
  );
}
function importInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe("StatSheetPresentationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statStore.availableTemplates = schemas;
    confirm.mockResolvedValue(true);
    saveTemplate.mockResolvedValue({ name: "Imported" });
    modalUIStore.presentationEditorState = { open: false };
  });

  it("shows the default schema's layouts and switches to an empty schema", async () => {
    render(StatSheetPresentationSettings);
    expect(screen.getByText("Default")).toBeTruthy();
    expect(layoutRow("Built-in Layout").getByText("Built-in")).toBeTruthy();
    await fireEvent.change(
      screen.getByLabelText("Select schema to manage presentation templates"),
      { target: { value: "schema-2" } },
    );
    expect(
      screen.getByText("No layout templates found for this schema."),
    ).toBeTruthy();
    expect(screen.queryByText("Custom Layout")).toBeNull();
    await fireEvent.click(screen.getByTestId("presentation-manager-new"));
    expect(modalUIStore.presentationEditorState).toEqual({
      open: true,
      schema: schemas[1],
      template: null,
      duplicate: false,
    });
  });

  it("opens create, edit, and duplicate flows with the right editor state", async () => {
    render(StatSheetPresentationSettings);
    await fireEvent.click(screen.getByTestId("presentation-manager-new"));
    expect(modalUIStore.presentationEditorState).toEqual({
      open: true,
      schema: schemas[0],
      template: null,
      duplicate: false,
    });
    await fireEvent.click(screen.getByTestId("presentation-manager-edit"));
    expect(modalUIStore.presentationEditorState.template).toBe(layouts[0]);
    expect(modalUIStore.presentationEditorState.duplicate).toBe(false);
    await fireEvent.click(screen.getByTestId("presentation-manager-duplicate"));
    expect(modalUIStore.presentationEditorState.template).toBe(layouts[1]);
    expect(modalUIStore.presentationEditorState.duplicate).toBe(true);
  });

  it("exports a layout and confirms before deleting", async () => {
    render(StatSheetPresentationSettings);
    await fireEvent.click(screen.getByLabelText("Export Custom Layout"));
    expect(exportTemplate).toHaveBeenCalledWith(layouts[0]);
    expect(notify).toHaveBeenCalledWith('Exported "Custom Layout"', "info");
    await fireEvent.click(screen.getByTestId("presentation-manager-delete"));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ isDangerous: true }),
    );
    expect(deleteTemplate).toHaveBeenCalledWith("custom");
  });

  it("keeps the layout when deletion is cancelled", async () => {
    confirm.mockResolvedValueOnce(false);
    render(StatSheetPresentationSettings);
    await fireEvent.click(screen.getByTestId("presentation-manager-delete"));
    expect(deleteTemplate).not.toHaveBeenCalled();
  });

  it("imports a file and resets its input for importing it again", async () => {
    const { container } = render(StatSheetPresentationSettings);
    const input = importInput(container);
    await fireEvent.change(input, {
      target: {
        files: [
          {
            text: async () =>
              JSON.stringify({
                name: "Imported",
                source: "# Imported",
                formatVersion: 1,
                schemaTemplateId: "original",
              }),
          },
        ],
      },
    });
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'Imported template "Imported"',
        "success",
      ),
    );
    expect(saveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ schemaTemplateId: "schema-1" }),
    );
    expect(input.value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows import errors, clears them on retry, and ignores file cancellation", async () => {
    const { container } = render(StatSheetPresentationSettings);
    const input = importInput(container);
    await fireEvent.change(input, {
      target: { files: [{ text: async () => "{" }] },
    });
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "This file isn't a valid presentation template.",
      ),
    );
    const click = vi.spyOn(input, "click");
    await fireEvent.click(screen.getByTestId("presentation-manager-import"));
    expect(click).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).toBeNull();
    await fireEvent.change(input, { target: { files: [] } });
    expect(saveTemplate).not.toHaveBeenCalled();
  });

  it("does not open an editor or import without any available schema", async () => {
    statStore.availableTemplates = [];
    const { container } = render(StatSheetPresentationSettings);
    await fireEvent.click(screen.getByTestId("presentation-manager-new"));
    await fireEvent.change(importInput(container), {
      target: { files: [{ text: vi.fn() }] },
    });
    expect(modalUIStore.presentationEditorState.open).toBe(false);
    expect(saveTemplate).not.toHaveBeenCalled();
  });
  it("keeps a newer import error when an earlier import succeeds later", async () => {
    let finishSave!: (value: { name: string }) => void;
    saveTemplate.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    const { container } = render(StatSheetPresentationSettings);
    const input = importInput(container);
    await fireEvent.change(input, {
      target: {
        files: [
          {
            text: async () =>
              JSON.stringify({
                name: "Pending",
                schemaTemplateId: "schema-1",
                source: "# Pending",
                formatVersion: 1,
              }),
          },
        ],
      },
    });
    await waitFor(() => expect(saveTemplate).toHaveBeenCalledOnce());
    await fireEvent.change(input, {
      target: { files: [{ text: async () => "{" }] },
    });
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    finishSave({ name: "Pending" });
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'Imported template "Pending"',
        "success",
      ),
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "This file isn't a valid presentation template.",
    );
  });
});
