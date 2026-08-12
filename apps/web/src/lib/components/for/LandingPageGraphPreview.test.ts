import { describe, it, expect } from "vitest";
import { getAllLandingPages } from "$lib/content/for/registry";
import { getPositions } from "$lib/components/for/graph-preview-layout";

describe("LandingPageGraphPreview Layout & Positions", () => {
  const distance = (
    p1: { cx: number; cy: number },
    p2: { cx: number; cy: number },
  ) => Math.hypot(p1.cx - p2.cx, p1.cy - p2.cy);

  it("ensures no node position overlaps another for 5-step graphs", () => {
    const positions = getPositions(5);
    expect(positions).toHaveLength(5);
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const d = distance(positions[i], positions[j]);
        expect(
          d,
          `Nodes ${i} and ${j} are overlapping (distance: ${d}px)`,
        ).toBeGreaterThan(60);
      }
    }
  });

  it("ensures 6th step node does NOT overlap hub or any other node in 6-step graphs", () => {
    const positions = getPositions(6);
    expect(positions).toHaveLength(6);
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const d = distance(positions[i], positions[j]);
        expect(
          d,
          `Nodes ${i} and ${j} are overlapping (distance: ${d}px)`,
        ).toBeGreaterThan(60);
      }
    }
  });

  it("verifies all registered landing page graphs render with non-overlapping node positions", () => {
    const pages = getAllLandingPages().filter((p) => p.exampleGraph);
    for (const page of pages) {
      const stepCount = page.exampleGraph!.steps.length;
      const positions = getPositions(stepCount);
      expect(
        positions.length,
        `${page.slug} position count mismatch`,
      ).toBeGreaterThanOrEqual(stepCount);

      for (let i = 0; i < stepCount; i++) {
        for (let j = i + 1; j < stepCount; j++) {
          const d = distance(positions[i], positions[j]);
          expect(
            d,
            `${page.slug}: Nodes ${i} (${page.exampleGraph!.steps[i].label}) and ${j} (${page.exampleGraph!.steps[j].label}) overlap`,
          ).toBeGreaterThan(60);
        }
      }
    }
  });
});
