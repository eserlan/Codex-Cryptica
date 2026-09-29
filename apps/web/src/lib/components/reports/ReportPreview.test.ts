/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_REPORT_DETAIL,
  DEFAULT_REPORT_INCLUDE,
  buildReport,
} from "entity-report-engine";

const { resolveImageUrl, releaseImageUrl } = vi.hoisted(() => ({
  resolveImageUrl: vi.fn(async (path: string) => `blob:${path}`),
  releaseImageUrl: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { resolveImageUrl, releaseImageUrl },
}));

import ReportPreview from "./ReportPreview.svelte";

describe("ReportPreview", () => {
  it("renders duplicate titles and relationship lines, then releases portraits", async () => {
    const document = buildReport(
      {
        entities: [
          {
            id: "source",
            title: "Hero",
            type: "character",
            labels: [],
            portraitUrl: "hero.png",
          },
          {
            id: "first",
            title: "Twin",
            type: "character",
            labels: [],
            portraitUrl: "first.png",
          },
          {
            id: "second",
            title: "Twin",
            type: "character",
            labels: [],
            portraitUrl: "second.png",
          },
        ],
        relationships: [
          { sourceId: "source", targetId: "first", label: "ally" },
          { sourceId: "source", targetId: "second", label: "ally" },
        ],
        factionMembership: {},
      },
      {
        scope: { origin: "graph" },
        include: { ...DEFAULT_REPORT_INCLUDE },
        detail: DEFAULT_REPORT_DETAIL,
      },
    );

    const { unmount } = render(ReportPreview, { props: { document } });

    expect(screen.getAllByRole("heading", { name: "Twin" })).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Hero" })).toBeTruthy();
    await waitFor(() => expect(resolveImageUrl).toHaveBeenCalledTimes(3));

    unmount();
    await waitFor(() => expect(releaseImageUrl).toHaveBeenCalledTimes(3));
  });
});
