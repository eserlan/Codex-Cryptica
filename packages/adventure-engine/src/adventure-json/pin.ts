import type { AdventureSourcePackageRef } from "../types";
import type { StoredAdventurePackage } from "./storage";

export type AdventurePackagePinCheck =
  { ok: true } | { ok: false; reason: "missing" | "mismatch" };

/** Compares a session's pinned package reference with what the Vault holds. */
export function checkAdventurePackagePin(
  ref: AdventureSourcePackageRef,
  stored: StoredAdventurePackage | null,
): AdventurePackagePinCheck {
  if (!stored) return { ok: false, reason: "missing" };
  const matches =
    stored.hash === ref.hash &&
    stored.package.id === ref.packageId &&
    stored.package.version === ref.version &&
    stored.package.formatVersion === ref.formatVersion;
  return matches ? { ok: true } : { ok: false, reason: "mismatch" };
}
