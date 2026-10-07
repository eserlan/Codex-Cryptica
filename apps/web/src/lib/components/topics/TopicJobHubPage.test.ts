import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/environment", () => ({ browser: false }));

import TopicJobHubPage from "./TopicJobHubPage.svelte";
import { DND_TOPIC_CONFIG } from "$lib/content/topics/dnd";

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
});
