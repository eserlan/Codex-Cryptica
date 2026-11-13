import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AdventureNpcPortrait from "./AdventureNpcPortrait.svelte";

describe("adventure NPC portrait", () => {
  it("renders a modest portrait with accessible name and AI label", () => {
    render(AdventureNpcPortrait, {
      props: {
        name: "Morgan",
        src: "blob:portrait-1",
        alt: "Portrait of Morgan at the harbour",
        aiLabel: "AI illustration",
        credits: "Codex Cryptica Team",
      },
    });
    const img = screen.getByRole("img", {
      name: "Portrait of Morgan at the harbour",
    }) as HTMLImageElement;
    expect(img.src).toBe("blob:portrait-1");
    expect(screen.getByText("Morgan")).toBeTruthy();
    expect(screen.getByText("AI illustration")).toBeTruthy();
  });

  it("renders nothing when src is absent (text-only fallback)", () => {
    const { container } = render(AdventureNpcPortrait, {
      props: {
        name: "Morgan",
        src: null,
        alt: "Portrait of Morgan",
      },
    });
    expect(container.querySelector("img")).toBeNull();
  });
});
