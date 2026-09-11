/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { GroupNode as GroupNodeType } from "@codex/stat-sheet-engine";
import type { PresentationRenderContext } from "../types";

import GroupNode from "./GroupNode.svelte";

function makeContext(): PresentationRenderContext {
  return {
    fields: [],
    readOnly: false,
    mode: "view",
    sectionKeys: new Map(),
    isSectionCollapsed: () => false,
    onToggleSection: vi.fn(),
    onUpdateFieldValue: vi.fn(),
    onUpdateField: vi.fn(),
    onAdjustCounter: vi.fn(),
  };
}

// Unmounts before returning so a test may sample several column counts
// without `getByTestId` tripping over the previous render.
function renderGroup(columns: number) {
  const node: GroupNodeType = { type: "group", columns, children: [] };
  const { unmount } = render(GroupNode, {
    props: { node, context: makeContext() },
  });
  const className = screen.getByTestId("presentation-group").className;
  unmount();
  return className;
}

describe("GroupNode", () => {
  it("sizes multi-column tracks to their content instead of equal fractions", () => {
    // Equal `1fr` fractions gave a column of three-letter characteristics the
    // same width as a column of two-word attributes — one all gutter, the
    // other wrapping its labels (#2100).
    const className = renderGroup(2);

    expect(className).toContain("sm:grid-cols-[repeat(2,minmax(0,auto))]");
    expect(className).not.toContain("sm:grid-cols-2");
  });

  it("floors every track at 0 so a long value cannot overflow the group", () => {
    for (const columns of [2, 3, 4, 5, 6]) {
      const tracks = renderGroup(columns).match(
        /grid-cols-\[repeat\([0-9]+,[^\]]+\)\]/g,
      );

      expect(tracks?.length).toBeGreaterThan(0);
      for (const track of tracks ?? []) {
        expect(track).toContain("minmax(0,auto)");
      }
    }
  });

  it("still collapses to a single column at a narrow viewport (FR-018)", () => {
    // The unprefixed class is what a mobile viewport gets; the wider tracks
    // are all breakpoint-prefixed.
    expect(renderGroup(2)).toContain("grid-cols-1");
    expect(renderGroup(3)).toContain("grid-cols-1");
  });

  it("keeps dense groups at two columns before the first breakpoint", () => {
    const className = renderGroup(6);

    expect(className).toContain("grid-cols-[repeat(2,minmax(0,auto))]");
    expect(className).toContain("md:grid-cols-[repeat(6,minmax(0,auto))]");
  });

  it("leaves a single-column group on the plain track", () => {
    expect(renderGroup(1)).toBe("grid grid-cols-1 gap-2");
  });
});
