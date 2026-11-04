/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
const { isTemplateEnabled, toggleTemplateEnabled } = vi.hoisted(() => ({
  isTemplateEnabled: vi.fn(),
  toggleTemplateEnabled: vi.fn(),
}));
vi.mock("#lib/stores/stat-sheet-templates.svelte.js", () => ({
  statSheetTemplates: { isTemplateEnabled, toggleTemplateEnabled },
}));
import StatSheetTemplateToggle from "./StatSheetTemplateToggle.svelte";

describe("StatSheetTemplateToggle", () => {
  it.each([true, false])(
    "shows applicability and toggles the template (enabled: %s)",
    async (enabled) => {
      isTemplateEnabled.mockReturnValue(enabled);
      toggleTemplateEnabled.mockClear();
      render(StatSheetTemplateToggle, { templateId: "sheet" });
      const button = screen.getByTestId("stat-sheet-toggle-enabled");
      expect(button.textContent).toContain(enabled ? "Applicable" : "Hidden");
      expect(button.title).toBe(
        enabled ? "Disable for this Vault" : "Enable for this Vault",
      );
      await fireEvent.click(button);
      expect(toggleTemplateEnabled).toHaveBeenCalledWith("sheet");
    },
  );
});
