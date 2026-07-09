const storageKey = (vaultId: string | null) =>
  `entity-proposal-ignores:${vaultId ?? "default"}`;

export function loadIgnoredEntityProposals(vaultId: string | null): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(vaultId)) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function saveIgnoredEntityProposals(vaultId: string | null, titles: Set<string>) {
  localStorage.setItem(storageKey(vaultId), JSON.stringify([...titles]));
}
