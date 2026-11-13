/** @vitest-environment jsdom */
import { render, screen, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import EntityGmNotes from "./EntityGmNotes.svelte";
import type { StorageLike } from "#lib/utils/runtime-deps.js";

const mocks = vi.hoisted(() => ({
  vault: {
    isGuest: false,
    activeVaultId: "v1",
    titleAndAliasIndex: [],
    entities: {},
    allEntities: [],
  },
  revisionService: { pendingDraft: null as any },
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: mocks.vault }));
vi.mock("#lib/stores/theme.svelte.js", () => ({
  themeStore: { jargon: { lore_header: "Hidden Lore" } },
}));
vi.mock("#lib/services/RevisionService.svelte.js", () => ({
  revisionService: mocks.revisionService,
}));
vi.mock("#lib/components/MarkdownEditor.svelte", async () => {
  const mod = await import("./MockMarkdownEditor.svelte");
  return { default: mod.default };
});
vi.mock("./EntityProposals.svelte", () => ({ default: vi.fn() }));

const fakeStorage = (initial?: string) => {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set("codex-entity-gm-notes-open", initial);
  const storage = {
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: vi.fn(),
  } as unknown as StorageLike;
  return { storage, data };
};

const entity = (lore = "The duke is a vampire.") =>
  ({ id: "e1", title: "Duke", type: "npc", lore }) as any;

const renderNotes = (
  props: Partial<{
    entity: any;
    isEditing: boolean;
    storage: StorageLike;
  }> = {},
) =>
  render(EntityGmNotes, {
    entity: entity(),
    isEditing: false,
    editLore: "draft lore",
    onEntityClick: vi.fn(),
    ...props,
  });

afterEach(() => {
  cleanup();
  mocks.vault.isGuest = false;
  mocks.revisionService.pendingDraft = null;
});

describe("EntityGmNotes", () => {
  it("is closed by default and keeps the lore out of the DOM", () => {
    renderNotes({ storage: fakeStorage().storage });
    const toggle = screen.getByRole("button", { name: /GM notes/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("The duke is a vampire.")).toBeNull();
  });

  it("opens on click, shows the lore and remembers the choice", async () => {
    const { storage, data } = fakeStorage();
    renderNotes({ storage });
    const toggle = screen.getByRole("button", { name: /GM notes/ });
    await fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("The duke is a vampire.")).toBeTruthy();
    expect(data.get("codex-entity-gm-notes-open")).toBe("1");
  });

  it("starts open from a stored choice and closes again on click", async () => {
    const { storage, data } = fakeStorage("1");
    renderNotes({ storage });
    const toggle = screen.getByRole("button", { name: /GM notes/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("The duke is a vampire.")).toBeTruthy();
    await fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("The duke is a vampire.")).toBeNull();
    expect(data.get("codex-entity-gm-notes-open")).toBe("0");
  });

  it("shows the editor with no toggle while editing and leaves the choice alone", () => {
    const { storage, data } = fakeStorage("0");
    renderNotes({ storage, isEditing: true });
    expect(screen.getByTestId("mock-editor-editable")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(data.get("codex-entity-gm-notes-open")).toBe("0");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("labels the section, marks it GM only and hides the themed subtitle from readers", () => {
    renderNotes({ storage: fakeStorage().storage });
    expect(
      screen.getByRole("heading", { level: 3, name: /GM notes/ }),
    ).toBeTruthy();
    expect(screen.getByText("GM only")).toBeTruthy();
    const subtitle = screen.getByText("Hidden Lore");
    expect(subtitle.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the proposed lore from a pending draft when open", () => {
    mocks.revisionService.pendingDraft = { entityId: "e1", lore: "New lore" };
    renderNotes({ storage: fakeStorage("1").storage });
    expect(screen.getByText("Proposed")).toBeTruthy();
    expect(screen.getByText("New lore")).toBeTruthy();
  });

  it("is absent for an owner with no lore, not editing and no draft", () => {
    renderNotes({ entity: entity("  "), storage: fakeStorage().storage });
    expect(screen.queryByTestId("entity-gm-notes")).toBeNull();
  });

  it("is absent for a guest, with lore or while editing", () => {
    mocks.vault.isGuest = true;
    renderNotes({ storage: fakeStorage("1").storage });
    expect(screen.queryByTestId("entity-gm-notes")).toBeNull();
    expect(screen.queryByText("The duke is a vampire.")).toBeNull();
    cleanup();
    renderNotes({ isEditing: true, storage: fakeStorage().storage });
    expect(screen.queryByTestId("entity-gm-notes")).toBeNull();
  });
});
