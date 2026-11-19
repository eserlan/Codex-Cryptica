import { adventurePackageRepository } from "./adventure-package-storage.js";
import { adventureSessionRepository } from "./adventure-session-repository.js";
import { withAdventurePackagePinLock } from "./adventure-package-pin-lock.js";

interface VaultHandleSource {
  getSpecificVaultHandle(
    vaultId: string,
  ): Promise<FileSystemDirectoryHandle | null | undefined>;
}

/**
 * Points the shared adventure repositories at the open Vault's storage. Every
 * surface that reads adventures (the play screen, the Play hub) must call this
 * first: the repository has no default resolver and otherwise reports an
 * empty adventure list.
 */
export function configureAdventureRepository(vault: VaultHandleSource): void {
  const resolver = async (id: string) => {
    const handle = await vault.getSpecificVaultHandle(id);
    if (!handle) throw new Error("vault-not-open");
    return handle;
  };
  adventureSessionRepository.setRootResolver(resolver);
  adventurePackageRepository.setRootResolver(resolver);
  adventureSessionRepository.setApprovedPackageLookup(
    async (vaultId, hash) =>
      (await adventurePackageRepository.loadStored(vaultId, hash)) !== null,
  );
  adventurePackageRepository.setPackagePinCoordination(
    withAdventurePackagePinLock,
    (vaultId) => adventureSessionRepository.listPinnedPackageHashes(vaultId),
  );
}
