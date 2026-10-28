import { describe, expect, it } from "vitest";
import { newsSheetCard, sharedCards } from "./generator-cards";

describe("hub generator cards", () => {
  it("customises the settlement without changing the shared order", () => {
    const cards = sharedCards("Port Generator", "Harbours and hidden coves.");
    expect(cards).toHaveLength(27);
    expect(cards[16]).toEqual({
      slug: "settlement",
      label: "Port Generator",
      summary: "Harbours and hidden coves.",
      icon: "icon-[lucide--building-2]",
    });
    expect(cards[0].slug).toBe("holiday");
    expect(cards.at(-1)?.slug).toBe("constellation");
  });

  it("does not leak one hub's settlement into another", () => {
    const port = sharedCards("Port", "Harbours");
    port[16].label = "Changed";
    expect(sharedCards("Colony", "Outposts")[16].label).toBe("Colony");
  });

  it("uses genre-specific mastheads for the same news generator", () => {
    expect(newsSheetCard("Broadside", "Dockside rumours")).toEqual({
      slug: "news-sheet-generator",
      label: "Broadside",
      summary: "Dockside rumours",
      icon: "icon-[lucide--newspaper]",
    });
    expect(newsSheetCard("Newsfeed", "Station news").slug).toBe(
      "news-sheet-generator",
    );
  });
});
