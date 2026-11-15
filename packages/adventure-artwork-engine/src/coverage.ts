import { isValidArtworkAssetUrl, type ArtworkAsset } from "./catalogue";
import { ARTWORK_CUES, NPC_ROLE_CUES } from "./cues";
import { matchArtwork } from "./matching";

export type ArtworkCoverageState =
  | "no image produced"
  | "image registered without matching cue"
  | "R2 URL missing or unverified"
  | "valid image in catalogue";

export type RemoteVerificationStatus = "verified" | "failed" | "skipped";

export interface RemoteVariantVerification {
  ok: boolean;
  status?: number;
  contentType?: string | null;
  redirected?: boolean;
  bytes?: number;
  width?: number;
  height?: number;
  error?: string;
}

export interface RemoteAssetVerificationResult {
  assetId: string;
  verified: boolean;
  preview?: RemoteVariantVerification;
  display?: RemoteVariantVerification;
  error?: string;
}

export interface DeferredGenreSlot {
  genre: string;
  types: readonly ArtworkAsset["type"][];
  reason: string;
}

export interface AssetCoverageEntry {
  id: string;
  type: ArtworkAsset["type"];
  genres: readonly ArtworkAsset["genres"][number][];
  primaryCues: readonly string[];
  metadataEligible: boolean;
  remoteStatus: RemoteVerificationStatus;
  state: ArtworkCoverageState;
  reason?: string;
}

export interface RoleCueCoverageEntry {
  cue: string;
  trackedPendingGap: boolean;
  trackedIssue?: string;
  eligibleAssetIds: readonly string[];
  primaryWinnerByGenre: Readonly<
    Partial<Record<ArtworkAsset["genres"][number], string>>
  >;
  state: ArtworkCoverageState;
  remoteStatus: RemoteVerificationStatus;
}

export interface ArtworkCoverageReport {
  totalAssets: number;
  totalCues: number;
  countsByType: Readonly<Record<ArtworkAsset["type"], number>>;
  countsByGenreAndType: Readonly<
    Record<string, Readonly<Record<ArtworkAsset["type"], number>>>
  >;
  activeNpcRoleCues: readonly string[];
  roleCues: readonly RoleCueCoverageEntry[];
  missingRoleCues: readonly string[];
  trackedPendingGaps: readonly string[];
  undocumentedRoleGaps: readonly string[];
  deferredGenreSlots: readonly DeferredGenreSlot[];
  assets: readonly AssetCoverageEntry[];
  stateCounts: Readonly<Record<ArtworkCoverageState, number>>;
  remoteVerificationPerformed: boolean;
}

export interface CoverageReportOptions {
  assets: readonly ArtworkAsset[];
  cues?: readonly string[];
  remoteVerification?:
    | ReadonlyMap<string, RemoteAssetVerificationResult>
    | Readonly<Record<string, RemoteAssetVerificationResult>>;
  trackedPendingRoleGaps?: readonly string[];
  expectedRoleAssets?: Readonly<Record<string, readonly string[]>>;
}

export const TRACKED_PENDING_ROLE_GAPS = [
  "elder",
  "witch",
  "cultist",
  "bandit",
  "official",
  "urchin",
  "goblin",
  "necromancer",
  "informant",
] as const;

export const TRACKED_PENDING_ROLE_GAPS_ISSUE = "#4845–#4847";

export const PR_4841_ROLE_CUES = [
  "innkeeper",
  "healer",
  "smith",
  ...TRACKED_PENDING_ROLE_GAPS,
] as const;

const PHASE_3_TYPES: readonly ArtworkAsset["type"][] = [
  "location",
  "npc",
  "scene",
  "atmosphere",
];

const PHASE_3_GENRES = [
  "cyberpunk",
  "steampunk",
  "western",
  "cosmic-horror",
  "gothic",
  "apocalyptic",
  "pirate",
  "mythic",
] as const;

export const DEFERRED_GENRE_SLOTS: readonly DeferredGenreSlot[] = [
  {
    genre: "science-fiction",
    types: ["npc", "scene"],
    reason: "Deferred Phase 2 genre pack",
  },
  {
    genre: "horror",
    types: ["npc", "scene"],
    reason: "Deferred Phase 2 genre pack",
  },
  {
    genre: "contemporary",
    types: ["scene"],
    reason: "Deferred Phase 2 genre pack",
  },
  {
    genre: "neutral",
    types: ["npc", "scene"],
    reason: "Deferred Phase 2 genre pack",
  },
  ...PHASE_3_GENRES.map((genre) => ({
    genre,
    types: PHASE_3_TYPES,
    reason: "Phase 3 theme pack — requires genre enum expansion",
  })),
];

const CORE_GENRES: readonly ArtworkAsset["genres"][number][] = [
  "fantasy",
  "contemporary",
  "science-fiction",
  "horror",
  "neutral",
];

function readRemoteResult(
  remoteVerification: CoverageReportOptions["remoteVerification"],
  assetId: string,
): RemoteAssetVerificationResult | undefined {
  if (!remoteVerification) return undefined;
  if (remoteVerification instanceof Map) {
    return remoteVerification.get(assetId);
  }
  return (
    remoteVerification as Readonly<
      Record<string, RemoteAssetVerificationResult>
    >
  )[assetId];
}

function isAssetMetadataEligible(asset: ArtworkAsset): {
  eligible: boolean;
  reason?: string;
} {
  if (asset.withdrawn) return { eligible: false, reason: "Asset is withdrawn" };
  if (asset.review.status !== "approved") {
    return { eligible: false, reason: "Asset review is not approved" };
  }
  if (asset.primaryCues.length === 0 || asset.genres.length === 0) {
    return {
      eligible: false,
      reason: "Asset is missing primaryCues or genres",
    };
  }
  if (asset.primaryCues.some((cue) => asset.excludes.includes(cue))) {
    return {
      eligible: false,
      reason: "Asset excludes one of its own primaryCues",
    };
  }
  const matchesSelf = asset.genres.some(
    (genre) =>
      matchArtwork([asset], {
        type: asset.type,
        genre,
        primaryCues: asset.primaryCues,
      })?.id === asset.id,
  );
  if (!matchesSelf) {
    return {
      eligible: false,
      reason: "Asset does not match its own structured cues via matchArtwork",
    };
  }
  return { eligible: true };
}

function resolveRemoteState(
  remoteResult: RemoteAssetVerificationResult | undefined,
  remoteVerificationPerformed: boolean,
): {
  state: ArtworkCoverageState;
  remoteStatus: RemoteVerificationStatus;
  reason?: string;
} {
  if (!remoteVerificationPerformed) {
    return {
      state: "R2 URL missing or unverified",
      remoteStatus: "skipped",
      reason: "Remote R2 verification was skipped (metadata-only check)",
    };
  }
  if (remoteResult?.verified) {
    return { state: "valid image in catalogue", remoteStatus: "verified" };
  }
  return {
    state: "R2 URL missing or unverified",
    remoteStatus: "failed",
    reason:
      remoteResult?.error ?? "Remote R2 verification failed or missing result",
  };
}

function classifyAssetCoverage(
  asset: ArtworkAsset,
  remoteResult: RemoteAssetVerificationResult | undefined,
  remoteVerificationPerformed: boolean,
): AssetCoverageEntry {
  const { eligible, reason } = isAssetMetadataEligible(asset);
  const validUrls =
    isValidArtworkAssetUrl(asset.variants.preview.url) &&
    isValidArtworkAssetUrl(asset.variants.display.url);

  let state: ArtworkCoverageState;
  let remoteStatus: RemoteVerificationStatus = remoteVerificationPerformed
    ? remoteResult?.verified
      ? "verified"
      : "failed"
    : "skipped";
  let entryReason = reason;

  if (!eligible) {
    state = "image registered without matching cue";
  } else if (!validUrls) {
    state = "R2 URL missing or unverified";
    remoteStatus = remoteVerificationPerformed ? "failed" : "skipped";
    entryReason = "Asset has missing or invalid R2 variant URL";
  } else {
    const resolved = resolveRemoteState(
      remoteResult,
      remoteVerificationPerformed,
    );
    state = resolved.state;
    remoteStatus = resolved.remoteStatus;
    entryReason = resolved.reason;
  }

  return {
    id: asset.id,
    type: asset.type,
    genres: [...asset.genres],
    primaryCues: [...asset.primaryCues],
    metadataEligible: eligible,
    remoteStatus,
    state,
    ...(entryReason ? { reason: entryReason } : {}),
  };
}

function buildEmptyTypeCounts(): Record<ArtworkAsset["type"], number> {
  return { location: 0, npc: 0, scene: 0, atmosphere: 0 };
}

function collectAssetCoverage(
  assets: readonly ArtworkAsset[],
  remoteVerification: CoverageReportOptions["remoteVerification"],
  remoteVerificationPerformed: boolean,
) {
  const countsByType = buildEmptyTypeCounts();
  const countsByGenreAndType: Record<
    string,
    Record<ArtworkAsset["type"], number>
  > = {};
  for (const genre of CORE_GENRES) {
    countsByGenreAndType[genre] = buildEmptyTypeCounts();
  }
  const stateCounts: Record<ArtworkCoverageState, number> = {
    "no image produced": 0,
    "image registered without matching cue": 0,
    "R2 URL missing or unverified": 0,
    "valid image in catalogue": 0,
  };
  const assetEntries: AssetCoverageEntry[] = [];
  const assetById = new Map<string, AssetCoverageEntry>();
  let totalAssets = 0;

  for (const asset of assets) {
    const entry = classifyAssetCoverage(
      asset,
      readRemoteResult(remoteVerification, asset.id),
      remoteVerificationPerformed,
    );
    assetEntries.push(entry);
    assetById.set(entry.id, entry);
    stateCounts[entry.state]++;

    if (!asset.withdrawn && asset.review.status === "approved") {
      totalAssets++;
      countsByType[asset.type]++;
      for (const genre of asset.genres) {
        countsByGenreAndType[genre] ??= buildEmptyTypeCounts();
        countsByGenreAndType[genre][asset.type]++;
      }
    }
  }

  assetEntries.sort((a, b) => a.id.localeCompare(b.id));
  return {
    totalAssets,
    countsByType,
    countsByGenreAndType,
    stateCounts,
    assetEntries,
    assetById,
  };
}

function resolveRoleCueState(
  cue: string,
  eligibleAssetIds: readonly string[],
  assetById: ReadonlyMap<string, AssetCoverageEntry>,
  assetsByIdRaw: ReadonlyMap<string, ArtworkAsset>,
  expectedRoleAssets: Readonly<Record<string, readonly string[]>>,
  remoteVerificationPerformed: boolean,
): { state: ArtworkCoverageState; remoteStatus: RemoteVerificationStatus } {
  if (eligibleAssetIds.length === 0) {
    const expectedIds = expectedRoleAssets[cue] ?? [];
    const hasRegisteredMismatch = expectedIds.some((id) =>
      assetsByIdRaw.has(id),
    );
    return {
      state: hasRegisteredMismatch
        ? "image registered without matching cue"
        : "no image produced",
      remoteStatus: remoteVerificationPerformed ? "failed" : "skipped",
    };
  }
  const entries = eligibleAssetIds
    .map((id) => assetById.get(id))
    .filter((entry): entry is AssetCoverageEntry => Boolean(entry));
  if (entries.some((entry) => entry.state === "valid image in catalogue")) {
    return { state: "valid image in catalogue", remoteStatus: "verified" };
  }
  if (entries.some((entry) => entry.state === "R2 URL missing or unverified")) {
    return {
      state: "R2 URL missing or unverified",
      remoteStatus: remoteVerificationPerformed ? "failed" : "skipped",
    };
  }
  return {
    state: "image registered without matching cue",
    remoteStatus: remoteVerificationPerformed ? "failed" : "skipped",
  };
}

function evaluateRoleCue(
  cue: string,
  assets: readonly ArtworkAsset[],
  assetById: ReadonlyMap<string, AssetCoverageEntry>,
  assetsByIdRaw: ReadonlyMap<string, ArtworkAsset>,
  trackedSet: ReadonlySet<string>,
  expectedRoleAssets: Readonly<Record<string, readonly string[]>>,
  remoteVerificationPerformed: boolean,
): RoleCueCoverageEntry {
  const eligibleAssetIds = assets
    .filter(
      (asset) =>
        asset.type === "npc" &&
        asset.genres.some(
          (genre) =>
            matchArtwork([asset], {
              type: "npc",
              genre,
              primaryCues: [cue],
            })?.id === asset.id,
        ),
    )
    .map((asset) => asset.id)
    .sort((a, b) => a.localeCompare(b));

  const primaryWinnerByGenre: Partial<
    Record<ArtworkAsset["genres"][number], string>
  > = {};
  for (const genre of CORE_GENRES) {
    const winner = matchArtwork(assets, {
      type: "npc",
      genre,
      primaryCues: [cue],
    });
    if (winner) primaryWinnerByGenre[genre] = winner.id;
  }

  const trackedPendingGap = trackedSet.has(cue);
  const { state, remoteStatus } = resolveRoleCueState(
    cue,
    eligibleAssetIds,
    assetById,
    assetsByIdRaw,
    expectedRoleAssets,
    remoteVerificationPerformed,
  );

  return {
    cue,
    trackedPendingGap,
    ...(trackedPendingGap
      ? { trackedIssue: TRACKED_PENDING_ROLE_GAPS_ISSUE }
      : {}),
    eligibleAssetIds,
    primaryWinnerByGenre,
    state,
    remoteStatus,
  };
}

/**
 * Derive a deterministic coverage report from structured asset metadata and
 * `matchArtwork()` eligibility rules. Never inspects `alt` text or filenames.
 */
export function buildArtworkCoverageReport(
  options: CoverageReportOptions,
): ArtworkCoverageReport {
  const {
    assets,
    cues = ARTWORK_CUES,
    remoteVerification,
    trackedPendingRoleGaps = TRACKED_PENDING_ROLE_GAPS,
    expectedRoleAssets = {},
  } = options;

  const remoteVerificationPerformed = remoteVerification !== undefined;
  const trackedSet = new Set<string>(trackedPendingRoleGaps);
  const roleSet = new Set<string>(NPC_ROLE_CUES);
  const activeNpcRoleCues = cues.filter((cue) => roleSet.has(cue));
  const collected = collectAssetCoverage(
    assets,
    remoteVerification,
    remoteVerificationPerformed,
  );
  const assetsByIdRaw = new Map(assets.map((a) => [a.id, a]));
  const roleCues = activeNpcRoleCues.map((cue) =>
    evaluateRoleCue(
      cue,
      assets,
      collected.assetById,
      assetsByIdRaw,
      trackedSet,
      expectedRoleAssets,
      remoteVerificationPerformed,
    ),
  );
  const missingRoleCues = roleCues
    .filter((entry) => entry.eligibleAssetIds.length === 0)
    .map((entry) => entry.cue);

  return {
    totalAssets: collected.totalAssets,
    totalCues: cues.length,
    countsByType: collected.countsByType,
    countsByGenreAndType: collected.countsByGenreAndType,
    activeNpcRoleCues,
    roleCues,
    missingRoleCues,
    trackedPendingGaps: [...trackedPendingRoleGaps],
    undocumentedRoleGaps: missingRoleCues.filter((cue) => !trackedSet.has(cue)),
    deferredGenreSlots: DEFERRED_GENRE_SLOTS,
    assets: collected.assetEntries,
    stateCounts: collected.stateCounts,
    remoteVerificationPerformed,
  };
}
