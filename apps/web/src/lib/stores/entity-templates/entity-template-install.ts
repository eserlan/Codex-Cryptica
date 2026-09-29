import {
  importTemplatePackage,
  type EntityTemplate,
} from "entity-template-engine";
import type { PublicEntityTemplatePackage } from "schema";
import { categories } from "$lib/stores/categories.svelte";
import {
  EntityTemplateDirectoryError,
  publicEntityTemplateDirectoryService,
} from "$lib/services/publishing/PublicEntityTemplateDirectoryService";
import { entityTemplateStore } from "./entity-template-store.svelte";

/**
 * Turns a community listing into one ordinary user template in this vault.
 *
 * It is validate, resolve a name clash, then a single `create()`. It never sets
 * a default, never reads or writes entities, and keeps no link to the listing,
 * so later changes to the listing cannot reach the installed copy.
 */
export interface InstallDeps {
  service: {
    downloadEntityTemplatePackage(
      listingId: string,
    ): Promise<PublicEntityTemplatePackage>;
  };
  store: {
    readonly list: EntityTemplate[];
    readonly canEdit: boolean;
    create(draft: {
      name: string;
      entityType: string;
      markdown: string;
    }): Promise<EntityTemplate>;
  };
  /** Entity types the vault already has (built-in and custom). */
  getKnownTypes: () => string[];
}

export type InstallResult =
  | { status: "installed"; template: EntityTemplate; notice?: string }
  | { status: "needs-name"; suggestedName: string }
  | { status: "error"; message: string };

const norm = (s: string) => s.trim().toLowerCase();

export async function installEntityTemplate(
  deps: InstallDeps,
  input: { listingId: string; name?: string },
): Promise<InstallResult> {
  if (!deps.store.canEdit) {
    return {
      status: "error",
      message: "Templates can't be added to this vault.",
    };
  }

  let raw: PublicEntityTemplatePackage;
  try {
    raw = await deps.service.downloadEntityTemplatePackage(input.listingId);
  } catch (cause) {
    return {
      status: "error",
      message:
        cause instanceof EntityTemplateDirectoryError || cause instanceof Error
          ? cause.message
          : "Could not download the template.",
    };
  }

  const imported = importTemplatePackage(raw);
  if (!imported.ok) return { status: "error", message: imported.error };

  const draft = {
    ...imported.template,
    name: input.name?.trim() || imported.template.name,
  };
  const taken = deps.store.list.some(
    (t) =>
      norm(t.entityType) === norm(draft.entityType) &&
      norm(t.name) === norm(draft.name),
  );
  if (taken) {
    return {
      status: "needs-name",
      suggestedName: `${imported.template.name} (community)`,
    };
  }

  let template: EntityTemplate;
  try {
    template = await deps.store.create(draft);
  } catch (cause) {
    return {
      status: "error",
      message:
        cause instanceof Error && cause.message
          ? cause.message
          : "The template couldn't be saved.",
    };
  }

  const known = deps.getKnownTypes().map(norm);
  const notice = known.includes(norm(draft.entityType))
    ? undefined
    : `Your vault doesn't have a "${draft.entityType}" category yet. The template is saved under that type and will appear when you add it.`;
  return { status: "installed", template, ...(notice ? { notice } : {}) };
}

/** Production wiring. */
export const installEntityTemplateFromListing = (
  listingId: string,
  name?: string,
) =>
  installEntityTemplate(
    {
      service: publicEntityTemplateDirectoryService,
      store: entityTemplateStore,
      getKnownTypes: () => categories.list.map((c) => c.id),
    },
    { listingId, name },
  );
