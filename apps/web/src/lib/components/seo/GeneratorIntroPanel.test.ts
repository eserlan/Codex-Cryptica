/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import GeneratorIntroPanel from "./GeneratorIntroPanel.svelte";

describe("GeneratorIntroPanel", () => {
  it("renders the generator navigation and discovery introduction", () => {
    render(GeneratorIntroPanel, {
      props: {
        canonicalPath: "/generators/npc",
        eyebrow: "NPC Generator",
        showGeneratorSwitcher: false,
        introTitle: "Create a character",
        introText: "Shape a new person for your campaign.",
        labels: ["characters"],
        inputHint: "Choose a role to begin",
        backHref: "/tools",
        backLabel: "All tools",
      },
    });

    expect(
      screen.getByRole("link", { name: "All tools" }).getAttribute("href"),
    ).toBe("/tools");
    expect(
      screen.getByRole("heading", { name: "Create a character" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Shape a new person for your campaign."),
    ).toBeTruthy();
    expect(screen.getByTestId("public-label-chip").textContent).toContain(
      "#characters",
    );
    expect(screen.getByText("Choose a role to begin")).toBeTruthy();
  });

  it("uses the generator defaults and hides optional discovery details", () => {
    render(GeneratorIntroPanel, {
      props: {
        eyebrow: "RPG Generator",
        showGeneratorSwitcher: false,
        introTitle: "RPG Generator",
        introText: "Create a draft.",
        labels: [],
        inputHint: "",
      },
    });

    expect(
      screen.getByRole("link", { name: "All generators" }).getAttribute("href"),
    ).toBe("/generators");
    expect(screen.queryByTestId("public-label-chip")).toBeNull();
    expect(screen.queryByText("Choose a role to begin")).toBeNull();
  });
});
