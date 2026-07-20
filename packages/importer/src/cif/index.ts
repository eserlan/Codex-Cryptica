export {
  CIF_FORMAT,
  SUPPORTED_CIF_VERSIONS,
  CifManifestSchema,
  CifSourceSchema,
  CifWorldSchema,
  CifEntitySchema,
  CifRelationshipSchema,
  CifAssetSchema,
  CifDateSchema,
  type CifManifest,
  type CifSource,
  type CifWorld,
  type CifEntity,
  type CifRelationship,
  type CifAsset,
  type CifDate,
  type CifDates,
  type CifMediaRef,
  type CifValidationError,
} from "./package";

export {
  parseCifFile,
  parseCifPackage,
  DEFAULT_MAX_MANIFEST_BYTES,
  type CifFileInput,
  type CifParseOptions,
  type CifParseResult,
  type CifPackageParseResult,
} from "./parse";

export {
  readCifZip,
  isSafeCifZipPath,
  sha256Hex,
  DEFAULT_CIF_ZIP_LIMITS,
  type CifZipLimits,
  type CifZipContents,
  type CifZipResult,
} from "./zip";

export {
  resolveCifAssets,
  type ResolvedCifAsset,
  type ResolveCifAssetsResult,
} from "./assets";

export {
  normalizeCifPackage,
  cifSourceRefBuilder,
  buildCifSourceRef,
  CIF_MAPPING_RULES,
  CIF_SOURCE_SYSTEM,
  type NormalizeCifResult,
} from "./normalize";

export { validateCifManifest, type CifValidationResult } from "./validate";

export { CifWarningCode } from "./report";
