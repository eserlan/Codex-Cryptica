import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEntity: vi.fn(
    async (_type: string, _title: string, _data: Record<string, unknown>) =>
      "creature-id",
  ),
  saveImage: vi.fn(),
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    activeVaultId: "vault-1",
    entityStore: { createEntity: mocks.createEntity },
    allEntities: [],
  },
}));

vi.mock("#lib/components/entity-detail/entity-image-file.js", () => ({
  saveEntityImageFile: mocks.saveImage,
}));

import { createVaultCreatureImportEnvironment } from "./adventure-creature-import-deps.js";

describe("createVaultCreatureImportEnvironment", () => {
  beforeEach(() => {
    mocks.createEntity.mockClear();
  });

  it("creates through the entity store without applying category templates", async () => {
    const environment = createVaultCreatureImportEnvironment();
    const data = { content: "A creature description." };

    await environment.importDeps.createEntity("creature", "Gnoll", data);

    expect(mocks.createEntity).toHaveBeenCalledWith("creature", "Gnoll", data);
    expect(mocks.createEntity.mock.calls[0]?.[2]).not.toHaveProperty(
      "statSheet",
    );
  });
});
