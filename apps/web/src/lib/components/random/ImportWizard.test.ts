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

  describe("deck import", () => {
    function renderDeck(onImport = vi.fn()) {
      render(ImportWizard, {
        props: { kind: "deck", onImport, onCancel: vi.fn() },
      });
      return onImport;
    }

    it("is a card view, not the table view", () => {
      renderDeck();

      expect(screen.getByText("Import a deck")).toBeDefined();
      expect(screen.getByText("Paste your cards")).toBeDefined();
      expect(
        screen.getByText("Drag a file, or a folder of card art, here"),
      ).toBeDefined();
      // Table-only controls have no meaning for a deck.
      expect(screen.queryByTestId("import-format-delimited")).toBeNull();
    });

    it("edits a pasted card as a name and a meaning", async () => {
      renderDeck();

      await fireEvent.input(screen.getByTestId("import-paste"), {
        target: { value: "The Tower\tSudden ruin." },
      });

      const titles = screen.getAllByTestId("import-row-title");
      const bodies = screen.getAllByTestId("import-row-body");
      expect((titles[0] as HTMLInputElement).value).toBe("The Tower");
      expect((bodies[0] as HTMLInputElement).value).toBe("Sudden ruin.");
      expect(screen.queryByTestId("import-row-text")).toBeNull();
    });

    it("matches chosen pictures to cards and reports the leftovers", async () => {
      renderDeck();

      await fireEvent.input(screen.getByTestId("import-paste"), {
        target: { value: "The Tower\nThe Star" },
      });
      await fireEvent.change(screen.getByTestId("import-file"), {
        target: {
          files: [
            new File(["x"], "the-tower.png", { type: "image/png" }),
            new File(["x"], "holiday.png", { type: "image/png" }),
          ],
        },
      });

      expect(
        (await screen.findByTestId("import-image-match")).textContent,
      ).toContain("1 of 2 matched a card");
      expect(
        screen.getByTestId("import-images-unmatched").textContent,
      ).toContain("holiday.png");
    });

    it("makes cards out of the pictures nothing claimed", async () => {
      renderDeck();

      await fireEvent.input(screen.getByTestId("import-paste"), {
        target: { value: "The Tower" },
      });
      await fireEvent.change(screen.getByTestId("import-file"), {
        target: {
          files: [new File(["x"], "the-star.png", { type: "image/png" })],
        },
      });

      await fireEvent.click(
        await screen.findByTestId("import-images-make-cards"),
      );

      const titles = screen.getAllByTestId("import-row-title");
      expect(titles.map((el) => (el as HTMLInputElement).value)).toEqual([
        "The Tower",
        "The Star",
      ]);
    });

    it("imports a deck of cards", async () => {
      const onImport = renderDeck();

      await fireEvent.input(screen.getByTestId("import-name"), {
        target: { value: "Major Arcana" },
      });
      await fireEvent.input(screen.getByTestId("import-paste"), {
        target: { value: "The Tower\tSudden ruin.\nThe Star\tHope." },
      });
      await fireEvent.click(screen.getByTestId("import-confirm"));

      expect(onImport).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Major Arcana", kind: "deck" }),
      );
      expect(onImport.mock.calls[0][0].cards).toEqual([
        expect.objectContaining({ title: "The Tower", body: "Sudden ruin." }),
        expect.objectContaining({ title: "The Star", body: "Hope." }),
      ]);
    });
  });
});
