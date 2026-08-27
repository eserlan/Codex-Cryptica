/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SettlementFormFields from "./SettlementFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  settlementConfig: {
    sizesByGenre: {
      Fantasy: [{ name: "Village", range: "100-500" }],
    },
    environmentsByGenre: {
      Fantasy: ["Forest edge"],
    },
    primaryFunctionsByGenre: {
      Fantasy: ["Trade hub"],
    },
    tonesByGenre: {
      Fantasy: ["Cosy and welcoming"],
    },
    mainTensionsByGenre: {
      Fantasy: ["Succession crisis"],
    },
  },
  pickFrom: <T>(arr: readonly T[]) => arr[0],
  SETTLEMENT_PRESETS: [
    {
      id: "merchant-port",
      label: "Merchant Port",
      description: "A harbour town that lives and dies by the trade season.",
      genres: ["Fantasy"],
      set: { environment: "Forest edge", primaryFunction: "Trade hub" },
    },
    {
      id: "cyber-only",
      label: "Neon Strip",
      description: "Not for this genre.",
      genres: ["Cyberpunk"],
      set: { tone: "Neon-soaked and decadent" },
    },
  ],
  presetsFor: (presets: { genres?: string[] }[], genre: string): unknown[] =>
    presets.filter((p) => p.genres === undefined || p.genres.includes(genre)),
}));

describe("SettlementFormFields", () => {
  it("renders genre-scoped choices for the given genre", () => {
    render(SettlementFormFields, {
      props: {
        genre: "Fantasy",
        size: "Village",
        environment: "Forest edge",
        primaryFunction: "Trade hub",
        tone: "Cosy and welcoming",
        mainTension: "Succession crisis",
        campaignContext: "",
      },
    });

    expect(screen.getByText("Village (100-500)")).toBeTruthy();
    expect(screen.getByText("Forest edge")).toBeTruthy();
  });

  it("allows up to 4000 characters of campaign context", () => {
    render(SettlementFormFields, {
      props: {
        genre: "Fantasy",
        size: "Village",
        environment: "Forest edge",
        primaryFunction: "Trade hub",
        tone: "Cosy and welcoming",
        mainTension: "Succession crisis",
        campaignContext: "",
      },
    });

    const context = screen.getByLabelText(
      "Campaign context (optional)",
    ) as HTMLTextAreaElement;
    expect(context.maxLength).toBe(4000);
  });

  it("calls onSurprise when Surprise Me is clicked", async () => {
    const onSurprise = vi.fn();
    render(SettlementFormFields, {
      props: {
        genre: "Fantasy",
        size: "Village",
        environment: "Forest edge",
        primaryFunction: "Trade hub",
        tone: "Cosy and welcoming",
        mainTension: "Succession crisis",
        campaignContext: "",
        onSurprise,
      },
    });

    await fireEvent.click(screen.getByText("Surprise Me"));
    expect(onSurprise).toHaveBeenCalled();
  });
});

describe("SettlementFormFields presets", () => {
  const base = {
    genre: "Fantasy",
    size: "",
    environment: "",
    primaryFunction: "",
    tone: "",
    mainTension: "",
    campaignContext: "",
  };

  it("offers only the presets for the current genre", () => {
    render(SettlementFormFields, { ...base });
    expect(screen.getByRole("button", { name: "Merchant Port" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Neon Strip" })).toBeNull();
  });

  it("fills the fields the preset names and marks itself active", async () => {
    render(SettlementFormFields, { ...base });
    const preset = screen.getByRole("button", { name: "Merchant Port" });
    await fireEvent.click(preset);

    expect(preset.getAttribute("aria-pressed")).toBe("true");
    const environment = screen.getByLabelText(
      "Environment",
    ) as HTMLSelectElement;
    const primaryFunction = screen.getByLabelText(
      "Primary Function",
    ) as HTMLSelectElement;
    expect(environment.value).toBe("Forest edge");
    expect(primaryFunction.value).toBe("Trade hub");
  });

  it("stops claiming to be active once a field it set is changed", async () => {
    render(SettlementFormFields, { ...base });
    const preset = screen.getByRole("button", { name: "Merchant Port" });
    await fireEvent.click(preset);
    expect(preset.getAttribute("aria-pressed")).toBe("true");

    const environment = screen.getByLabelText(
      "Environment",
    ) as HTMLSelectElement;
    await fireEvent.change(environment, { target: { value: "" } });

    expect(preset.getAttribute("aria-pressed")).toBe("false");
  });

  it("leaves the fields the preset did not name alone", async () => {
    render(SettlementFormFields, { ...base });
    await fireEvent.click(
      screen.getByRole("button", { name: "Merchant Port" }),
    );
    const tone = screen.getByLabelText("Tone") as HTMLSelectElement;
    expect(tone.value).toBe("");
  });
});
