/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RoutePage from "./+page.svelte";

const state = vi.hoisted(() => ({
  page: { url: new URL("http://localhost/biomes"), params: {} },
}));
const nav = vi.hoisted(() => ({
  goto: vi.fn(),
  guard: null as
    null | ((arg: { cancel: () => void; to: { url: URL } }) => void),
}));

vi.mock("$app/state", () => state);
vi.mock("$app/navigation", () => ({
  goto: nav.goto,
  beforeNavigate: (cb: typeof nav.guard) => {
    nav.guard = cb;
  },
}));
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$lib/stores/biome-explorer-instance", async () => {
  const { makeStore } = await import("$lib/stores/biome-explorer.test-helpers");
  const made = makeStore();
  return { biomeExplorer: made.store, __made: made };
});

async function made() {
  const mod =
    (await import("$lib/stores/biome-explorer-instance")) as unknown as {
      __made: ReturnType<
        typeof import("$lib/stores/biome-explorer.test-helpers").makeStore
      >;
    };
  return mod.__made;
}

describe("/biomes public route", () => {
  beforeEach(async () => {
    document.head.innerHTML = "";
    nav.goto.mockReset();
    nav.guard = null;
    state.page.url = new URL("http://localhost/biomes");
    const m = await made();
    m.store.draft = null;
    m.store.discardPending = false;
    m.store.clearCompare();
    m.store.setView("library");
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("publishes dedicated Open Graph and page metadata", () => {
    render(RoutePage);
    expect(document.title).toContain("Biome Explorer");
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toContain("Curated reference library of real-world environments");
  });

  it("shows the library when no biome is selected", () => {
    render(RoutePage);
    expect(
      screen.getByRole("heading", { name: "Biome Explorer", level: 1 }),
    ).toBeTruthy();
    expect(screen.getByRole("searchbox")).toBeTruthy();
  });

  it("opens the details of the biome named in ?biome=", () => {
    state.page.url = new URL("http://localhost/biomes?biome=tundra");
    render(RoutePage);
    expect(
      screen.getByRole("heading", { name: "Tundra", level: 2 }),
    ).toBeTruthy();
  });

  it("shows a plain not-found message with a way back for an unknown biome", async () => {
    state.page.url = new URL("http://localhost/biomes?biome=nowhere");
    render(RoutePage);
    expect(screen.getByRole("alert").textContent).toMatch(
      /couldn't find that biome/,
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Back to all biomes" }),
    );
    expect(nav.goto).toHaveBeenCalledWith("/biomes");
  });

  it("navigates to a biome when its card is chosen", async () => {
    render(RoutePage);
    await fireEvent.click(
      screen.getByRole("button", { name: /^Tundra Treeless/ }),
    );
    expect(nav.goto).toHaveBeenCalledWith(
      "/biomes?biome=tundra",
      expect.anything(),
    );
  });

  it("starts an editor from Make my own", async () => {
    state.page.url = new URL("http://localhost/biomes?biome=tundra");
    render(RoutePage);
    await fireEvent.click(screen.getByRole("button", { name: "Make my own" }));
    expect(await screen.findByLabelText("Name")).toBeTruthy();
    expect(screen.getByText(/Based on Tundra/)).toBeTruthy();
  });

  it("starts a blank editor from Start from blank", async () => {
    render(RoutePage);
    await fireEvent.click(
      screen.getByRole("button", { name: "Start from blank" }),
    );
    expect(await screen.findByLabelText("Name")).toBeTruthy();
    expect(screen.queryByText(/Based on/)).toBeNull();
  });

  it("asks before leaving the page with unsaved changes, and keeps the draft when declined", async () => {
    const m = await made();
    render(RoutePage);
    await fireEvent.click(
      screen.getByRole("button", { name: "Start from blank" }),
    );
    await fireEvent.input(await screen.findByLabelText("Name"), {
      target: { value: "Unsaved" },
    });

    const cancel = vi.fn();
    nav.guard!({ cancel, to: { url: new URL("http://localhost/explore") } });
    expect(cancel).toHaveBeenCalled();
    expect(await screen.findByRole("alertdialog")).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(m.store.draft?.title).toBe("Unsaved");
    expect(nav.goto).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/explore" }),
    );
  });

  it("leaves the page after confirming the discard", async () => {
    render(RoutePage);
    await fireEvent.click(
      screen.getByRole("button", { name: "Start from blank" }),
    );
    await fireEvent.input(await screen.findByLabelText("Name"), {
      target: { value: "Unsaved" },
    });
    nav.guard!({
      cancel: vi.fn(),
      to: { url: new URL("http://localhost/explore") },
    });
    await fireEvent.click(
      await screen.findByRole("button", { name: "Discard changes" }),
    );
    await waitFor(() => expect(nav.goto).toHaveBeenCalled());
    expect((nav.goto.mock.calls.at(-1)![0] as URL).pathname).toBe("/explore");
  });

  it("does not interfere with navigation when nothing is unsaved", () => {
    render(RoutePage);
    const cancel = vi.fn();
    nav.guard!({ cancel, to: { url: new URL("http://localhost/explore") } });
    expect(cancel).not.toHaveBeenCalled();
  });

  it("adds biomes to the comparison from the library and shows them side by side", async () => {
    render(RoutePage);
    await fireEvent.click(
      screen.getByRole("button", { name: "Compare Tundra" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Compare Hot desert" }),
    );
    const tab = screen.getByRole("button", { name: "Compare (2)" });
    await fireEvent.click(tab);
    expect(
      await screen.findByRole("table", {
        name: /Comparison of Tundra and Hot desert/,
      }),
    ).toBeTruthy();
  });

  it("adds the open biome to the comparison from its details", async () => {
    state.page.url = new URL("http://localhost/biomes?biome=tundra");
    render(RoutePage);
    await fireEvent.click(
      screen.getByRole("button", { name: "Add to compare" }),
    );
    expect(screen.getByRole("button", { name: "In comparison" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Compare (1)" })).toBeTruthy();
  });

  it("asks for another biome when only one is chosen", async () => {
    render(RoutePage);
    await fireEvent.click(
      screen.getByRole("button", { name: "Compare Tundra" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: "Compare (1)" }));
    expect(await screen.findByText(/Choose at least two biomes/)).toBeTruthy();
  });
});
