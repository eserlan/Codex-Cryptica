/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type {
  SectionNode as SectionNodeType,
  HeadingNode,
} from "@codex/stat-sheet-engine";
import { computeSectionKeys } from "@codex/stat-sheet-engine";
import type { PresentationRenderContext } from "../types";

import SectionNode from "./SectionNode.svelte";

function makeHeading(text: string): HeadingNode {
  return { type: "heading", level: 3, children: [{ type: "text", text }] };
}

function makeContext(
  overrides: Partial<PresentationRenderContext> = {},
): PresentationRenderContext {
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
    ...overrides,
  };
}

describe("SectionNode", () => {
  it("renders the title and content when not collapsed", () => {
    const node: SectionNodeType = {
      type: "section",
      title: "Skills",
      children: [makeHeading("Athletics")],
    };
    render(SectionNode, {
      props: {
        node,
        context: makeContext({ sectionKeys: new Map([[node, "section-0"]]) }),
      },
    });

    expect(screen.getByText("Skills")).toBeTruthy();
    expect(screen.getByText("Athletics")).toBeTruthy();
    expect(
      screen
        .getByTestId("presentation-section-toggle")
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("hides content but keeps the header when collapsed", () => {
    const node: SectionNodeType = {
      type: "section",
      title: "Skills",
      children: [makeHeading("Athletics")],
    };
    render(SectionNode, {
      props: {
        node,
        context: makeContext({
          sectionKeys: new Map([[node, "section-0"]]),
          isSectionCollapsed: (key) => key === "section-0",
        }),
      },
    });

    expect(screen.getByText("Skills")).toBeTruthy();
    expect(screen.queryByText("Athletics")).toBeNull();
    expect(
      screen
        .getByTestId("presentation-section-toggle")
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("uses a promoted Markdown heading as the accessible collapse control", () => {
    const heading = makeHeading("Characteristics");
    const node: SectionNodeType = {
      type: "section",
      heading,
      children: [makeHeading("Strength")],
    };
    render(SectionNode, {
      props: {
        node,
        context: makeContext({ sectionKeys: new Map([[node, "section-0"]]) }),
      },
    });

    expect(
      screen.getByRole("button", { name: "Characteristics" }),
    ).toBeTruthy();
    expect(screen.getByText("Strength")).toBeTruthy();
  });

  it("toggles by calling onToggleSection with the section's key", async () => {
    const node: SectionNodeType = {
      type: "section",
      title: "Skills",
      children: [],
    };
    const onToggleSection = vi.fn();
    render(SectionNode, {
      props: {
        node,
        context: makeContext({
          sectionKeys: new Map([[node, "section-0"]]),
          onToggleSection,
        }),
      },
    });

    await fireEvent.click(screen.getByTestId("presentation-section-toggle"));
    expect(onToggleSection).toHaveBeenCalledWith("section-0");
  });

  it("renders no toggle for a section without a title", () => {
    const node: SectionNodeType = {
      type: "section",
      children: [makeHeading("Athletics")],
    };
    render(SectionNode, {
      props: {
        node,
        context: makeContext({ sectionKeys: new Map([[node, "section-0"]]) }),
      },
    });

    expect(screen.queryByTestId("presentation-section-toggle")).toBeNull();
    expect(screen.getByText("Athletics")).toBeTruthy();
  });

  it("still shows content for a titleless section even if its key was previously collapsed", () => {
    // A section can lose its title after being collapsed (template edit).
    // With no toggle to recover it, content must never stay stuck hidden.
    const node: SectionNodeType = {
      type: "section",
      children: [makeHeading("Athletics")],
    };
    render(SectionNode, {
      props: {
        node,
        context: makeContext({
          sectionKeys: new Map([[node, "section-0"]]),
          isSectionCollapsed: (key) => key === "section-0",
        }),
      },
    });

    expect(screen.getByText("Athletics")).toBeTruthy();
  });

  it("computeSectionKeys assigns independent keys per section in document order", () => {
    const first: SectionNodeType = {
      type: "section",
      title: "A",
      children: [],
    };
    const second: SectionNodeType = {
      type: "section",
      title: "B",
      children: [{ type: "section", title: "C", children: [] }],
    };
    const keys = computeSectionKeys([first, second]);

    expect(keys.get(first)).toBe("section-0");
    expect(keys.get(second)).toBe("section-1");
    expect(keys.get(second.children[0] as SectionNodeType)).toBe("section-2");
  });
});
