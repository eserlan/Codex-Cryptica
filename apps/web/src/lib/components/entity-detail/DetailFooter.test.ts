/** @vitest-environment jsdom */
import { render, screen, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import DetailFooter from "./DetailFooter.svelte";

const mocks = vi.hoisted(() => ({
  theme: { jargon: { save: "Inscribe", delete: "Burn" } },
}));

vi.mock("#lib/stores/theme.svelte.js", () => ({ themeStore: mocks.theme }));

const props = () => ({
  onCancel: vi.fn(),
  onSave: vi.fn(),
});

afterEach(cleanup);

describe.each([
  ["Inscribe", "Burn"],
  ["Upload", "Purge"],
])("DetailFooter with theme words %s/%s", (save, del) => {
  it("uses plain words while editing", () => {
    mocks.theme.jargon = { save, delete: del };
    render(DetailFooter, props());
    expect(screen.getByText("Save changes")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.queryByText(new RegExp(save, "i"))).toBeNull();
  });
});

describe("DetailFooter behaviour", () => {
  it("Cancel calls onCancel and not onSave", async () => {
    const p = props();
    render(DetailFooter, p);
    await fireEvent.click(screen.getByText("Cancel"));
    expect(p.onCancel).toHaveBeenCalled();
    expect(p.onSave).not.toHaveBeenCalled();
  });

  it("shows Saving… while saving", () => {
    render(DetailFooter, { ...props(), isSaving: true });
    expect(screen.getByText("Saving…")).toBeTruthy();
  });

  it("Save calls onSave", async () => {
    const p = props();
    render(DetailFooter, p);
    await fireEvent.click(screen.getByText("Save changes"));
    expect(p.onSave).toHaveBeenCalled();
  });
});
