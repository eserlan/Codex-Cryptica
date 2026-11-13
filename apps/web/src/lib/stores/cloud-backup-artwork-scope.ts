import type { ArtworkBackupConsent } from "./cloud-backup-artwork-consent";

interface Dependencies<T extends { ok: boolean }> {
  lock<R>(key: string, action: () => Promise<R>): Promise<R>;
  readConsent(vaultId: string): Promise<ArtworkBackupConsent>;
  upload(scope: { includeAdventures: boolean; forceFull: boolean }): Promise<T>;
  confirmRemoval(vaultId: string, removalId: string): Promise<boolean>;
}
export type ArtworkBackupScope = Omit<Dependencies<{ ok: boolean }>, "upload">;

/** Hold the consent lock until upload finishes so revocation cannot race private data. */
export async function runArtworkBackup<T extends { ok: boolean }>(
  vaultId: string,
  deps: Dependencies<T>,
): Promise<T> {
  const result = await deps.lock(
    `cloud-backup-artwork:${vaultId}`,
    async () => {
      const consent = await deps.readConsent(vaultId);
      const outcome = await deps.upload({
        includeAdventures: consent.enabled,
        forceFull: consent.enabled || consent.remoteRemovalPending,
      });
      return {
        outcome,
        removalId: consent.remoteRemovalPending ? consent.removalId : null,
      };
    },
  );
  if (
    result.outcome.ok &&
    result.removalId &&
    !(await deps.confirmRemoval(vaultId, result.removalId))
  )
    throw new Error("Could not record remote adventure removal");
  return result.outcome;
}
