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
  DISCORD_URL: "https://discord.gg/codexcryptica",
}));

describe("AppFooter", () => {
  beforeEach(() => {
    modalUIStore.showSettings = false;
    modalUIStore.activeSettingsTab = "vault";
  });

  it("renders the footer landmark and legal / navigational links", () => {
    render(AppFooter);

    expect(screen.getByTestId("app-footer")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Support on Patreon" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Discord" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Features" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tools" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Blog" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explore Worlds" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Responsible AI" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Terms of Service" })).toBeTruthy();
  });

  it("links Examples to the marketing examples directory", () => {
    render(AppFooter);

    const examplesLink = screen.getByRole("link", { name: "Examples" });
    expect(examplesLink).toBeTruthy();
    expect(examplesLink.getAttribute("href")).toBe("/examples");
  });

  it("opens Help settings when clicking the Help button", async () => {
    render(AppFooter);

    const helpBtn = screen.getByRole("button", { name: "Help" });
    await fireEvent.click(helpBtn);

    expect(modalUIStore.showSettings).toBe(true);
    expect(modalUIStore.activeSettingsTab).toBe("help");
  });
});
