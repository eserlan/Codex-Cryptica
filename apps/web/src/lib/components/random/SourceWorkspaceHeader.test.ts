import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SourceWorkspaceHeader from "./SourceWorkspaceHeader.svelte";

vi.mock("$app/paths", () => ({ base: "", resolve: (p: string) => p }));

describe("workspace header", () => {
  it("marks the current kind and mode and dispatches mode changes", async () => {
    const onMode = vi.fn();
    render(SourceWorkspaceHeader, {
      kind: "deck",
      heading: "Decks",
      mode: "use",
      saving: true,
      onMode,
    });
    expect(
      screen.getByTestId("source-kind-deck").getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByTestId("source-kind-table").getAttribute("href")).toBe(
      "/tables",
    );
    expect(
      screen.getByTestId("source-mode-use").getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByTestId("workspace-saving")).toBeDefined();
    await fireEvent.click(screen.getByTestId("source-mode-build"));
    expect(onMode).toHaveBeenCalledWith("build");
  });

  it("omits saving and current-page markers for inactive controls", () => {
    render(SourceWorkspaceHeader, {
      kind: "table",
      heading: "Tables",
      mode: "build",
      saving: false,
      onMode: vi.fn(),
    });
    expect(screen.queryByTestId("workspace-saving")).toBeNull();
    expect(
      screen.getByTestId("source-kind-deck").hasAttribute("aria-current"),
    ).toBe(false);
    expect(
      screen.getByTestId("source-mode-use").getAttribute("aria-pressed"),
    ).toBe("false");
  });
});
