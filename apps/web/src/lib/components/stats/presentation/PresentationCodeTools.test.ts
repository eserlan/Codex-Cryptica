/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import PresentationCodeTools from "./PresentationCodeTools.svelte";
const schema = {
  id: "s",
  name: "Sheet",
  isBuiltIn: false,
  fields: [
    { id: "health-id", key: "hp", label: "Health", type: "counter" as const },
    { id: "name", label: "Name", type: "text" as const },
  ],
};

function setup() {
  const onInsert = vi.fn();
  const onGenerate = vi.fn();
  return {
    ...render(PresentationCodeTools, {
      schema,
      active: true,
      onInsert,
      onGenerate,
    }),
    onInsert,
    onGenerate,
  };
}

describe("PresentationCodeTools", () => {
  it.each([
    ["Insert Card Container", ":::card\n\n:::", 9],
    ["Insert 2 Column Grid", ":::stat-group columns=2\n\n:::", 24],
    ["Insert 3 Column Grid", ":::stat-group columns=3\n\n:::", 24],
    ["Insert Row Container", ":::row\n\n:::", 8],
    [
      "Insert Markdown Table",
      "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |",
      0,
    ],
  ])(
    "inserts %s with its original cursor offset",
    async (title, snippet, offset) => {
      const { onInsert } = setup();
      await fireEvent.click(screen.getByTitle(title as string));
      expect(onInsert).toHaveBeenCalledWith(snippet, offset);
    },
  );

  it("delegates starter generation", async () => {
    const { onGenerate } = setup();
    await fireEvent.click(
      screen.getByTestId("presentation-editor-auto-layout"),
    );
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("matches keys, ids and labels ignoring case, inserts the key, and clears the filter", async () => {
    const { onInsert } = setup();
    await fireEvent.click(
      screen.getByTestId("presentation-editor-insert-field"),
    );
    for (const filter of ["HP", "HEALTH-ID", "HeAlTh"]) {
      await fireEvent.input(screen.getByPlaceholderText("Filter fields..."), {
        target: { value: filter },
      });
      expect(
        screen.getAllByTestId("presentation-editor-autocomplete-option"),
      ).toHaveLength(1);
    }
    await fireEvent.click(
      screen.getByTestId("presentation-editor-autocomplete-option"),
    );
    expect(onInsert).toHaveBeenCalledWith("{{stat.hp}}");
    expect(screen.queryByTestId("presentation-editor-autocomplete")).toBeNull();
    await fireEvent.click(
      screen.getByTestId("presentation-editor-insert-field"),
    );
    expect(
      (screen.getByPlaceholderText("Filter fields...") as HTMLInputElement)
        .value,
    ).toBe("");
    expect(
      screen.getAllByTestId("presentation-editor-autocomplete-option"),
    ).toHaveLength(2);
  });

  it("shows no unmatched candidates and keeps its filter across mode switches", async () => {
    const { rerender, onInsert } = setup();
    await fireEvent.click(
      screen.getByTestId("presentation-editor-insert-field"),
    );
    await fireEvent.input(screen.getByPlaceholderText("Filter fields..."), {
      target: { value: "missing" },
    });
    expect(
      screen.queryByTestId("presentation-editor-autocomplete-option"),
    ).toBeNull();
    await rerender({ active: false });
    expect(screen.queryByTestId("presentation-editor-autocomplete")).toBeNull();
    await rerender({ active: true });
    expect(
      (screen.getByPlaceholderText("Filter fields...") as HTMLInputElement)
        .value,
    ).toBe("missing");
    expect(onInsert).not.toHaveBeenCalled();
  });
});
