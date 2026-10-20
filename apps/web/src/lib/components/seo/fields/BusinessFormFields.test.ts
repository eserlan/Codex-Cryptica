/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
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

  it("offers Surprise Me, which generates through the page's trigger", async () => {
    const onSurprise = vi.fn();
    render(BusinessFormFields, { props: props({ onSurprise }) });
    await fireEvent.click(screen.getByRole("button", { name: /Surprise Me/i }));
    expect(onSurprise).toHaveBeenCalledTimes(1);
  });

  it("reports a genre pick so the page skin can follow it", async () => {
    const onGenreChange = vi.fn();
    render(BusinessFormFields, { props: props({ onGenreChange }) });
    const select = screen.getByRole("combobox", {
      name: /Genre/i,
    }) as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "Pirate" } });
    expect(onGenreChange).toHaveBeenCalledWith("Pirate");
  });

  it("does not report a genre change when Surprise Me is clicked", async () => {
    const onGenreChange = vi.fn();
    render(BusinessFormFields, {
      props: props({ onGenreChange, onSurprise: vi.fn() }),
    });
    await fireEvent.click(screen.getByRole("button", { name: /Surprise Me/i }));
    expect(onGenreChange).not.toHaveBeenCalled();
  });

  it("keeps the genre and picks a type from that genre when surprising", async () => {
    const onSurprise = vi.fn();
    render(BusinessFormFields, {
      props: props({
        onSurprise,
        genre: "Cyberpunk / Corporate",
        businessType: "",
      }),
    });
    await fireEvent.click(screen.getByRole("button", { name: /Surprise Me/i }));
    const select = screen.getByRole("combobox", {
      name: /Business type/i,
    }) as HTMLSelectElement;
    expect(select.value).not.toBe("Blacksmith");
    expect(select.value).not.toBe("");
  });
});
