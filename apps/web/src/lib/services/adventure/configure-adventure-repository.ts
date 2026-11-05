import { adventureSessionRepository } from "./adventure-session-repository.js";

interface VaultHandleSource {
  getSpecificVaultHandle(
    vaultId: string,
  ): Promise<FileSystemDirectoryHandle | null | undefined>;
}

/**
 * Points the shared adventure repository at the open Vault's storage. Every
 * surface that reads adventures (the play screen, the Play hub) must call this
 * first: the repository has no default resolver and otherwise reports an
 * empty adventure list.
 */
export function configureAdventureRepository(vault: VaultHandleSource): void {
  adventureSessionRepository.setRootResolver(async (id) => {
    const handle = await vault.getSpecificVaultHandle(id);
    if (!handle) throw new Error("vault-not-open");
    return handle;
  });
}
