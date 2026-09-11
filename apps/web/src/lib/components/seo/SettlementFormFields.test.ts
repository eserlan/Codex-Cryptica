/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SettlementFormFields from "./SettlementFormFields.svelte";

vi.mock("$lib/services/seo/generator-engine", () => ({
  settlementConfig: {
    sizesByGenre: {
      Fantasy: [
        { name: "Village", range: "100-500" },
        { name: "Hamlet", range: "10-100" },
      ],
    },
    environmentsByGenre: {
      Fantasy: ["Forest edge", "River crossing"],
    },
    primaryFunctionsByGenre: {
      Fantasy: ["Trade hub", "Border checkpoint"],
    },
    tonesByGenre: {
      Fantasy: ["Cosy and welcoming", "Mysterious and secretive"],
    },
    mainTensionsByGenre: {
      Fantasy: ["Succession crisis", "Trade route cut off"],
    },
  },
  pickFrom: <T>(arr: readonly T[]) => arr[0],
  // Distinguishable from every prop fixture in this file, so a test can tell
  // whether Surprise Me actually ran resolveSmart rather than the old flat
  // pickFrom draws.
  resolveSmart: () => ({
    values: {
      size: "Hamlet",
      environment: "River crossing",
      primaryFunction: "Border checkpoint",
      tone: "Mysterious and secretive",
      mainTension: "Trade route cut off",
    },
    axes: [],
    relaxations: [],
  }),
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
  SETTLEMENT_LEXICON: [],
  settlementSchema: { id: "settlement", axes: [] },
  // Stand-ins for the engine's matcher, which has its own tests. What matters
  // here is what the form does with an inference, not how one is reached.
  analyseIntent: (text: string) => (text.trim() ? [{ trait: "coastal" }] : []),
  applyIntent: (
    _schema: unknown,
    signals: unknown[],
    config: { locked?: Record<string, unknown> },
  ) => ({
    config,
    inferred:
      signals.length > 0 && !config.locked?.environment
        ? [
            {
              axisId: "environment",
              label: "Environment",
              value: "Forest edge",
              score: 2,
              phrases: ["coastal"],
            },
          ]
        : [],
  }),
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
      "Describe what you want (optional)",
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

  it("fills the fields from the smart resolver rather than independent draws (#2525)", async () => {
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

    await fireEvent.click(screen.getByText("Surprise Me"));

    const environment = screen.getByLabelText(
      "Environment",
    ) as HTMLSelectElement;
    const primaryFunction = screen.getByLabelText(
      "Primary Function",
    ) as HTMLSelectElement;
    expect(environment.value).toBe("River crossing");
    expect(primaryFunction.value).toBe("Border checkpoint");
  });

  it("clears any preset highlight and inferred chips on Surprise Me", async () => {
    render(SettlementFormFields, {
      props: {
        genre: "Fantasy",
        size: "",
        environment: "",
        primaryFunction: "",
        tone: "",
        mainTension: "",
        campaignContext: "",
      },
    });

    const field = screen.getByLabelText(
      "Describe what you want (optional)",
    ) as HTMLTextAreaElement;
    await fireEvent.input(field, {
      target: { value: "a coastal harbour town" },
    });
    await fireEvent.blur(field);
    expect(screen.getByText("Read from your description")).toBeTruthy();

    await fireEvent.click(screen.getByText("Surprise Me"));

    expect(screen.queryByText("Read from your description")).toBeNull();
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

describe("SettlementFormFields description", () => {
  const base = {
    genre: "Fantasy",
    size: "",
    environment: "",
    primaryFunction: "",
    tone: "",
    mainTension: "",
    campaignContext: "",
  };

  const describeIt = async (text: string) => {
    const field = screen.getByLabelText(
      "Describe what you want (optional)",
    ) as HTMLTextAreaElement;
    await fireEvent.input(field, { target: { value: text } });
    await fireEvent.blur(field);
    return field;
  };

  it("fills a blank field from the description and says so", async () => {
    render(SettlementFormFields, { ...base });
    await describeIt("a coastal harbour town");

    const environment = screen.getByLabelText(
      "Environment",
    ) as HTMLSelectElement;
    expect(environment.value).toBe("Forest edge");
    expect(screen.getByText("Read from your description")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Remove Environment Forest edge" }),
    ).toBeTruthy();
  });

  it("puts a removed inference back to blank", async () => {
    render(SettlementFormFields, { ...base });
    await describeIt("a coastal harbour town");

    await fireEvent.click(
      screen.getByRole("button", { name: "Remove Environment Forest edge" }),
    );

    const environment = screen.getByLabelText(
      "Environment",
    ) as HTMLSelectElement;
    expect(environment.value).toBe("");
    expect(screen.queryByText("Read from your description")).toBeNull();
  });

  it("leaves a field the user already set alone", async () => {
    render(SettlementFormFields, { ...base, environment: "Forest edge" });
    const environment = screen.getByLabelText(
      "Environment",
    ) as HTMLSelectElement;
    expect(environment.value).toBe("Forest edge");

    await describeIt("a coastal harbour town");

    expect(screen.queryByText("Read from your description")).toBeNull();
  });

  it("stops claiming a field once it is changed by hand", async () => {
    render(SettlementFormFields, { ...base });
    await describeIt("a coastal harbour town");
    expect(screen.getByText("Read from your description")).toBeTruthy();

    const environment = screen.getByLabelText(
      "Environment",
    ) as HTMLSelectElement;
    await fireEvent.change(environment, { target: { value: "" } });

    expect(screen.queryByText("Read from your description")).toBeNull();
  });

  it("infers nothing from an empty description", async () => {
    render(SettlementFormFields, { ...base });
    await describeIt("   ");
    expect(screen.queryByText("Read from your description")).toBeNull();
  });

  it("does not read the description until the field is left", async () => {
    render(SettlementFormFields, { ...base });
    const field = screen.getByLabelText(
      "Describe what you want (optional)",
    ) as HTMLTextAreaElement;
    await fireEvent.input(field, { target: { value: "a coastal harbour" } });

    expect(screen.queryByText("Read from your description")).toBeNull();
  });
});
