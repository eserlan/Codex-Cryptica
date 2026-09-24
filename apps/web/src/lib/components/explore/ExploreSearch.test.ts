/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import ExploreSearch from "./ExploreSearch.svelte";

describe("ExploreSearch", () => {
  it("has an accessible label and renders nothing until typed into", () => {
    render(ExploreSearch, { props: { cleanBase: "" } });
    expect(screen.getByLabelText("Search Codex Cryptica")).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("shows grouped results, then clears them with the query", async () => {
    render(ExploreSearch, { props: { cleanBase: "" } });
    const input = screen.getByLabelText("Search Codex Cryptica");

    await fireEvent.input(input, { target: { value: "pirate" } });
    expect(screen.getByRole("heading", { name: "Generators" })).toBeTruthy();

    await fireEvent.input(input, { target: { value: "" } });
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("shows a no-results state linking to guides and generators", async () => {
    render(ExploreSearch, { props: { cleanBase: "/app" } });
    await fireEvent.input(screen.getByLabelText("Search Codex Cryptica"), {
      target: { value: "zzzqqq" },
    });
    expect(screen.getByText(/Nothing matched/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "generators" }).getAttribute("href"),
    ).toBe("/app/generators");
  });
});
