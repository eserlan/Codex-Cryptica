import { isFamilyType, resolveFamilyAlias } from "@codex/family-engine";
import type { VaultStore } from "../vault.svelte";

type ConnectionVault = Pick<
  VaultStore,
  "entities" | "addFamilyLink" | "updateConnection"
> & { entityStore: Pick<VaultStore["entityStore"], "addConnection"> };

/** Redirect freeform family phrases to reciprocal links; retain generic connections otherwise. */
export class VaultConnectionRouting {
  constructor(private vault: ConnectionVault) {}
  async addConnection(
    sId: string,
    tId: string,
    type: string,
    label?: string,
    strength?: number,
  ): Promise<boolean> {
    const alias = this.familyAlias(sId, tId, type, label);
    if (!alias)
      return this.vault.entityStore.addConnection(
        sId,
        tId,
        type,
        label,
        strength,
      );
    const result = await this.vault.addFamilyLink(sId, tId, alias.type);
    if (!result.ok) return false;
    await this.attachFamilyLabel(sId, tId, alias);
    return true;
  }

  private familyAlias(sId: string, tId: string, type: string, label?: string) {
    if (isFamilyType(type) || !label) return null;
    const alias = resolveFamilyAlias(label);
    return alias &&
      this.vault.entities[sId]?.type === "character" &&
      this.vault.entities[tId]?.type === "character"
      ? alias
      : null;
  }

  private async attachFamilyLabel(
    sId: string,
    tId: string,
    alias: NonNullable<ReturnType<typeof resolveFamilyAlias>>,
  ) {
    // Best-effort: the family link itself is already written and
    // correct at this point, so a failure to attach the display term
    // (e.g. "Mother") must not report the whole redirect as failed.
    try {
      const labelled = await this.vault.updateConnection(
        sId,
        tId,
        alias.type,
        alias.type,
        alias.label,
      );
      if (labelled === false) {
        console.warn(
          `addConnection: family link ${sId}->${tId} (${alias.type}) created, but attaching its display label "${alias.label}" failed.`,
        );
      }
    } catch (err) {
      console.warn(
        `addConnection: family link ${sId}->${tId} (${alias.type}) created, but attaching its display label "${alias.label}" threw.`,
        err,
      );
    }
  }
}
