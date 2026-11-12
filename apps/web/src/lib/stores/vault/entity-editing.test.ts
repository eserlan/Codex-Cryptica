import { beforeEach, describe, expect, it, vi } from "vitest";
import { VaultEntityEditing } from "./entity-editing";
import { sessionModeStore } from "../ui/session-mode.svelte";
import { statSheetTemplates } from "../stat-sheet-templates.svelte";
import type { LocalEntity } from "./types";

vi.mock("../ui/session-mode.svelte", () => ({
  sessionModeStore: { isGuestMode: false },
}));
vi.mock("../stat-sheet-templates.svelte", () => ({
  statSheetTemplates: { getDefaultFieldsForCategory: vi.fn() },
}));
function setup() {
  const entities: Record<string, LocalEntity> = {
    hero: { id: "hero", image: "old.webp" } as LocalEntity,
  };
  const vault = {
    entities,
    entityStore: {
      createEntity: vi.fn(),
      updateEntity: vi.fn(async (id: string, patch: Partial<LocalEntity>) => {
        Object.assign(entities[id], patch);
        return true;
      }),
    },
    assetStore: {
      importExternalImage: vi
        .fn()
        .mockResolvedValue({ image: "local.webp", thumbnail: "thumb.webp" }),
    },
  };
  return { vault, editing: new VaultEntityEditing(vault) };
}
beforeEach(() => {
  vi.resetAllMocks();
  sessionModeStore.isGuestMode = false;
});
describe("VaultEntityEditing", () => {
  it("applies category defaults without mutating the input or replacing an explicit sheet", () => {
    const { vault, editing } = setup();
    const fields = [
      { id: "hp", name: "HP", type: "number", value: 10 },
    ] as unknown as NonNullable<
      ReturnType<typeof statSheetTemplates.getDefaultFieldsForCategory>
    >;
    vi.mocked(statSheetTemplates.getDefaultFieldsForCategory).mockReturnValue(
      fields,
    );
    const input = { content: "Lore" };
    editing.createEntity("character", "Hero", input);
    expect(vault.entityStore.createEntity).toHaveBeenCalledWith(
      "character",
      "Hero",
      { content: "Lore", statSheet: { templateId: null, fields } },
    );
    expect(input).toEqual({ content: "Lore" });
    const explicit = { statSheet: { templateId: "mine", fields: [] } };
    editing.createEntity("character", "Hero", explicit);
    expect(vault.entityStore.createEntity).toHaveBeenLastCalledWith(
      "character",
      "Hero",
      explicit,
    );
    expect(
      statSheetTemplates.getDefaultFieldsForCategory,
    ).toHaveBeenCalledTimes(1);
  });

  it("preserves the original update promise while serializing image imports", async () => {
    const { vault, editing } = setup();
    vault.entities.other = { id: "other" } as LocalEntity;
    let release!: (value: { image: string; thumbnail: string }) => void;
    vault.assetStore.importExternalImage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const first = editing.updateEntity("hero", {
      image: "https://example.test/one",
    });
    expect(first).toBe(vault.entityStore.updateEntity.mock.results[0].value);
    await first;
    await vi.waitFor(() =>
      expect(vault.assetStore.importExternalImage).toHaveBeenCalledOnce(),
    );
    await editing.updateEntity("other", { image: "https://example.test/two" });
    expect(vault.assetStore.importExternalImage).toHaveBeenCalledOnce();
    release({ image: "first.webp", thumbnail: "first-thumb.webp" });
    await vi.waitFor(() =>
      expect(vault.entities.other.image).toBe("local.webp"),
    );
    expect(vault.entities.hero.image).toBe("first.webp");
    expect(vault.assetStore.importExternalImage).toHaveBeenNthCalledWith(
      2,
      "https://example.test/two",
      "other",
    );
  });

  it("continues after a failed save and never localizes guest edits", async () => {
    const { vault, editing } = setup();
    vault.entityStore.updateEntity.mockRejectedValueOnce(new Error("save"));
    await expect(
      editing.updateEntity("hero", { image: "https://example.test/failed" }),
    ).rejects.toThrow("save");
    await editing.updateEntity("hero", { image: "https://example.test/ok" });
    await vi.waitFor(() =>
      expect(vault.entities.hero.image).toBe("local.webp"),
    );
    expect(vault.assetStore.importExternalImage).toHaveBeenCalledOnce();
    sessionModeStore.isGuestMode = true;
    await editing.updateEntity("hero", { image: "https://example.test/guest" });
    await Promise.resolve();
    expect(vault.assetStore.importExternalImage).toHaveBeenCalledOnce();
  });

  it("passes creation through when the category has no defaults", () => {
    const { vault, editing } = setup();
    editing.createEntity("note", "Note");
    expect(vault.entityStore.createEntity).toHaveBeenCalledWith(
      "note",
      "Note",
      {},
    );
  });
});
