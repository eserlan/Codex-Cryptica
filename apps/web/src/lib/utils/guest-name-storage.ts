const GUEST_NAME_KEY = "codex_guest_name";

export function loadGuestDisplayName(
  storage?: Pick<Storage, "getItem"> | null,
) {
  try {
    return storage?.getItem(GUEST_NAME_KEY) || "";
  } catch (err) {
    console.warn("[guest-name-storage] Failed to read guest name", err);
    return "";
  }
}

export function saveGuestDisplayName(
  name: string,
  storage?: Pick<Storage, "setItem"> | null,
) {
  try {
    if (!storage) return false;
    storage?.setItem(GUEST_NAME_KEY, name);
    return true;
  } catch (err) {
    console.warn("[guest-name-storage] Failed to save guest name", err);
    return false;
  }
}
