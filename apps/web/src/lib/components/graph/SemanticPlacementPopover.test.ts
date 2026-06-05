import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SemanticPlacementPopover from "./SemanticPlacementPopover.svelte";
import type { Entity } from "schema";

function entity(type: string): Entity {
  return {
    id: `${type}-1`,
    type,
    title: type === "character" ? "Avel" : "The Ember Court",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    status: "active",
  };
}

describe("SemanticPlacementPopover", () => {
  it("renders character meanings with begin meaning selected and write disclosure", async () => {
    const onSave = vi.fn();
    render(SemanticPlacementPopover, {
      entity: entity("character"),
      targetYear: 580,
      onSave,
      onCancel: vi.fn(),
    });

    expect(await screen.findByText("Born")).toBeTruthy();
    expect(screen.getByText("Died")).toBeTruthy();
    expect(screen.getByText("Active period")).toBeTruthy();
    expect(screen.getByText("Reign")).toBeTruthy();
    expect(screen.getByText("Major appearance")).toBeTruthy();
    expect(screen.getByText("Custom anchor")).toBeTruthy();
    expect((screen.getByLabelText("Born") as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.getByText("This will update the entity date.")).toBeTruthy();
  });

  it("renders faction-specific meanings that differ from characters", async () => {
    render(SemanticPlacementPopover, {
      entity: entity("faction"),
      targetYear: 610,
      onSave: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(await screen.findByText("Founded")).toBeTruthy();
    expect(screen.getByText("Dissolved")).toBeTruthy();
    expect(screen.getByText("Schism")).toBeTruthy();
    expect(screen.queryByText("Born")).toBeNull();
  });

  it("saves a selected anchor meaning and cancels on Escape without saving", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(SemanticPlacementPopover, {
      entity: entity("character"),
      targetYear: 621,
      onSave,
      onCancel,
    });

    await fireEvent.click(await screen.findByLabelText("Major appearance"));
    await fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        meaning: expect.objectContaining({ id: "majorAppearance" }),
        date: { year: 621 },
      }),
    );

    await fireEvent.keyDown(container.firstElementChild as HTMLElement, {
      key: "Escape",
    });
    expect(onCancel).toHaveBeenCalled();
  });

  it("blocks inverted ranges with an explanation", async () => {
    const onSave = vi.fn();
    render(SemanticPlacementPopover, {
      entity: entity("note"),
      targetYear: 600,
      onSave,
      onCancel: vi.fn(),
    });

    await fireEvent.click(await screen.findByLabelText("Associated period"));

    expect(screen.getByText("Start date")).toBeTruthy();
    expect(screen.getByText("End date")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("shows linked anchor status and removes an existing anchor", async () => {
    const onRemove = vi.fn();
    const linkedEntity = {
      ...entity("character"),
      temporalAnchors: [
        {
          id: "appearance",
          type: "majorAppearance",
          date: { year: 621 },
          linkedEntityId: "missing-event",
        },
      ],
    } as Entity;

    render(SemanticPlacementPopover, {
      entity: linkedEntity,
      targetYear: 621,
      existingAnchorId: "appearance",
      linkedEntityTitle: null,
      onSave: vi.fn(),
      onRemove,
      onCancel: vi.fn(),
    });

    expect(
      await screen.findByText(
        "Linked event is missing. The anchor will remain editable.",
      ),
    ).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledWith("appearance");
  });

  it("preselects the existing anchor meaning when editing an anchor", async () => {
    const onSave = vi.fn();
    const linkedEntity = {
      ...entity("character"),
      temporalAnchors: [
        {
          id: "death",
          type: "died",
          date: { year: 640 },
        },
      ],
    } as Entity;

    render(SemanticPlacementPopover, {
      entity: linkedEntity,
      targetYear: 641,
      existingAnchorId: "death",
      onSave,
      onCancel: vi.fn(),
    });

    expect(
      ((await screen.findByLabelText("Died")) as HTMLInputElement).checked,
    ).toBe(true);
    expect((screen.getByLabelText("Born") as HTMLInputElement).checked).toBe(
      false,
    );

    await fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        meaning: expect.objectContaining({ id: "died" }),
        existingAnchorId: "death",
      }),
    );
  });

  it("saves only the edited primary range side", async () => {
    const onSave = vi.fn();
    const rangeEntity = {
      ...entity("note"),
      start_date: { year: 500 },
      end_date: { year: 510 },
    } as Entity;

    render(SemanticPlacementPopover, {
      entity: rangeEntity,
      targetYear: 505,
      existingAnchorId: "primary-range-start",
      onSave,
      onCancel: vi.fn(),
    });

    await fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        existingAnchorId: "primary-range-start",
        start_date: { year: 500 },
        end_date: undefined,
        date: undefined,
      }),
    );
  });

  it("guards against duplicate saves while a save is pending", async () => {
    let resolveSave: (() => void) | undefined;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(SemanticPlacementPopover, {
      entity: entity("character"),
      targetYear: 580,
      onSave,
      onCancel: vi.fn(),
    });

    const saveButton = screen.getByRole("button", { name: "Save" });
    await fireEvent.click(saveButton);
    await fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    resolveSave?.();
  });
});
