/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("./entity-templates/EntityTemplateSettings.svelte", async () => ({
  default: (await import("./__mocks__/EntityTemplateSettingsStub.svelte"))
    .default,
}));
vi.mock("./StatSheetTemplateSettings.svelte", async () => ({
  default: (await import("./__mocks__/StatSheetSettingsStub.svelte")).default,
}));
vi.mock("$lib/components/help/FeatureHint.svelte", async () => ({
  default: (await import("./__mocks__/HintStub.svelte")).default,
}));

import TemplatesTab from "./TemplatesTab.svelte";

describe("TemplatesTab", () => {
  it("opens on entity templates and shows only that section", () => {
    render(TemplatesTab);
    expect(screen.getByTestId("stub-entity-settings")).toBeTruthy();
    expect(screen.queryByTestId("stub-stat-settings")).toBeNull();
    expect(
      screen
        .getByTestId("templates-subtab-entity")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("switches to stat sheets and back, with a matching intro line", async () => {
    render(TemplatesTab);
    await fireEvent.click(screen.getByTestId("templates-subtab-stats"));
    expect(screen.getByTestId("stub-stat-settings")).toBeTruthy();
    expect(screen.queryByTestId("stub-entity-settings")).toBeNull();
    expect(screen.getByText(/Reusable stat sheet layouts/)).toBeTruthy();

    await fireEvent.click(screen.getByTestId("templates-subtab-entity"));
    expect(screen.getByTestId("stub-entity-settings")).toBeTruthy();
    expect(screen.getByText(/text a new note starts with/)).toBeTruthy();
  });

  it("supports arrow keys and keeps only the active tab in the tab order", async () => {
    render(TemplatesTab);
    const entity = screen.getByTestId("templates-subtab-entity");
    const stats = screen.getByTestId("templates-subtab-stats");
    expect(stats.getAttribute("tabindex")).toBe("-1");

    await fireEvent.keyDown(entity, { key: "ArrowRight" });
    expect(stats.getAttribute("aria-selected")).toBe("true");
    expect(stats.getAttribute("tabindex")).toBe("0");
    expect(entity.getAttribute("tabindex")).toBe("-1");

    await fireEvent.keyDown(stats, { key: "ArrowRight" });
    expect(entity.getAttribute("aria-selected")).toBe("true");
  });

  it("ignores unrelated keys", async () => {
    render(TemplatesTab);
    await fireEvent.keyDown(screen.getByTestId("templates-subtab-entity"), {
      key: "a",
    });
    expect(
      screen
        .getByTestId("templates-subtab-entity")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });
});
