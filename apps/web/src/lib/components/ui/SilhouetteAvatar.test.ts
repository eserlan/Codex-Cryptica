/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import SilhouetteAvatar from "./SilhouetteAvatar.svelte";

describe("SilhouetteAvatar", () => {
  it("renders auto-inferred silhouette for a vampire entity", () => {
    const { container } = render(SilhouetteAvatar, {
      entity: {
        type: "character",
        title: "Carmilla",
        labels: ["vampire", "noble"],
      },
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 1024 1024");
  });

  it("renders explicit silhouetteId when provided", () => {
    const { container } = render(SilhouetteAvatar, {
      silhouetteId: "scifi-scientist-alien",
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(container.querySelector("[title='Alien Scientist']")).toBeTruthy();
  });

  it("shows archetype badge when showBadge is true", () => {
    const { getByText } = render(SilhouetteAvatar, {
      silhouetteId: "fantasy-warrior-male",
      showBadge: true,
    });

    expect(getByText("warrior")).toBeTruthy();
  });
});
