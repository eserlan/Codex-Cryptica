import type { CifManifest, CifValidationError } from "./package";
import type { ImportWarning } from "../cc/package";
import { CIF_MAPPING_RULES } from "./normalize";
import {
  noWorldKeyWarning,
  assetsNotImportedWarning,
  unknownExtensionWarning,
  unmappedKindWarning,
} from "./report";

export type CifValidationResult =
  | { ok: true; warnings: ImportWarning[] }
  | { ok: false; errors: CifValidationError[] };

const KNOWN_KINDS = new Set(
  CIF_MAPPING_RULES.rules
    .map((rule) => rule.when.sourceType)
    .filter((kind): kind is string => kind !== undefined),
);

function extensionNamespaces(
  extensions: Record<string, unknown> | undefined,
): string[] {
  return extensions ? Object.keys(extensions) : [];
}

/**
 * Counts distinct assets involved in this package (declared `assets` plus
 * any additionally-referenced `media.assetKey`s) — a union, not a sum, so
 * multiple entities pointing at the same asset don't inflate the count.
 */
function countDistinctAssetKeys(manifest: CifManifest): number {
  const keys = new Set<string>();
  for (const asset of manifest.assets) keys.add(asset.key);
  for (const entity of manifest.entities) {
    for (const media of entity.media ?? []) keys.add(media.assetKey);
  }
  return keys.size;
}

/**
 * Iterative cycle detection over the parent-pointer functional graph
 * (each entity has at most one parent): O(records), never recurses, so a
 * pathologically deep chain can't overflow the stack.
 */
function findHierarchyCycle(manifest: CifManifest): string[] | null {
  const parentOf = new Map<string, string>();
  for (const entity of manifest.entities) {
    if (entity.parent) parentOf.set(entity.key, entity.parent);
  }

  const RESOLVED = 2;
  const IN_PROGRESS = 1;
  const state = new Map<string, 1 | 2>();

  for (const start of parentOf.keys()) {
    if (state.get(start) === RESOLVED) continue;

    const path: string[] = [];
    let node: string | undefined = start;
    while (node !== undefined) {
      const existing = state.get(node);
      if (existing === RESOLVED) break;
      if (existing === IN_PROGRESS) {
        return path.slice(path.indexOf(node));
      }
      state.set(node, IN_PROGRESS);
      path.push(node);
      node = parentOf.get(node);
    }
    for (const visited of path) state.set(visited, RESOLVED);
  }

  return null;
}

/**
 * Cross-record structural validation the JSON Schema alone can't express
 * (FR-002): unique keys, resolvable references, no self-links, no hierarchy
 * cycles, supported version. Errors and warnings are disjoint — a manifest
 * with only warning-level findings (unmapped kind, unknown extension, assets
 * present, missing worldKey) still returns `ok: true` (FR-011/FR-012).
 */
export function validateCifManifest(
  manifest: CifManifest,
): CifValidationResult {
  // Version support is enforced by CifManifestSchema itself (a `CifManifest`
  // can't exist with an unsupported version) — parseCifFile reports
  // "unsupported-version" at the schema-validation stage instead.
  const errors: CifValidationError[] = [];
  const warnings: ImportWarning[] = [];

  const entityKeys = new Set<string>();
  for (const entity of manifest.entities) {
    if (entityKeys.has(entity.key)) {
      errors.push({
        code: "duplicate-entity-key",
        message: `Entity key "${entity.key}" appears more than once in this package.`,
        recordKey: entity.key,
      });
    }
    entityKeys.add(entity.key);
  }

  const relationshipKeys = new Set<string>();
  for (const rel of manifest.relationships) {
    if (rel.key) {
      if (relationshipKeys.has(rel.key)) {
        errors.push({
          code: "duplicate-relationship-key",
          message: `Relationship key "${rel.key}" appears more than once in this package.`,
          recordKey: rel.key,
        });
      }
      relationshipKeys.add(rel.key);
    }

    if (rel.from === rel.to) {
      errors.push({
        code: "self-link",
        message: `A relationship cannot link "${rel.from}" to itself.`,
        recordKey: rel.key ?? rel.from,
      });
    }
    for (const endpoint of [rel.from, rel.to]) {
      if (!entityKeys.has(endpoint)) {
        errors.push({
          code: "unresolved-endpoint",
          message: `A relationship references entity "${endpoint}", which doesn't exist in this package.`,
          recordKey: rel.key ?? endpoint,
        });
      }
    }
  }

  const assetKeys = new Set(manifest.assets.map((asset) => asset.key));

  for (const entity of manifest.entities) {
    if (entity.parent && !entityKeys.has(entity.parent)) {
      errors.push({
        code: "unresolved-parent",
        message: `Entity "${entity.key}" has parent "${entity.parent}", which doesn't exist in this package.`,
        recordKey: entity.key,
      });
    }
    for (const media of entity.media ?? []) {
      if (!assetKeys.has(media.assetKey)) {
        errors.push({
          code: "unresolved-asset-ref",
          message: `Entity "${entity.key}" references asset "${media.assetKey}", which isn't declared in this package.`,
          recordKey: entity.key,
        });
      }
    }

    if (!KNOWN_KINDS.has(entity.kind)) {
      warnings.push(unmappedKindWarning(entity.key, entity.kind));
    }
    for (const namespace of extensionNamespaces(entity.extensions)) {
      warnings.push(unknownExtensionWarning(namespace, entity.key));
    }
  }

  for (const namespace of extensionNamespaces(manifest.extensions)) {
    warnings.push(unknownExtensionWarning(namespace));
  }

  const cycle = findHierarchyCycle(manifest);
  if (cycle) {
    errors.push({
      code: "hierarchy-cycle",
      message: `These entities form a parent cycle: ${cycle.join(" → ")}.`,
      recordKey: cycle[0],
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (!manifest.source.worldKey) {
    warnings.push(noWorldKeyWarning(manifest.source.system));
  }

  const distinctAssetKeys = countDistinctAssetKeys(manifest);
  if (distinctAssetKeys > 0) {
    warnings.push(assetsNotImportedWarning(distinctAssetKeys));
  }

  return { ok: true, warnings };
}
