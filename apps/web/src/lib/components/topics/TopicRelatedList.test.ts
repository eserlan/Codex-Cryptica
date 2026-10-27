/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

import TopicRelatedList from "./TopicRelatedList.svelte";
import * as discoveryTracking from "#lib/services/analytics/discovery-tracking.js";

const topics = [
  { title: "Puzzles", href: "/topics/puzzles", description: "Clues and locks" },
  { title: "Pirates", href: "/topics/pirates", description: "Sea voyages" },
];

describe("TopicRelatedList", () => {
  afterEach(() => vi.restoreAllMocks());

  it("labels the section by its heading and lists each related hub", () => {
    render(TopicRelatedList, {
      props: { slug: "heists", heading: "Related topics", topics },
    });

    const section = screen.getByRole("region", { name: "Related topics" });
    const links = section.querySelectorAll("li a");
    expect(Array.from(links).map((a) => a.getAttribute("href"))).toEqual([
      "/topics/puzzles",
      "/topics/pirates",
    ]);
    expect(section.querySelector("ul")?.className).toContain("md:grid-cols-2");
  });

  it("reports a click as a topic_related discovery click for this hub", async () => {
    const spy = vi
      .spyOn(discoveryTracking, "trackDiscoveryClick")
      .mockImplementation(() => {});
    render(TopicRelatedList, {
      props: { slug: "heists", heading: "Related topics", topics },
    });

    await fireEvent.click(screen.getByRole("link", { name: "Pirates" }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({
      sourceKind: "topic",
      sourceId: "heists",
      placement: "topic_related",
    });
  });

  it("renders an empty list, not a broken one, when there are no related hubs", () => {
    render(TopicRelatedList, {
      props: { slug: "heists", heading: "Related topics", topics: [] },
    });

    expect(
      screen
        .getByRole("region", { name: "Related topics" })
        .querySelectorAll("li"),
    ).toHaveLength(0);
  });
});
