import type { ImportWarning } from "../cc/package";

/** CIF-specific warning codes (FR-017: nothing droppable disappears without one of these). */
export const CifWarningCode = {
  NoWorldKey: "cif.no-world-key",
  UnmappedKind: "cif.unmapped-kind",
  UnknownExtension: "cif.unknown-extension",
  AssetsNotImported: "cif.assets-not-imported",
  DuplicateRelationship: "cif.duplicate-relationship",
  DatePrecision: "cif.date-precision",
  KindChanged: "cif.kind-changed",
  AssetUrlNotImported: "cif.asset-url-not-imported",
  AssetUnsupportedType: "cif.asset-unsupported-type",
  AssetUnplaced: "cif.asset-unplaced",
  AssetExtraImageRef: "cif.asset-extra-image-ref",
  ZipIgnoredFile: "cif.zip-ignored-file",
} as const;

export function noWorldKeyWarning(system: string): ImportWarning {
  return {
    code: CifWarningCode.NoWorldKey,
    message: `This package's source ("${system}") has no worldKey, so repeat imports from a different world exported by the same tool could be mismatched. Matching falls back to the producing system and entity keys.`,
  };
}

export function unmappedKindWarning(
  entityKey: string,
  kind: string,
): ImportWarning {
  return {
    code: CifWarningCode.UnmappedKind,
    message: `"${entityKey}"'s kind ("${kind}") isn't one of this app's built-in categories, so it was imported as "Note". You can recategorize it after import.`,
    ref: entityKey,
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

export function assetUrlNotImportedWarning(key: string): ImportWarning {
  return {
    code: CifWarningCode.AssetUrlNotImported,
    message: `The asset "${key}" is only available as a web link, which this importer doesn't download. The entities referencing it were imported without it.`,
    ref: key,
  };
}

export function assetUnsupportedTypeWarning(
  key: string,
  mediaType: string,
): ImportWarning {
  return {
    code: CifWarningCode.AssetUnsupportedType,
    message: `The asset "${key}" is a "${mediaType}" file. Only images can be imported right now, so it was skipped.`,
    ref: key,
  };
}

export function assetUnplacedWarning(key: string): ImportWarning {
  return {
    code: CifWarningCode.AssetUnplaced,
    message: `The asset "${key}" isn't referenced by any entity in this package, so it was not imported.`,
    ref: key,
  };
}

export function assetExtraImageRefWarning(
  entityKey: string,
  key: string,
): ImportWarning {
  return {
    code: CifWarningCode.AssetExtraImageRef,
    message: `"${entityKey}" references more than one image; only the first was attached. "${key}" was skipped.`,
    ref: entityKey,
  };
}

export function zipIgnoredFileWarning(path: string): ImportWarning {
  return {
    code: CifWarningCode.ZipIgnoredFile,
    message: `"${path}" isn't part of the CIF package layout (manifest.json plus an assets folder) and was ignored.`,
    ref: path,
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
