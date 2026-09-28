/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/svelte";
import CommunityFavourites, {
  type CommunityFavourite,
} from "./CommunityFavourites.svelte";

vi.mock("$app/paths", () => ({ base: "" }));

function favourite(slug: string, yes = 24): CommunityFavourite {
  return {
    slug,
    question: `Question for ${slug}?`,
    shortAnswer: `Short answer for ${slug}.`,
    meta: "Heists · Framework",
    yes,
  };
}

describe("CommunityFavourites", () => {
  it("renders up to six favourites with helpfulness labels and links", () => {
    const favourites = ["a", "b", "c", "d", "e", "f"].map((slug) =>
      favourite(slug),
    );
    render(CommunityFavourites, { props: { favourites } });

    const section = screen.getByRole("region", {
      name: "Community favourites",
    });
    const links = within(section).getAllByRole("link");
    expect(links).toHaveLength(6);
    expect(links[0].getAttribute("href")).toBe("/answers/a");
    expect(
      within(section).getAllByText(/readers found this helpful/),
    ).toHaveLength(6);
  });

  it("hides the section below quorum", () => {
    const { unmount } = render(CommunityFavourites, {
      props: { favourites: ["a", "b", "c"].map((slug) => favourite(slug)) },
    });
    expect(
      screen.queryByRole("region", { name: "Community favourites" }),
    ).toBeNull();
    unmount();

    render(CommunityFavourites, { props: { favourites: [] } });
    expect(
      screen.queryByRole("region", { name: "Community favourites" }),
    ).toBeNull();
  });
});
