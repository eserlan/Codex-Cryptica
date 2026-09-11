export interface VaultReadinessState {
  isInitialized: boolean;
  activeVaultId: string | null;
  status: string;
}

export function isVaultReadyForGenerators(vault: VaultReadinessState): boolean {
  return (
    vault.isInitialized &&
    vault.activeVaultId !== null &&
    vault.status !== "loading"
  );
}
