import type { ImportWarning } from "../cc/package";

/** CIF-specific warning codes (FR-017: nothing droppable disappears without one of these). */
export const CifWarningCode = {
  NoWorldKey: "cif.no-world-key",
  UnknownExtension: "cif.unknown-extension",
  AssetsNotImported: "cif.assets-not-imported",
  DuplicateRelationship: "cif.duplicate-relationship",
  DatePrecision: "cif.date-precision",
  KindChanged: "cif.kind-changed",
} as const;

export function noWorldKeyWarning(system: string): ImportWarning {
  return {
    code: CifWarningCode.NoWorldKey,
    message: `This package's source ("${system}") has no worldKey, so repeat imports from a different world exported by the same tool could be mismatched. Matching falls back to the producing system and entity keys.`,
  };
}

export function unknownExtensionWarning(
  namespace: string,
  ref?: string,
): ImportWarning {
  return {
    code: CifWarningCode.UnknownExtension,
    message: `The "${namespace}" extension isn't understood by this importer and was ignored.`,
    ref,
  };
}

export function assetsNotImportedWarning(count: number): ImportWarning {
  return {
    code: CifWarningCode.AssetsNotImported,
    message: `This package references ${count} asset${count === 1 ? "" : "s"}, but media/assets aren't supported yet in this phase. World text content was imported; images and other files were not.`,
  };
}

export function duplicateRelationshipWarning(
  from: string,
  to: string,
  kind: string,
): ImportWarning {
  return {
    code: CifWarningCode.DuplicateRelationship,
    message: `A relationship identical to an earlier one ("${kind}" between the same two entities) was only imported once.`,
    ref: `${from}->${to}`,
  };
}

export function datePrecisionWarning(
  entityKey: string,
  value: string,
): ImportWarning {
  return {
    code: CifWarningCode.DatePrecision,
    message: `The date "${value}" on "${entityKey}" couldn't be understood and was not imported.`,
    ref: entityKey,
  };
}

export function kindChangedWarning(
  entityKey: string,
  previousType: string,
  newKind: string,
): ImportWarning {
  return {
    code: CifWarningCode.KindChanged,
    message: `"${entityKey}" was previously imported as "${previousType}" and this package now describes it as "${newKind}". The category was left unchanged; update it manually if needed.`,
    ref: entityKey,
  };
}
