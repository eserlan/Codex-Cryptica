/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import GeneratorPageFormFields from "./GeneratorPageFormFields.svelte";
import UrbanFantasyFactionFormFields from "./UrbanFantasyFactionFormFields.svelte";
import { urbanFantasyFactionConfig } from "#lib/services/seo/generator-config.js";

function renderFor(slug: string) {
  const business = {
    genre: "Classic Fantasy",
    businessType: "Blacksmith",
    scale: "small",
    legitimacy: "legitimate",
    wealth: "modest",
    tone: "grounded",
    location: "",
    clientele: "",
    campaignContext: "",
    playersOwn: false,
  };
  render(GeneratorPageFormFields, {
    props: {
      slug,
      business,
      trigger: () => {},
      activeTheme: "Classic Fantasy",
    } as never,
  });
}

describe("GeneratorPageFormFields business slug", () => {
  it("renders the business selectors and Surprise Me on /generators/business", () => {
    renderFor("business");
    expect(
      screen.getByRole("combobox", { name: /Business type/i }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/Scale/i)).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: /Players own this business/i }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Surprise Me/i })).toBeTruthy();
  });

  it("does not render the business form on another generator's page", () => {
    renderFor("point-crawl");
    expect(
      screen.queryByRole("checkbox", { name: /Players own this business/i }),
    ).toBeNull();
  });
});

describe("UrbanFantasyFactionFormFields", () => {
  it("exposes the urban fantasy mode, faction type, scope and moral posture choices", () => {
    render(UrbanFantasyFactionFormFields, {
      props: {
        mode: urbanFantasyFactionConfig.modes[0],
        factionType: urbanFantasyFactionConfig.types[0],
        scope: urbanFantasyFactionConfig.scopes[0],
        moralPosture: urbanFantasyFactionConfig.moralPostures[0],
        campaignContext: "",
      },
    });

    expect(
      screen.getByRole("combobox", { name: "Urban fantasy mode" }),
    ).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Faction type" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Operating scope" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Moral posture" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Corporate occult" }),
    ).toBeTruthy();
    expect(screen.getByRole("option", { name: "Mage Cabal" })).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Transit Network" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Street-level survivors" }),
    ).toBeTruthy();

    expect(
      screen.getByText("Urban fantasy mode").classList.contains("text-xs"),
    ).toBe(true);
    expect(
      screen
        .getByText(/Add a city, neighbourhood/)
        .classList.contains("text-xs"),
    ).toBe(true);
    const surpriseButton = screen.getByRole("button", { name: "Surprise Me" });
    expect(surpriseButton.classList.contains("text-xs")).toBe(true);
    expect(
      surpriseButton.classList.contains("hover:text-theme-on-primary"),
    ).toBe(true);
  });
});
