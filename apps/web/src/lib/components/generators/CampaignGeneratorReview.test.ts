import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { GeneratedDraft } from "generator-engine";
import { svgToPngBlob } from "#lib/utils/svg-export.js";
vi.mock("#lib/utils/svg-export.js", async () => ({
  ...(await vi.importActual<typeof import("#lib/utils/svg-export.js")>(
    "#lib/utils/svg-export.js",
  )),
  svgToPngBlob: vi.fn(async () => new Blob(["png"])),
}));
import CampaignGeneratorReview from "./CampaignGeneratorReview.svelte";

const draft: GeneratedDraft = {
  title: "Harbour",
  summary: "A port",
  content: "The plot",
  lore: "Secret",
  labels: [],
  entityType: "location",
  sourceGeneratorId: "settlement",
  templateApplied: false,
};
describe("campaign generator review", () => {
  it("forwards review actions and supplies point-crawl diagram export on save", async () => {
    const onsave = vi.fn();
    const onback = vi.fn();
    render(CampaignGeneratorReview, {
      draft,
      categories: [],
      saving: false,
      onsave,
      onback,
    });
    expect(screen.getByText("The plot")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Open in Editor" }),
    );
    expect(onsave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Harbour" }),
      expect.any(Boolean),
      expect.objectContaining({ openInGraph: false }),
      expect.objectContaining({
        exportPointCrawl: expect.any(Function),
        exportStarSystem: undefined,
        exportConstellation: undefined,
      }),
    );
    await fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onback).toHaveBeenCalledOnce();
  });
  it("forwards spoiler shielding and prevents duplicate saves while saving", () => {
    const onsave = vi.fn();
    render(CampaignGeneratorReview, {
      draft,
      categories: [],
      saving: true,
      spoilerShield: true,
      onsave,
      onback: vi.fn(),
    });
    expect(screen.queryByText("The plot")).toBeNull();
    expect(screen.getByTestId("spoiler-shield")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Opening…" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(onsave).not.toHaveBeenCalled();
  });
  it("keeps both diagrams off-screen and forwards their live PNG exporters", async () => {
    const onsave = vi.fn();
    const { container } = render(CampaignGeneratorReview, {
      draft: {
        ...draft,
        bodies: [{ name: "Aster", type: "Rocky Planet" }],
        pattern: { stars: [{ x: 10, y: 20 }], lines: [] },
      },
      categories: [],
      saving: false,
      onsave,
      onback: vi.fn(),
    });
    expect(
      container.querySelectorAll('[aria-hidden="true"] svg').length,
    ).toBeGreaterThanOrEqual(2);
    await fireEvent.click(
      screen.getByRole("button", { name: "Open in Editor" }),
    );
    const exporters = onsave.mock.calls[0][3];
    await expect(exporters.exportStarSystem()).resolves.toBeInstanceOf(Blob);
    await expect(exporters.exportConstellation()).resolves.toBeInstanceOf(Blob);
    await expect(exporters.exportPointCrawl()).resolves.toBeNull();
    expect(svgToPngBlob).toHaveBeenCalledTimes(2);
  });
});
