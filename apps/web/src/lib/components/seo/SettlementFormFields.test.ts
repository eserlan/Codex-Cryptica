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
