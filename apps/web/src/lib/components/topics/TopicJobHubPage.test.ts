import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));
vi.mock("$app/environment", () => ({ browser: false }));

import TopicJobHubPage from "./TopicJobHubPage.svelte";
import { DND_TOPIC_CONFIG } from "#lib/content/topics/dnd.js";

describe("TopicJobHubPage", () => {
  it("leads with the primary call to action, then the DM jobs", () => {
    render(TopicJobHubPage, { props: { config: DND_TOPIC_CONFIG } });

    const cta = screen.getByTestId("topic-primary-cta");
    expect(cta.querySelector("a")?.getAttribute("href")).toBe(
      "/tools/session-prep-builder",
    );
    for (const job of DND_TOPIC_CONFIG.jobs) {
      expect(
        screen.getByRole("heading", { level: 2, name: job.heading }),
      ).toBeTruthy();
    }
  });

  it("renders no section for a job with no links", () => {
    const config = {
      ...DND_TOPIC_CONFIG,
      jobs: DND_TOPIC_CONFIG.jobs.slice(0, 1),
    };
    render(TopicJobHubPage, { props: { config } });
    expect(screen.queryByRole("heading", { name: "Run the table" })).toBeNull();
  });

  it("uses the wide canvas and grids job links in compact columns", () => {
    const { container } = render(TopicJobHubPage, {
      props: { config: DND_TOPIC_CONFIG },
    });

    const article = container.querySelector("article") as HTMLElement;
    expect(article.className).toContain("max-w-7xl");
    expect(article.className).not.toContain("max-w-2xl");

    const job = DND_TOPIC_CONFIG.jobs[0];
    const list = document
      .getElementById(`${DND_TOPIC_CONFIG.slug}-${job.id}`)
      ?.querySelector("ul") as HTMLElement;
    expect(list.className).toContain("md:grid-cols-2");
    expect(list.className).toContain("xl:grid-cols-3");
    expect(list.querySelectorAll("li")).toHaveLength(job.links.length);
  });

  it("keeps the job navigation anchors pointing at their sections", () => {
    render(TopicJobHubPage, { props: { config: DND_TOPIC_CONFIG } });

    const nav = screen.getByRole("navigation", { name: "DM jobs" });
    for (const job of DND_TOPIC_CONFIG.jobs) {
      const anchor = nav.querySelector(
        `a[href="#${DND_TOPIC_CONFIG.slug}-${job.id}"]`,
      );
      expect(anchor).toBeTruthy();
      expect(
        document.getElementById(`${DND_TOPIC_CONFIG.slug}-${job.id}`),
      ).toBeTruthy();
    }
  });
});
