/** @vitest-environment jsdom */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listEntityTemplates, goto } = vi.hoisted(() => ({
  listEntityTemplates: vi.fn(),
  goto: vi.fn(),
}));

vi.mock("$app/navigation", () => ({ goto }));
vi.mock("$app/paths", () => ({ resolve: (p: string) => p }));
vi.mock(
  "$lib/services/publishing/PublicEntityTemplateDirectoryService",
  () => ({
    publicEntityTemplateDirectoryService: { listEntityTemplates },
  }),
);

import EntityTemplateBrowse from "./EntityTemplateBrowse.svelte";

const listing = (id: string, over: object = {}) => ({
  schemaVersion: 1,
  templateKind: "entity",
  listingId: id,
  title: `Template ${id}`,
  description: `About ${id}`,
  entityType: "location",
  labels: ["Fantasy"],
  packageVersion: 1,
  status: "active",
  listingCreatedAt: "2026-01-01T00:00:00.000Z",
  listingUpdatedAt: "2026-03-05T00:00:00.000Z",
  ...over,
});

const page = (results: any[], types: any[] = [], nextCursor?: string) => ({
  results,
  facets: { entityTypes: types },
  nextCursor,
});

beforeEach(() => {
  listEntityTemplates.mockReset();
  goto.mockReset();
});

describe("EntityTemplateBrowse", () => {
  it("shows cards with name, description, type, labels, display name and date", async () => {
    listEntityTemplates.mockResolvedValue(
      page(
        [listing("a", { ownerDisplayName: "Ada", entityType: "faction" })],
        [{ value: "faction", count: 1 }],
      ),
    );
    render(EntityTemplateBrowse);
    expect(await screen.findByText("Template a")).toBeTruthy();
    expect(screen.getByText("About a")).toBeTruthy();
    expect(screen.getByText("by Ada")).toBeTruthy();
    expect(screen.getByText("Faction", { selector: "span" })).toBeTruthy();
    expect(screen.getByText("Fantasy")).toBeTruthy();
    expect(screen.getByText(/Updated/)).toBeTruthy();
  });

  it("lists built-in types first, then other types from listings", async () => {
    listEntityTemplates.mockResolvedValue(
      page(
        [listing("a")],
        [
          { value: "zebra-clan", count: 1 },
          { value: "location", count: 2 },
          { value: "character", count: 3 },
          { value: "aardvark", count: 1 },
        ],
      ),
    );
    render(EntityTemplateBrowse);
    await screen.findByText("Template a");
    const select = screen.getByLabelText("Entity type");
    const options = within(select)
      .getAllByRole("option")
      .map((o) => o.getAttribute("value"));
    expect(options).toEqual([
      "",
      "character",
      "location",
      "aardvark",
      "zebra-clan",
    ]);
  });

  it("filters by type and labels and searches, then clears the filters", async () => {
    listEntityTemplates.mockResolvedValue(
      page([listing("a")], [{ value: "location", count: 1 }]),
    );
    render(EntityTemplateBrowse);
    await screen.findByText("Template a");

    await fireEvent.change(screen.getByLabelText("Entity type"), {
      target: { value: "location" },
    });
    await waitFor(() =>
      expect(listEntityTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({ entityType: "location" }),
      ),
    );

    await fireEvent.input(screen.getByLabelText("Labels"), {
      target: { value: "Fantasy, Dark" },
    });
    await fireEvent.input(screen.getByLabelText("Search templates"), {
      target: { value: "guild" },
    });
    await fireEvent.click(screen.getByText("Search"));
    await waitFor(() =>
      expect(listEntityTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          q: "guild",
          entityType: "location",
          labels: ["Fantasy", "Dark"],
        }),
      ),
    );

    await fireEvent.click(screen.getByText("Clear filters"));
    await waitFor(() =>
      expect(listEntityTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          q: undefined,
          entityType: undefined,
          labels: undefined,
        }),
      ),
    );
  });

  it("shows an empty state that keeps the query and filters", async () => {
    listEntityTemplates.mockResolvedValue(page([]));
    render(EntityTemplateBrowse);
    expect(
      await screen.findByText("No community templates match those filters."),
    ).toBeTruthy();
    await fireEvent.input(screen.getByLabelText("Search templates"), {
      target: { value: "zzz" },
    });
    await fireEvent.click(screen.getByText("Search"));
    await screen.findByText("No community templates match those filters.");
    expect(
      (screen.getByLabelText("Search templates") as HTMLInputElement).value,
    ).toBe("zzz");
  });

  it("shows a retryable error", async () => {
    listEntityTemplates.mockRejectedValueOnce(
      new Error("Couldn't reach the template directory."),
    );
    listEntityTemplates.mockResolvedValueOnce(page([listing("a")]));
    render(EntityTemplateBrowse);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen.getByText("Couldn't reach the template directory."),
    ).toBeTruthy();
    await fireEvent.click(screen.getByText("Try again"));
    expect(await screen.findByText("Template a")).toBeTruthy();
  });

  it("loads more results and opens a listing", async () => {
    listEntityTemplates.mockResolvedValueOnce(page([listing("a")], [], "24"));
    listEntityTemplates.mockResolvedValueOnce(page([listing("b")]));
    render(EntityTemplateBrowse);
    await screen.findByText("Template a");
    await fireEvent.click(screen.getByText("Load more"));
    expect(await screen.findByText("Template b")).toBeTruthy();
    expect(screen.getByText("Template a")).toBeTruthy();
    await fireEvent.click(screen.getByText("Template b"));
    expect(goto).toHaveBeenCalledWith("/templates/entity/b");
  });
});
