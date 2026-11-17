import type { Entity } from "schema";
import { vault } from "#lib/stores/vault.svelte.js";

type SpeciesPatch = Pick<
  Partial<Entity>,
  "speciesDefinition" | "appliedSpecies"
>;
interface SpeciesVault {
  readonly isGuest: boolean;
  bulkUpdate(
    patches: Record<string, SpeciesPatch>,
  ): Promise<{ succeededIds: string[] }>;
}

/** Use the existing staged write seam so a failed disk write retains the saved selection. */
export class SpeciesPersistence {
  constructor(private readonly source: SpeciesVault = vault) {}

  async save(id: string, patch: SpeciesPatch): Promise<void> {
    if (this.source.isGuest) throw new Error("This vault is read-only.");
    const result = await this.source.bulkUpdate({ [id]: patch });
    if (!result.succeededIds.includes(id))
      throw new Error("The entity could not be saved.");
  }
}

export const speciesPersistence = new SpeciesPersistence();
