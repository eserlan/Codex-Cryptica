import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AdventureArtworkCueDetails from "./AdventureArtworkCueDetails.svelte";

describe("AdventureArtworkCueDetails", () => {
  it("renders a closed disclosure with genre, place and NPC lines", () => {
    render(AdventureArtworkCueDetails, {
      props: {
        summary: {
          genre: "fantasy",
          place: {
            name: "Mill",
            cues: ["village", "river"],
            match: "loc-1",
          },
          npcs: [{ name: "Brea", cues: ["baker"], match: null }],
        },
      },
    });
    const details = screen.getByTestId(
      "adventure-artwork-cue-indicator",
    ) as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(screen.getByText("Artwork matching details")).toBeTruthy();
    expect(details.textContent).toContain("Genre: fantasy");
    expect(details.textContent).toContain(
      "Place (Mill): village, river — loc-1",
    );
    expect(details.textContent).toContain(
      "NPC (Brea): baker — no matching image",
    );
  });

  it("shows none for an empty tag list", () => {
    render(AdventureArtworkCueDetails, {
      props: {
        summary: {
          genre: "fantasy",
          place: { name: "Mill", cues: [], match: "loc-1" },
          npcs: [],
        },
      },
    });
    expect(
      screen.getByTestId("adventure-artwork-cue-indicator").textContent,
    ).toContain("Place (Mill): none — loc-1");
  });

  it("renders nothing without a summary", () => {
    render(AdventureArtworkCueDetails, { props: { summary: null } });
    expect(screen.queryByTestId("adventure-artwork-cue-indicator")).toBeNull();
  });
});
