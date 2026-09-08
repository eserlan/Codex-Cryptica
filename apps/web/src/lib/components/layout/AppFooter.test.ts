/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppFooter from "./AppFooter.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/config", () => ({
  PATREON_URL: "https://patreon.com/codexcryptica",
}));

describe("AppFooter", () => {
  beforeEach(() => {
    modalUIStore.showSettings = false;
    modalUIStore.activeSettingsTab = "vault";
  });

  it("renders the lightweight footer links", () => {
    render(AppFooter);

    expect(screen.getByTestId("app-footer")).toBeTruthy();
    const patreonLink = screen.getByRole("link", {
      name: "Support Codex Cryptica on Patreon",
    });
    expect(patreonLink.getAttribute("href")).toBe(
      "https://patreon.com/codexcryptica",
    );
    expect(screen.getByRole("link", { name: "Explore" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Terms" })).toBeTruthy();
  });

  it("does not duplicate discovery destinations already available from Explore", () => {
    render(AppFooter);

    expect(screen.queryByRole("link", { name: "Discord" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Tools" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Examples" })).toBeNull();
  });

  it("links Explore to the site directory page", () => {
    render(AppFooter);

    const exploreLink = screen.getByRole("link", { name: "Explore" });
    expect(exploreLink.getAttribute("href")).toBe("/explore");
  });

  it("opens Help settings when clicking the Help button", async () => {
    render(AppFooter);

    const helpBtn = screen.getByRole("button", { name: "Help" });
    await fireEvent.click(helpBtn);

    expect(modalUIStore.showSettings).toBe(true);
    expect(modalUIStore.activeSettingsTab).toBe("help");
  });
});
