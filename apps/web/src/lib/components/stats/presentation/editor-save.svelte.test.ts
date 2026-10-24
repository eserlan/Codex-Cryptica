import { describe, expect, it, vi } from "vitest";
import type { PresentationTemplate } from "schema";
vi.mock("$lib/stores/presentation-templates.svelte", () => ({
  presentationTemplates: {},
}));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {},
}));
import { PresentationEditorSaveState } from "./editor-save.svelte";

const saved: PresentationTemplate = {
  id: "t",
  schemaTemplateId: "s",
  name: "Layout",
  source: "[hp]",
  vaultId: null,
  formatVersion: 1,
  isBuiltIn: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
const draft = {
  id: "t",
  schemaTemplateId: "s",
  name: " Layout ",
  description: " description ",
  source: "<script>bad()</script>[hp]",
};
function setup() {
  const saveTemplate = vi.fn().mockResolvedValue(saved);
  const notify = vi.fn();
  const state = new PresentationEditorSaveState({ saveTemplate, notify });
  const onSaved = vi.fn();
  const onClose = vi.fn();
  return { state, saveTemplate, notify, onSaved, onClose };
}

describe("PresentationEditorSaveState", () => {
  it("sanitizes and trims the draft, then notifies and completes callbacks in order", async () => {
    const { state, saveTemplate, notify, onSaved, onClose } = setup();
    const saving = state.save(draft, onSaved, onClose);
    expect(state.isSaving).toBe(true);
    await saving;
    expect(saveTemplate).toHaveBeenCalledWith({
      ...draft,
      name: "Layout",
      description: "description",
      source: "[hp]",
      formatVersion: 1,
    });
    expect(notify).toHaveBeenCalledWith(
      'Saved template "Layout" (1 disallowed item removed)',
    );
    expect(onSaved).toHaveBeenCalledWith(saved);
    expect(onSaved.mock.invocationCallOrder[0]).toBeLessThan(
      onClose.mock.invocationCallOrder[0],
    );
    expect(state.isSaving).toBe(false);
    expect(state.error).toBe("");
  });

  it("skips blank names without starting persistence", async () => {
    const { state, saveTemplate, onSaved, onClose } = setup();
    await state.save({ ...draft, name: " " }, onSaved, onClose);
    expect(saveTemplate).not.toHaveBeenCalled();
    expect(state.isSaving).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([null, new Error("Disk full"), "failure"])(
    "leaves the editor open on persistence failure (%s)",
    async (failure) => {
      const { state, saveTemplate, notify, onSaved, onClose } = setup();
      if (failure === null) saveTemplate.mockResolvedValueOnce(null);
      else saveTemplate.mockRejectedValueOnce(failure);
      await state.save(draft, onSaved, onClose);
      expect(state.error).toBe(
        failure instanceof Error ? "Disk full" : "Failed to save template.",
      );
      expect(state.isSaving).toBe(false);
      expect(onSaved).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(notify).not.toHaveBeenCalled();
    },
  );

  it("clears an earlier error on retry and stores empty descriptions as null", async () => {
    const { state, saveTemplate, notify, onSaved, onClose } = setup();
    saveTemplate.mockResolvedValueOnce(null);
    await state.save(draft, onSaved, onClose);
    await state.save(
      { ...draft, source: "[hp]", description: " " },
      onSaved,
      onClose,
    );
    expect(state.error).toBe("");
    expect(saveTemplate).toHaveBeenLastCalledWith(
      expect.objectContaining({ description: null }),
    );
    expect(notify).toHaveBeenCalledWith('Saved template "Layout"');
  });

  it("reports plural removal counts and catches callback errors", async () => {
    const { state, notify, onSaved, onClose } = setup();
    onSaved.mockImplementation(() => {
      throw new Error("Callback failed");
    });
    await state.save(
      { ...draft, source: "<script>a()</script><script>b()</script>[hp]" },
      onSaved,
      onClose,
    );
    expect(notify).toHaveBeenCalledWith(
      'Saved template "Layout" (2 disallowed items removed)',
    );
    expect(state.error).toBe("Callback failed");
    expect(onClose).not.toHaveBeenCalled();
    expect(state.isSaving).toBe(false);
  });
});
