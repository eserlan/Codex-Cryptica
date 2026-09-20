/**
 * Late-bound seams between the Oracle facade, the proposer store and the vault
 * lifecycle. This module has no imports on purpose: each side registers
 * itself here and the other side calls through, so none of them has to import
 * the other (which used to form circular dependencies).
 */

export interface ConnectionProposer {
  analyzeEntityById(
    entityId: string,
    requireSelection?: boolean,
    analysisText?: string,
  ): Promise<unknown>;
  analyzeAndApplyEntityById(
    entityId: string,
    analysisText?: string,
  ): Promise<unknown>;
}

let apiKeyProvider: () => string | null = () => null;
let connectionProposer: ConnectionProposer | null = null;
let vaultLoader: ((vaultId: string) => Promise<void>) | null = null;
let pendingVaultId: string | null = null;

export function setOracleApiKeyProvider(provider: () => string | null) {
  apiKeyProvider = provider;
}

export function getOracleApiKey(): string | null {
  return apiKeyProvider();
}

export function setConnectionProposer(proposer: ConnectionProposer | null) {
  connectionProposer = proposer;
}

export function getConnectionProposer(): ConnectionProposer {
  if (!connectionProposer) {
    throw new Error("Connection proposer is not registered");
  }
  return connectionProposer;
}

/**
 * Registers the Oracle vault loader. A vault switch that happened before the
 * Oracle registered is replayed so its chat history still loads.
 */
export function setOracleVaultLoader(
  loader: ((vaultId: string) => Promise<void>) | null,
) {
  vaultLoader = loader;
  if (loader && pendingVaultId) {
    const id = pendingVaultId;
    pendingVaultId = null;
    loader(id).catch((err) =>
      console.error("[oracle] Failed to load chat history for vault", err),
    );
  }
}

export async function loadOracleForVault(vaultId: string): Promise<void> {
  if (!vaultLoader) {
    pendingVaultId = vaultId;
    return;
  }
  pendingVaultId = null;
  await vaultLoader(vaultId);
}
