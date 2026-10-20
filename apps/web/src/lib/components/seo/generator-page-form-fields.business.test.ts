/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import GeneratorPageFormFields from "./GeneratorPageFormFields.svelte";

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
