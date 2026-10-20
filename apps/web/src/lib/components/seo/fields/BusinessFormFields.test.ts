/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import BusinessFormFields from "./BusinessFormFields.svelte";

function props(overrides: Record<string, unknown> = {}) {
  return {
    genre: "Cyberpunk / Corporate",
    businessType: "Ripper clinic",
    scale: "small",
    legitimacy: "legitimate",
    wealth: "modest",
    tone: "grounded",
    location: "",
    clientele: "",
    campaignContext: "",
    playersOwn: false,
    ...overrides,
  };
}

function typeOptions(): string[] {
  const select = screen.getByRole("combobox", {
    name: /Business type/i,
  }) as HTMLSelectElement;
  return [...select.options].map((o) => o.value);
}

describe("BusinessFormFields", () => {
  it("offers cyberpunk businesses, not fantasy shops, for a cyberpunk genre", () => {
    render(BusinessFormFields, { props: props() });
    const types = typeOptions();
    expect(types).toContain("Ripper clinic");
    expect(types).toContain("Fixer front");
    expect(types).not.toContain("Blacksmith");
  });

  it("offers the players-own toggle, off by default", () => {
    render(BusinessFormFields, { props: props() });
    const toggle = screen.getByRole("checkbox", {
      name: /Players own this business/i,
    }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
  });

  it("offers the light inputs: scale, legitimacy, wealth, tone, location, clientele and context", () => {
    render(BusinessFormFields, { props: props() });
    for (const label of [
      /Scale/i,
      /Legitimacy/i,
      /Wealth/i,
      /Tone/i,
      /Location/i,
      /Clientele/i,
      /Campaign context/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });
});
