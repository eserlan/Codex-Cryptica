/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { confirm } = vi.hoisted(() => ({
  confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { confirm, notify: vi.fn() },
}));

import EntityTemplateEditor from "./EntityTemplateEditor.svelte";

const initial = {
  name: "Mine",
  entityType: "character",
  sections: [
    { id: "a", title: "Summary", hint: "Who they are." },
    { id: "b", title: "Secrets" },
  ],
};

const setup = (over: Record<string, unknown> = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  render(EntityTemplateEditor, {
    initial,
    title: "Edit template",
    onSave,
    onCancel,
    ...over,
  });
  return { onSave, onCancel };
};

const titles = () =>
  (
    screen.getAllByTestId("entity-template-section-title") as HTMLInputElement[]
  ).map((i) => i.value);

describe("EntityTemplateEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirm.mockResolvedValue(true);
  });

  it("shows a live preview that follows every edit", async () => {
    setup();
    expect(screen.getByTestId("entity-template-preview").textContent).toContain(
      "## Summary",
    );

    await fireEvent.input(
      screen.getAllByTestId("entity-template-section-title")[0],
      {
        target: { value: "Overview" },
      },
    );
    expect(screen.getByTestId("entity-template-preview").textContent).toContain(
      "## Overview",
    );

    await fireEvent.click(screen.getByTestId("entity-template-add-section"));
    expect(titles()).toHaveLength(3);

    await fireEvent.click(
      screen.getAllByTestId("entity-template-remove-section")[0],
    );
    expect(titles()).toEqual(["Secrets", ""]);
  });

  it("reorders sections with the up and down buttons", async () => {
    setup();
    await fireEvent.click(
      screen.getAllByTestId("entity-template-move-down")[0],
    );
    expect(titles()).toEqual(["Secrets", "Summary"]);
    await fireEvent.click(screen.getAllByTestId("entity-template-move-up")[1]);
    expect(titles()).toEqual(["Summary", "Secrets"]);
  });

  it("disables moving the first section up and the last one down", () => {
    setup();
    expect(
      (screen.getAllByTestId("entity-template-move-up")[0] as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getAllByTestId(
          "entity-template-move-down",
        )[1] as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("blocks saving with plain-language messages", async () => {
    const { onSave } = setup({
      initial: {
        name: "",
        entityType: "character",
        sections: [{ id: "a", title: "" }],
      },
    });
    await fireEvent.click(screen.getByTestId("entity-template-save"));
    const alerts = screen.getAllByRole("alert").map((a) => a.textContent);
    expect(alerts).toContain("Give the template a name.");
    expect(alerts).toContain("Every section needs a title.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks saving when there are no sections", async () => {
    const { onSave } = setup({
      initial: { name: "X", entityType: "character", sections: [] },
    });
    await fireEvent.click(screen.getByTestId("entity-template-save"));
    expect(screen.getByRole("alert").textContent).toBe(
      "Add at least one section.",
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves a valid draft", async () => {
    const { onSave } = setup();
    await fireEvent.click(screen.getByTestId("entity-template-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].sections.map((s: any) => s.title)).toEqual([
      "Summary",
      "Secrets",
    ]);
  });

  it("shows the reason when saving fails and keeps the editor open", async () => {
    const { onCancel } = setup({
      onSave: vi
        .fn()
        .mockRejectedValue(new Error("The template couldn't be saved.")),
    });
    await fireEvent.click(screen.getByTestId("entity-template-save"));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "The template couldn't be saved.",
      ),
    );
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("closes straight away when nothing changed", async () => {
    const { onCancel } = setup();
    await fireEvent.click(screen.getByTestId("entity-template-cancel"));
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks before discarding, and Keep editing leaves the editor open", async () => {
    const { onCancel } = setup();
    await fireEvent.input(screen.getByTestId("entity-template-name"), {
      target: { value: "Changed" },
    });
    confirm.mockResolvedValueOnce(false);
    await fireEvent.click(screen.getByTestId("entity-template-cancel"));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(onCancel).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByTestId("entity-template-cancel"));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  it("stays responsive with 50 sections and a very long hint", async () => {
    const sections = Array.from({ length: 50 }, (_, i) => ({
      id: `s${i}`,
      title: `Section ${i}`,
      hint: i === 0 ? "x".repeat(10_000) : undefined,
    }));
    setup({ initial: { name: "Big", entityType: "character", sections } });
    const start = performance.now();
    await fireEvent.input(
      screen.getAllByTestId("entity-template-section-title")[49],
      {
        target: { value: "Renamed" },
      },
    );
    expect(screen.getByTestId("entity-template-preview").textContent).toContain(
      "## Renamed",
    );
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
