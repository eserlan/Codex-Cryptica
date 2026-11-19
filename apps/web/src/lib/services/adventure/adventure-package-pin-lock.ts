/** Serialises package pin creation and removal across tabs for one Vault/hash. */
export type AdventurePackagePinLock = <T>(
  vaultId: string,
  hash: string,
  operation: () => Promise<T>,
) => Promise<T>;

export const withAdventurePackagePinLock: AdventurePackagePinLock = async <T>(
  vaultId: string,
  hash: string,
  operation: () => Promise<T>,
): Promise<T> => {
  if (typeof navigator === "undefined" || !navigator.locks) {
    throw new Error("adventure-package-pin-lock-unavailable");
  }
  return navigator.locks.request(
    `codex-adventure-package-pin:${vaultId}:${hash}`,
    operation,
  );
};
