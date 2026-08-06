/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { FieldReferenceNode as FieldReferenceNodeType } from "@codex/stat-sheet-engine";
import type { PresentationRenderContext } from "../types";

const { rollStatSheetDiceField } = vi.hoisted(() => ({
  rollStatSheetDiceField: vi.fn(),
}));

vi.mock("$lib/utils/stat-sheet-field-actions", () => ({
  rollStatSheetDiceField,
}));

import FieldReferenceNode from "./FieldReferenceNode.svelte";

function makeContext(
  fields: PresentationRenderContext["fields"],
): PresentationRenderContext {
  return {
    fields,
    readOnly: false,
    mode: "view",
    onUpdateFieldValue: vi.fn(),
    onUpdateField: vi.fn(),
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
    expect(screen.queryByTestId("presentation-field-dice-target")).toBeNull();
  });

  it("shows a dice field's target before rolling and a compact success indicator after rolling", async () => {
    rollStatSheetDiceField.mockResolvedValueOnce({
      text: "= 17 vs 50 (Success)",
      isError: false,
      success: true,
    });
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "evade",
      label: "Evade",
    };
    const context = makeContext([
      {
        id: "evade",
        label: "Evade",
        type: "dice",
        formula: "1d100",
        value: 50,
      },
    ]);

    render(FieldReferenceNode, { props: { node, context } });

    expect(
      screen.getByTestId("presentation-field-dice-target").textContent,
    ).toContain("Target: 50");
    await fireEvent.click(screen.getByTestId("presentation-field-dice-roll"));

    const roll = screen.getByTestId("presentation-field-dice-roll");
    expect(screen.getByRole("img", { name: "Success" })).toBeTruthy();
    expect(
      screen.getByTestId("presentation-field-dice-outcome").className,
    ).toContain("text-theme-primary");
    expect(roll.textContent).not.toContain("= 17 vs 50");
    expect(roll.textContent).not.toContain("Success");
  });

  it("uses the semantic danger color for a failed target roll", async () => {
    rollStatSheetDiceField.mockResolvedValueOnce({
      text: "= 73 vs 50 (Failure)",
      isError: false,
      success: false,
    });
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "evade",
      label: "Evade",
    };
    const context = makeContext([
      {
        id: "evade",
        label: "Evade",
        type: "dice",
        formula: "1d100",
        value: 50,
      },
    ]);

    render(FieldReferenceNode, { props: { node, context } });
    await fireEvent.click(screen.getByTestId("presentation-field-dice-roll"));

    expect(screen.getByRole("img", { name: "Failure" })).toBeTruthy();
    const outcome = screen.getByTestId("presentation-field-dice-outcome");
    expect(outcome.className).toContain("text-theme-danger");
    expect(outcome.textContent).not.toContain("73");
  });

  it("renders a compact d100 dice roll with its label and percentage target instead of its formula", () => {
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "perception",
      label: "Perception",
      displayMode: "name-target",
    };
    const context = makeContext([
      {
        id: "perception",
        label: "Perception",
        type: "dice",
        formula: "1d100",
        value: 45,
      },
    ]);

    render(FieldReferenceNode, { props: { node, context } });

    const roll = screen.getByTestId("presentation-field-dice-roll");
    expect(roll.textContent).toContain("Perception");
    expect(roll.textContent).toContain("45%");
    expect(roll.textContent).not.toContain("1d100");
    expect(roll.textContent).not.toContain("Target:");
  });
});
