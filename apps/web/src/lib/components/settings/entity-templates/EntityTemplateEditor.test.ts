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
  markdown: "## Summary\n\nWho they are.\n",
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

const box = () =>
  screen.getByTestId("entity-template-markdown") as HTMLTextAreaElement;

describe("EntityTemplateEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirm.mockResolvedValue(true);
  });

  it("shows the template as plain markdown", () => {
    setup();
    expect(box().value).toBe("## Summary\n\nWho they are.\n");
    expect(
      (screen.getByTestId("entity-template-name") as HTMLInputElement).value,
    ).toBe("Mine");
  });

  it("saves exactly what was typed", async () => {
    const { onSave } = setup();
    await fireEvent.input(box(), { target: { value: "## Goals\n\n- one\n" } });
    await fireEvent.click(screen.getByTestId("entity-template-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual({
      name: "Mine",
      entityType: "character",
      markdown: "## Goals\n\n- one\n",
    });
  });

  it("allows an empty body (a blank note)", async () => {
    const { onSave } = setup();
    await fireEvent.input(box(), { target: { value: "" } });
    await fireEvent.click(screen.getByTestId("entity-template-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].markdown).toBe("");
  });

  it("blocks saving with a plain-language message when the name is missing", async () => {
    const { onSave } = setup({ initial: { ...initial, name: "" } });
    await fireEvent.click(screen.getByTestId("entity-template-save"));
    expect(screen.getByRole("alert").textContent).toBe(
      "Give the template a name.",
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks saving a template that is too long", async () => {
    const { onSave } = setup();
    await fireEvent.input(box(), { target: { value: "x".repeat(50_001) } });
    await fireEvent.click(screen.getByTestId("entity-template-save"));
    expect(screen.getByRole("alert").textContent).toMatch(/too long/);
    expect(onSave).not.toHaveBeenCalled();
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
    await fireEvent.input(box(), { target: { value: "changed" } });
    confirm.mockResolvedValueOnce(false);
    await fireEvent.click(screen.getByTestId("entity-template-cancel"));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(onCancel).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByTestId("entity-template-cancel"));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  it("does not treat undoing an edit as a change", async () => {
    const { onCancel } = setup();
    await fireEvent.input(box(), { target: { value: "changed" } });
    await fireEvent.input(box(), { target: { value: initial.markdown } });
    await fireEvent.click(screen.getByTestId("entity-template-cancel"));
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
    expect(confirm).not.toHaveBeenCalled();
  });
});
