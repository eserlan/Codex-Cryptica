/** @vitest-environment jsdom */
import { render, screen, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import DetailFooter from "./DetailFooter.svelte";

const mocks = vi.hoisted(() => ({
  vault: { isGuest: false },
  theme: { jargon: { save: "Inscribe", delete: "Burn" } },
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: mocks.vault }));
vi.mock("#lib/stores/theme.svelte.js", () => ({ themeStore: mocks.theme }));

const props = () => ({
  isEditing: false,
  onCancel: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn(),
  onStartEdit: vi.fn(),
});

afterEach(() => {
  cleanup();
  mocks.vault.isGuest = false;
});

describe.each([
  ["Inscribe", "Burn"],
  ["Upload", "Purge"],
])("DetailFooter with theme words %s/%s", (save, del) => {
  it("uses plain words while editing", () => {
    mocks.theme.jargon = { save, delete: del };
    render(DetailFooter, { ...props(), isEditing: true });
    expect(screen.getByText("Save changes")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.queryByText(new RegExp(save, "i"))).toBeNull();
  });

  it("uses plain words when not editing", () => {
    mocks.theme.jargon = { save, delete: del };
    render(DetailFooter, props());
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
    expect(screen.queryByText(new RegExp(del, "i"))).toBeNull();
  });
});

describe("DetailFooter behaviour", () => {
  it("Cancel calls onCancel and not onSave", async () => {
    const p = { ...props(), isEditing: true };
    render(DetailFooter, p);
    await fireEvent.click(screen.getByText("Cancel"));
    expect(p.onCancel).toHaveBeenCalled();
    expect(p.onSave).not.toHaveBeenCalled();
  });

  it("shows Saving… while saving", () => {
    render(DetailFooter, { ...props(), isEditing: true, isSaving: true });
    expect(screen.getByText("Saving…")).toBeTruthy();
  });

  it("Delete calls onDelete", async () => {
    const p = props();
    render(DetailFooter, p);
    await fireEvent.click(screen.getByTestId("delete-entity-button"));
    expect(p.onDelete).toHaveBeenCalled();
  });

  it("hides Edit and Delete from a guest without edit rights", () => {
    mocks.vault.isGuest = true;
    render(DetailFooter, props());
    expect(screen.queryByText("Edit")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
  });

  it("shows Edit but not Delete to a guest with edit rights", () => {
    mocks.vault.isGuest = true;
    render(DetailFooter, { ...props(), canGuestEdit: true });
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.queryByText("Delete")).toBeNull();
  });
});
