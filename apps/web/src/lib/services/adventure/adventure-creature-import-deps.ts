import { vault } from "#lib/stores/vault.svelte.js";
import { saveEntityImageFile } from "#lib/components/entity-detail/entity-image-file.js";
import type {
  CreatureImportDeps,
  ExistingCreature,
} from "./adventure-creature-import.js";

export interface CreatureImportEnvironment {
  importDeps: CreatureImportDeps;
  listCreatures(): ExistingCreature[];
}

/** Binds the creature import to the active Vault. */
export function createVaultCreatureImportEnvironment(): CreatureImportEnvironment {
  return {
    importDeps: {
      getVaultId: () => vault.activeVaultId,
      createEntity: (type, title, data) =>
        vault.createEntity(type, title, data),
      saveImage: (id, file) => saveEntityImageFile(id, file),
    },
    listCreatures: () =>
      Object.values(vault.allEntities)
        .filter((entity) => entity.type === "creature")
        .map(({ id, title, adventureSource }) => ({
          id,
          title,
          adventureSource,
        })),
  };
}
