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
      total: 17,
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
    expect(screen.getByRole("status", { name: "17: Success" })).toBeTruthy();
    expect(
      screen.getByTestId("presentation-field-dice-outcome").className,
    ).toContain("text-emerald-400");
    expect(roll.textContent).not.toContain("= 17 vs 50");
    expect(roll.textContent).toContain("17");
    expect(roll.textContent).not.toContain("Success");
  });

  it("uses the semantic danger color for a failed target roll", async () => {
    rollStatSheetDiceField.mockResolvedValueOnce({
      text: "= 73 vs 50 (Failure)",
      isError: false,
      success: false,
      total: 73,
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

    expect(screen.getByRole("status", { name: "73: Failure" })).toBeTruthy();
    const outcome = screen.getByTestId("presentation-field-dice-outcome");
    expect(outcome.className).toContain("text-theme-danger");
    expect(outcome.textContent).toContain("73");
    expect(outcome.textContent).not.toContain("vs");
  });

  it("gives a labelled field a stretched row so a long label does not wrap into a fixed slot", () => {
    // Labels used to sit in a hardcoded 56px slot, so anything longer than a
    // word wrapped onto two lines while the rest of the cell sat empty
    // (#2100).
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "exp_mod",
      label: "Experience Modifier",
    };
    const context = makeContext([
      { id: "exp_mod", label: "Experience Modifier", type: "number", value: 0 },
    ]);

    render(FieldReferenceNode, { props: { node, context } });

    const row = screen.getByTestId("presentation-field-number");
    expect(row.className).toContain("justify-between");
    expect(row.className).not.toContain("inline-flex");

    const labelSpan = screen.getByTitle("Experience Modifier");
    expect(labelSpan.className).toContain("flex-1");
    expect(labelSpan.className).toContain("truncate");
    expect(labelSpan.className).not.toContain("w-14 shrink-0");
  });

  it("keeps an unlabelled field content-sized so a bare control is not flung across its table cell", () => {
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "str",
      hideLabel: true,
    };
    const context = makeContext([
      { id: "str", label: "STR", type: "number", value: 13 },
    ]);

    render(FieldReferenceNode, { props: { node, context } });

    const row = screen.getByTestId("presentation-field-number");
    expect(row.className).toContain("inline-flex");
    expect(row.className).not.toContain("justify-between");
  });

  it("stretches a labelled counter to match the plain rows beside it in a column", () => {
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "ap",
      label: "Action Points",
      displayMode: "counter",
    };
    const context = makeContext([
      { id: "ap", label: "Action Points", type: "counter", value: 3 },
    ]);

    render(FieldReferenceNode, { props: { node, context } });

    const row = screen.getByTestId("presentation-field-counter");
    expect(row.className).toContain("justify-between");
    expect(screen.getByTitle("Action Points").className).toContain("truncate");
  });

  it("keeps an unlabelled counter compact for use inside a table cell", () => {
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "lp",
      hideLabel: true,
      displayMode: "counter",
    };
    const context = makeContext([
      { id: "lp", label: "Luck Points", type: "counter", value: 2 },
    ]);

    render(FieldReferenceNode, { props: { node, context } });

    const row = screen.getByTestId("presentation-field-counter");
    expect(row.className).toContain("inline-flex");
    expect(row.textContent).toContain("2");
  });

  it("uses the field label for counter button aria-labels even when hideLabel suppresses the visual label", () => {
    const node: FieldReferenceNodeType = {
      type: "field-reference",
      fieldId: "lp",
      hideLabel: true,
      displayMode: "counter",
    };
    const context = makeContext([
      { id: "lp", label: "Luck Points", type: "counter", value: 2 },
    ]);

    render(FieldReferenceNode, { props: { node, context } });

    expect(screen.getByRole("button", { name: "Decrease Luck Points" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Increase Luck Points" })).toBeTruthy();
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
