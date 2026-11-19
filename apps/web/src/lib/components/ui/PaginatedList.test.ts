import { createRawSnippet } from "svelte";
import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { assertBoundedPerformance } from "../../test-utils/pr-guardrails";
import PaginatedList from "./PaginatedList.svelte";

const rowSnippet = createRawSnippet<[string, number]>((getItem, getIndex) => ({
  render: () => `<li data-index="${getIndex()}">${getItem()}</li>`,
}));

describe("PaginatedList", () => {
  it("renders a single page without pagination controls when items fit on one page", () => {
    const { getAllByRole, queryByRole } = render(PaginatedList<string>, {
      items: ["Alpha", "Beta"],
      pageSize: 10,
      itemLabel: "entries",
      row: rowSnippet,
    });

    expect(getAllByRole("listitem")).toHaveLength(2);
    expect(queryByRole("button", { name: /Previous/i })).toBeNull();
    expect(queryByRole("button", { name: /Next/i })).toBeNull();
  });

  it("navigates across pages and disables boundary buttons appropriately", async () => {
    const { getAllByRole, getByRole, getByText } = render(
      PaginatedList<string>,
      {
        items: ["A", "B", "C", "D", "E"],
        pageSize: 2,
        itemLabel: "creatures",
        row: rowSnippet,
      },
    );

    expect(getByText("Showing 1–2 of 5 creatures")).toBeTruthy();
    expect(getAllByRole("listitem").map((el) => el.textContent)).toEqual([
      "A",
      "B",
    ]);

    const prev = getByRole("button", {
      name: "Previous creatures",
    }) as HTMLButtonElement;
    const next = getByRole("button", {
      name: "Next creatures",
    }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    await fireEvent.click(next);
    expect(getByText("Showing 3–4 of 5 creatures")).toBeTruthy();
    expect(getAllByRole("listitem").map((el) => el.textContent)).toEqual([
      "C",
      "D",
    ]);
    expect(prev.disabled).toBe(false);

    await fireEvent.click(next);
    expect(getByText("Showing 5–5 of 5 creatures")).toBeTruthy();
    expect(getAllByRole("listitem").map((el) => el.textContent)).toEqual(["E"]);
    expect(next.disabled).toBe(true);
  });

  it("clamps the active page when items shrink and renders nothing when empty", async () => {
    const { rerender, getAllByRole, queryByRole } = render(
      PaginatedList<string>,
      {
        items: ["1", "2", "3", "4"],
        pageSize: 2,
        page: 1,
        itemLabel: "rows",
        row: rowSnippet,
      },
    );

    expect(getAllByRole("listitem").map((el) => el.textContent)).toEqual([
      "3",
      "4",
    ]);

    await rerender({
      items: ["1"],
      pageSize: 2,
      page: 1,
      itemLabel: "rows",
      row: rowSnippet,
    });
    expect(getAllByRole("listitem").map((el) => el.textContent)).toEqual(["1"]);

    await rerender({
      items: [],
      pageSize: 2,
      page: 0,
      itemLabel: "rows",
      row: rowSnippet,
    });
    expect(queryByRole("list")).toBeNull();
  });

  it("mounts only one bounded page for a 10,000-item list within budget", () => {
    const items = Array.from({ length: 10_000 }, (_, i) => `Item ${i + 1}`);
    const rendered = assertBoundedPerformance(
      "PaginatedList 10k items",
      () =>
        render(PaginatedList<string>, {
          items,
          pageSize: 20,
          itemLabel: "entries",
          row: rowSnippet,
        }),
      250,
    );

    expect(rendered.getAllByRole("listitem")).toHaveLength(20);
    expect(rendered.getByText("Showing 1–20 of 10000 entries")).toBeTruthy();
  });
});
