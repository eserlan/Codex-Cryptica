import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";

const storageKey = (vaultId: string | null) =>
  `entity-proposal-ignores:${vaultId ?? "default"}`;

export function loadIgnoredEntityProposals(
  vaultId: string | null,
  storage: StorageLike = browserStorage,
): Set<string> {
  try {
    return new Set(JSON.parse(storage.getItem(storageKey(vaultId)) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function saveIgnoredEntityProposals(
  vaultId: string | null,
  titles: Set<string>,
  storage: StorageLike = browserStorage,
) {
  storage.setItem(storageKey(vaultId), JSON.stringify([...titles]));
}
