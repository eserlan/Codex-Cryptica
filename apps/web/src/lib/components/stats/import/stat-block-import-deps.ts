import { resolveEntityType } from "generator-engine";
import type { Entity } from "schema";
import type { SheetKind } from "@codex/stat-sheet-engine";
import { vault } from "#lib/stores/vault.svelte.js";
import { categories } from "#lib/stores/categories.svelte.js";
import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";
import { statBlockReaderGateway } from "#lib/services/stat-block-import/reader-gateway.js";
import type { StatBlockImportDeps } from "./stat-block-import-controller.svelte";

/** Wires the import to the real vault, categories and AI policy. */
export function defaultStatBlockImportDeps(
  entityId: string | null,
): StatBlockImportDeps {
  const entities = () => vault.entities as Record<string, Entity>;
  return {
    gateway: statBlockReaderGateway,
    aiDisabled: () => discoveryPolicyStore.aiDisabled,
    targetEntity: () => (entityId ? (entities()[entityId] ?? null) : null),
    findEntityByTitle: (title) => {
      const wanted = title.trim().toLowerCase();
      return (
        Object.values(entities()).find(
          (e) => e.title.trim().toLowerCase() === wanted,
        ) ?? null
      );
    },
    updateEntity: (id, updates) =>
      vault.updateEntity(
        id,
        updates as Parameters<typeof vault.updateEntity>[1],
      ),
    createEntity: (type, title, data) =>
      vault.createEntity(
        type as Entity["type"],
        title,
        data as Partial<Entity>,
      ),
    entityTypeFor: (kind: SheetKind) =>
      resolveEntityType(
        kind === "npc" ? "npc" : "creature",
        categories.list.map((c) => c.id),
      ),
  };
}
