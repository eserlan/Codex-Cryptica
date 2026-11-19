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
    const attribution = screen.getByTestId(
      "adventure-npc-portrait-attribution",
    );
    expect(attribution.textContent).toContain("AI illustration");
    expect(attribution.textContent).toContain("Codex Cryptica Team");
  });

  it("shows the description under the name and one muted attribution line", () => {
    render(AdventureNpcPortrait, {
      props: {
        name: "Mira",
        src: "blob:mira",
        alt: "Portrait of Mira",
        aiLabel: "AI illustration",
        credits: "Codex Cryptica Team",
        description: "a grey-haired herb-wife in a green apron",
      },
    });
    const description = screen.getByTestId(
      "adventure-npc-portrait-description",
    );
    expect(description.textContent).toContain("grey-haired herb-wife");
    expect(description.className).toContain("line-clamp-3");
    const attributions = screen.getAllByTestId(
      "adventure-npc-portrait-attribution",
    );
    expect(attributions).toHaveLength(1);
    expect(attributions[0].textContent?.trim()).toBe(
      "AI illustration · Codex Cryptica Team",
    );
    expect(attributions[0].className).toContain("text-theme-muted");
    expect(attributions[0].className).toContain("truncate");
    expect(attributions[0].className).toContain("text-helper");
  });

  it("omits the description element when there is no description", () => {
    render(AdventureNpcPortrait, {
      props: {
        name: "Mira",
        src: "blob:mira",
        alt: "Portrait of Mira",
        aiLabel: "AI illustration",
        credits: "Codex Cryptica Team",
      },
    });
    expect(
      screen.queryByTestId("adventure-npc-portrait-description"),
    ).toBeNull();
    expect(screen.getByText("Mira")).toBeTruthy();
    expect(
      screen.getByTestId("adventure-npc-portrait-attribution"),
    ).toBeTruthy();
  });

  it("omits the attribution line without aiLabel or credits", () => {
    render(AdventureNpcPortrait, {
      props: { name: "Mira", src: "blob:mira", alt: "Portrait of Mira" },
    });
    expect(
      screen.queryByTestId("adventure-npc-portrait-attribution"),
    ).toBeNull();
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
