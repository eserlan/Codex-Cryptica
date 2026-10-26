/** @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  journal: { current: null as any, open: vi.fn(), start: vi.fn() },
  controlState: "start" as string,
}));
vi.mock("$lib/stores/session-journal.svelte", () => ({
  sessionJournalStore: env.journal,
}));
vi.mock("$lib/stores/solo-session-instance", () => ({
  soloPromoter: { promote: vi.fn() },
}));
vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: ["character", "location", "item", "faction", "event", "note"].map(
      (id) => ({ id }),
    ),
  },
}));

import SoloRecentResults from "./SoloRecentResults.svelte";

const ent = (i: number) => ({
  id: `e${i}`,
  timestamp: i,
  type: "dice-roll",
  content: `Rolled ${i}`,
});

beforeEach(() => {
  env.journal.current = null;
});

describe("SoloRecentResults", () => {
  it("lists up to 10 captured results, newest first, each with Save to Vault", async () => {
    env.journal.current = {
      id: "j1",
      status: "active",
      entries: Array.from({ length: 12 }, (_, i) => ent(i)),
      sections: [],
    };
    render(SoloRecentResults);
    await fireEvent.click(screen.getByTestId("solo-recent-results"));
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(10);
    expect(items[0].textContent).toContain("Rolled 11");
    expect(within(items[0]).getByTestId("solo-save-result")).toBeTruthy();
  });

  it("explains that results are kept only while a journal runs, and offers to start one", async () => {
    env.journal.current = null;
    render(SoloRecentResults);
    await fireEvent.click(screen.getByTestId("solo-recent-results"));
    expect(screen.getByText(/kept only while a journal runs/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /start or continue a journal/i }),
    ).toBeTruthy();
  });

  it("says nothing has been captured for an empty journal", async () => {
    env.journal.current = {
      id: "j1",
      status: "active",
      entries: [],
      sections: [],
    };
    render(SoloRecentResults);
    await fireEvent.click(screen.getByTestId("solo-recent-results"));
    expect(screen.getByText("Nothing captured yet.")).toBeTruthy();
  });

  it("opens the save dialog for an item", async () => {
    env.journal.current = {
      id: "j1",
      status: "active",
      entries: [ent(1)],
      sections: [],
    };
    render(SoloRecentResults);
    await fireEvent.click(screen.getByTestId("solo-recent-results"));
    await fireEvent.click(screen.getByTestId("solo-save-result"));
    expect(screen.getByTestId("solo-save-dialog")).toBeTruthy();
  });
});
