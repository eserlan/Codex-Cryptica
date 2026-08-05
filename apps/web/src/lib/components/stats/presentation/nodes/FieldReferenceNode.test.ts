/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { FieldReferenceNode as FieldReferenceNodeType } from "@codex/stat-sheet-engine";
import type { PresentationRenderContext } from "../types";
import FieldReferenceNode from "./FieldReferenceNode.svelte";

function makeContext(
  fields: PresentationRenderContext["fields"],
): PresentationRenderContext {
  return {
    fields,
    readOnly: false,
    mode: "view",
    onUpdateFieldValue: vi.fn(),
    onAdjustCounter: vi.fn(),
  };
}

describe("FieldReferenceNode", () => {
  it("resolves by id when the entity field id matches the reference", () => {
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "hp",
      label: "Hit Points",
      displayMode: "current-max",
    };
    const context = makeContext([
      { id: "hp", label: "Hit Points", type: "counter", value: 33, max: 33 },
    ]);

    render(FieldReferenceNode, { props: { node, context } });

    expect(
      screen.getByTestId("presentation-field-counter").textContent,
    ).toContain("33");
    expect(
      screen.getByTestId("presentation-field-counter").textContent,
    ).toContain("/ 33");
  });

  it("falls back to a label match when the entity field has a different id — the case left over from templates that used to randomize applied field ids", () => {
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "hp",
      label: "Hit Points",
      displayMode: "current-max",
    };
    const context = makeContext([
      {
        id: "field-random-uuid",
        label: "Hit Points",
        type: "counter",
        value: 33,
        max: 33,
      },
    ]);

    render(FieldReferenceNode, { props: { node, context } });

    expect(screen.queryByText(/missing field/i)).toBeNull();
    expect(
      screen.getByTestId("presentation-field-counter").textContent,
    ).toContain("33");
  });

  it("still reports missing when neither id nor label match anything on the entity", () => {
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "hp",
      label: "Hit Points",
    };
    const context = makeContext([
      { id: "ac", label: "Armor Class", type: "number", value: 15 },
    ]);

    render(FieldReferenceNode, { props: { node, context } });

    expect(screen.getByText(/hit points.*missing field/i)).toBeTruthy();
  });

  it("renders dice field roll button in view mode and static preview in preview mode", () => {
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "atk",
      label: "Attack Roll",
    };
    const context = makeContext([
      { id: "atk", label: "Attack Roll", type: "dice", formula: "1d20+5" },
    ]);

    const { unmount } = render(FieldReferenceNode, {
      props: { node, context },
    });
    expect(screen.getByTestId("presentation-field-dice-roll")).toBeTruthy();
    expect(
      screen.getByTestId("presentation-field-dice-roll").textContent,
    ).toContain("1d20+5");
    unmount();

    const previewContext = { ...context, mode: "preview" as const };
    render(FieldReferenceNode, { props: { node, context: previewContext } });
    expect(screen.getByTestId("presentation-field-dice-preview")).toBeTruthy();
  });
});
