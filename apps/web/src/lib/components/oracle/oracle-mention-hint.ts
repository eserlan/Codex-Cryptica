import { FEATURE_HINTS, HINT_KEYS } from "$lib/config/help-content";
import type { StorageLike } from "$lib/utils/runtime-deps";

/**
 * One-time hint for the first `@` in the Oracle composer. It is shown once per
 * device. A storage failure counts as "not shown" so the hint never blocks the
 * composer.
 */
export function takeMentionHint(storage: StorageLike): string | null {
  try {
    if (storage.getItem(HINT_KEYS.ORACLE_MENTIONS)) return null;
    storage.setItem(HINT_KEYS.ORACLE_MENTIONS, "true");
  } catch {
    return null;
  }
  return FEATURE_HINTS["oracle-mentions"].content;
}
