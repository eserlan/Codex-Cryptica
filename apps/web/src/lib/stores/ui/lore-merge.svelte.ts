import type {
  LoreMergePlan,
  LoreSectionChoice,
} from "$lib/utils/lore-sections";

/**
 * State for the lore revision review dialog (#2591).
 *
 * Follows the same promise-resolver shape as `notificationStore.confirm`: a
 * service awaits `request()`, the modal resolves it. That keeps the decision
 * inside `acceptDraft` rather than scattering apply logic into a component.
 *
 * Resolves with the composed lore string, or `null` if the reader cancelled —
 * cancelling must abandon the whole apply, not fall through to writing
 * something they did not choose.
 */
export class LoreMergeStore {
  dialog = $state<{
    open: boolean;
    entityTitle: string;
    plan: LoreMergePlan | null;
    resolve: ((value: string | null) => void) | null;
  }>({ open: false, entityTitle: "", plan: null, resolve: null });

  /** Opens the dialog and waits for the reader's decision. */
  async request(
    plan: LoreMergePlan,
    entityTitle: string,
  ): Promise<string | null> {
    // A second request while one is open would orphan the first promise.
    if (this.dialog.open) return null;

    this.dialog = { open: true, entityTitle, plan, resolve: null };

    return new Promise<string | null>((resolve) => {
      this.dialog.resolve = resolve;
    });
  }

  /** Called by the modal with the composed lore, or null to cancel. */
  resolveRequest(lore: string | null) {
    this.dialog.resolve?.(lore);
    this.dialog = { open: false, entityTitle: "", plan: null, resolve: null };
  }

  /** Choices the dialog starts with, taken from each entry's safe default. */
  defaultChoices(plan: LoreMergePlan): Record<string, LoreSectionChoice> {
    return Object.fromEntries(
      plan.entries.map((entry) => [entry.key, entry.defaultChoice]),
    );
  }
}

export const loreMergeStore = new LoreMergeStore();
