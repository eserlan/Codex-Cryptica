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

vi.mock("$lib/components/ui/SilhouetteAvatar.svelte", async () => ({
  default: (await import("./test-support/silhouette-avatar-stub.svelte"))
    .default,
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

  const buildOne = (portraits: boolean, portraitUrl?: string) =>
    buildReport(
      {
        entities: [
          {
            id: "a",
            title: "Archstaff",
            type: "item",
            labels: [],
            portraitUrl,
            description: "## Summary\n\nA **rare** relic.\n\n- one\n- two",
          },
        ],
        relationships: [],
        factionMembership: {},
      },
      {
        scope: { origin: "graph" },
        include: { ...DEFAULT_REPORT_INCLUDE, portraits },
        detail: DEFAULT_REPORT_DETAIL,
      },
    );

  it("renders markdown richly instead of showing raw syntax", () => {
    const { container } = render(ReportPreview, {
      props: { document: buildOne(true) },
    });
    expect(container.querySelector("h2")?.textContent).toBe("Summary");
    expect(container.querySelector("strong")?.textContent).toBe("rare");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.textContent).not.toContain("##");
  });

  it("falls back to a silhouette when the entity has no portrait", () => {
    render(ReportPreview, { props: { document: buildOne(true) } });
    expect(screen.getByTestId("silhouette-stub")).toBeTruthy();
  });

  it("shows no silhouette when portraits are turned off", () => {
    render(ReportPreview, { props: { document: buildOne(false) } });
    expect(screen.queryByTestId("silhouette-stub")).toBeNull();
  });

  it("prefers the portrait over the silhouette", async () => {
    render(ReportPreview, { props: { document: buildOne(true, "a.png") } });
    await waitFor(() => expect(screen.getByAltText("Archstaff")).toBeTruthy());
    expect(screen.queryByTestId("silhouette-stub")).toBeNull();
  });

  it("falls back to the silhouette when the portrait cannot be loaded", async () => {
    resolveImageUrl.mockRejectedValueOnce(new Error("missing"));
    render(ReportPreview, { props: { document: buildOne(true, "gone.png") } });
    await waitFor(() =>
      expect(screen.getByTestId("silhouette-stub")).toBeTruthy(),
    );
  });
});
