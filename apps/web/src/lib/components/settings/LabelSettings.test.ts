import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import LabelSettings from "./LabelSettings.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    labelIndex: ["npc", "quest"],
  },
}));

describe("LabelSettings", () => {
  it("renders Save and Cancel buttons with explicit type='button' when renaming", async () => {
    render(LabelSettings);

    const renameBtn = screen.getByRole("button", { name: "Rename npc label" });
    await fireEvent.click(renameBtn);

    const saveBtn = screen.getByRole("button", { name: "Save" });
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });

    expect(saveBtn.getAttribute("type")).toBe("button");
    expect(cancelBtn.getAttribute("type")).toBe("button");
  });
});
