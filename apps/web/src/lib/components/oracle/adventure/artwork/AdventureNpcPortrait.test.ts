import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AdventureNpcPortrait from "./AdventureNpcPortrait.svelte";

describe("adventure NPC portrait", () => {
  it("renders a modest portrait without visible attribution", () => {
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
    expect(screen.queryByText(/AI illustration/)).toBeNull();
    expect(screen.queryByText(/Codex Cryptica Team/)).toBeNull();
  });

  it("shows the description under the name without an attribution line", () => {
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
    expect(screen.queryByText(/AI illustration/)).toBeNull();
    expect(screen.queryByText(/Codex Cryptica Team/)).toBeNull();
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
    expect(screen.queryByText(/AI illustration/)).toBeNull();
  });
});

describe("adventure NPC portrait fallbacks", () => {
  it("renders the portrait without attribution when labels are absent", () => {
    render(AdventureNpcPortrait, {
      props: { name: "Mira", src: "blob:mira", alt: "Portrait of Mira" },
    });
    expect(screen.queryByText(/AI illustration/)).toBeNull();
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
