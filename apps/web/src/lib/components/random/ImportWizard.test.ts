import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import ImportWizard from "./ImportWizard.svelte";

describe("ImportWizard", () => {
  it("renders the styled choose file button and initial dropzone", () => {
    render(ImportWizard, {
      props: {
        kind: "table",
        onImport: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(screen.getByText("Choose file")).toBeDefined();
    expect(screen.getByText("Drag and drop your file here")).toBeDefined();
    expect(screen.getByTestId("import-file-dropzone")).toBeDefined();
    expect(screen.getByTestId("import-file")).toBeDefined();
  });

  it("updates the selected file label and previews content when a file is dropped", async () => {
    render(ImportWizard, {
      props: {
        kind: "table",
        onImport: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    const dropzone = screen.getByTestId("import-file-dropzone");
    const testFile = new File(
      ["01-05\tGoblin scout\n06-10\tDire wolf"],
      "dungeon-encounters.tsv",
      { type: "text/tab-separated-values" },
    );

    await fireEvent.dragOver(dropzone, {
      dataTransfer: { types: ["Files"] },
    });
    await fireEvent.drop(dropzone, {
      dataTransfer: { files: [testFile] },
    });

    expect(await screen.findByTestId("import-file-selected")).toBeDefined();
    expect(screen.getByTestId("import-file-selected").textContent).toContain(
      "dungeon-encounters.tsv",
    );
  });

  it("allows clearing a selected file", async () => {
    render(ImportWizard, {
      props: {
        kind: "table",
        onImport: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    const fileInput = screen.getByTestId("import-file");
    const testFile = new File(
      ["01-05\tGoblin scout\n06-10\tDire wolf"],
      "encounters.tsv",
      { type: "text/tab-separated-values" },
    );

    await fireEvent.change(fileInput, {
      target: { files: [testFile] },
    });

    const clearBtn = await screen.findByTestId("import-file-clear");
    await fireEvent.click(clearBtn);

    expect(screen.queryByTestId("import-file-selected")).toBeNull();
    expect(screen.getByText("Drag and drop your file here")).toBeDefined();
  });

  it("allows pasting entries directly and calls onImport on confirm", async () => {
    const onImport = vi.fn();
    render(ImportWizard, {
      props: {
        kind: "table",
        onImport,
        onCancel: vi.fn(),
      },
    });

    const nameInput = screen.getByTestId("import-name");
    await fireEvent.input(nameInput, { target: { value: "Wilderness Table" } });

    const pasteInput = screen.getByTestId("import-paste");
    await fireEvent.input(pasteInput, {
      target: { value: "01-05\tGoblin scout\n06-10\tDire wolf" },
    });

    const confirmBtn = screen.getByTestId("import-confirm");
    await fireEvent.click(confirmBtn);

    expect(onImport).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Wilderness Table",
        kind: "table",
      }),
    );
  });
});
