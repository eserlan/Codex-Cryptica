/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listTemplates, listEntityTemplates, goto, pageState } = vi.hoisted(
  () => ({
    listTemplates: vi.fn(),
    listEntityTemplates: vi.fn(),
    goto: vi.fn(),
    pageState: { url: new URL("https://app.test/templates") },
  }),
);

vi.mock("$app/navigation", () => ({ goto }));
vi.mock("$app/paths", () => ({ resolve: (p: string) => p }));
vi.mock("$app/state", () => ({ page: pageState }));
vi.mock("$lib/services/publishing/PublicTemplateDirectoryService", () => ({
  publicTemplateDirectoryService: { listTemplates },
}));
vi.mock(
  "$lib/services/publishing/PublicEntityTemplateDirectoryService",
  () => ({
    publicEntityTemplateDirectoryService: { listEntityTemplates },
  }),
);

import TemplatesDirectoryPage from "./TemplatesDirectoryPage.svelte";

const statListing = {
  schemaVersion: 1,
  listingId: "s1",
  title: "Stat block",
  description: "Numbers.",
  system: "Homebrew",
  labels: [],
  packageVersion: 1,
  listingCreatedAt: "2026-01-01T00:00:00.000Z",
  listingUpdatedAt: "2026-01-01T00:00:00.000Z",
  fieldPreview: [],
};
const entityListing = {
  schemaVersion: 1,
  templateKind: "entity",
  listingId: "e1",
  title: "Guild Hall",
  description: "A place for guilds.",
  entityType: "location",
  labels: ["Fantasy"],
  packageVersion: 1,
  status: "active",
  listingCreatedAt: "2026-01-01T00:00:00.000Z",
  listingUpdatedAt: "2026-01-02T00:00:00.000Z",
};

beforeEach(() => {
  listTemplates.mockReset().mockResolvedValue({ results: [statListing] });
  listEntityTemplates.mockReset().mockResolvedValue({
    results: [entityListing],
    facets: { entityTypes: [] },
  });
  goto.mockReset();
  pageState.url = new URL("https://app.test/templates");
});

describe("TemplatesDirectoryPage kind switch", () => {
  it("starts on stat sheet templates and renders that view as before", async () => {
    render(TemplatesDirectoryPage);
    expect(await screen.findByText("Stat block")).toBeTruthy();
    expect(screen.getByText("Find a Stat Sheet layout")).toBeTruthy();
    expect(listEntityTemplates).not.toHaveBeenCalled();
  });

  it("switches to entity templates and back, each with its own data", async () => {
    render(TemplatesDirectoryPage);
    await screen.findByText("Stat block");

    await fireEvent.click(
      screen.getByRole("tab", { name: "Entity templates" }),
    );
    expect(await screen.findByText("Guild Hall")).toBeTruthy();
    expect(screen.queryByText("Stat block")).toBeNull();
    expect(goto).toHaveBeenLastCalledWith(
      "?kind=entity",
      expect.objectContaining({ replaceState: true }),
    );

    await fireEvent.click(
      screen.getByRole("tab", { name: "Stat sheet templates" }),
    );
    await waitFor(() => expect(screen.queryByText("Guild Hall")).toBeNull());
    expect(await screen.findByText("Stat block")).toBeTruthy();
    expect(goto).toHaveBeenLastCalledWith(
      "?",
      expect.objectContaining({ replaceState: true }),
    );
  });

  it("opens on entity templates when the address asks for them", async () => {
    pageState.url = new URL("https://app.test/templates?kind=entity");
    render(TemplatesDirectoryPage);
    expect(await screen.findByText("Guild Hall")).toBeTruthy();
    expect(listTemplates).not.toHaveBeenCalled();
  });

  it("keeps the stat sheet view working when the entity view fails", async () => {
    listEntityTemplates
      .mockReset()
      .mockRejectedValue(new Error("Couldn't reach the template directory."));
    render(TemplatesDirectoryPage);
    await screen.findByText("Stat block");
    await fireEvent.click(
      screen.getByRole("tab", { name: "Entity templates" }),
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("tab", { name: "Stat sheet templates" }),
    );
    expect(await screen.findByText("Stat block")).toBeTruthy();
  });

  it("opens an entity listing at its own address", async () => {
    pageState.url = new URL("https://app.test/templates?kind=entity");
    render(TemplatesDirectoryPage);
    await fireEvent.click(await screen.findByText("Guild Hall"));
    expect(goto).toHaveBeenCalledWith("/templates/entity/e1");
  });
});
