import type { PromptAdventurePackage } from "./context-budget";
import {
  DIRECTOR_HISTORY_LOOKBACK_TURNS,
  type DirectorPackageContext,
} from "./gm-director-brief-contract";
import { appendUniqueClipped, clipText } from "./gm-director-brief-text";
import type {
  AdventureSession,
  PackageProgress,
  PackageProgressStatus,
} from "./types";

type PackageExcerpt = PromptAdventurePackage["playerSafe"][number];

function hasPackageExcerpts(pkg?: PromptAdventurePackage): boolean {
  return Boolean(pkg && (pkg.playerSafe.length > 0 || pkg.gmOnly.length > 0));
}

function supersededIdSet(
  events: ReadonlyArray<{ supersedes?: string }> | undefined,
): Set<string> {
  return new Set(
    (events ?? []).flatMap((event) =>
      event.supersedes ? [event.supersedes] : [],
    ),
  );
}

const CLOSED_PACKAGE_STATUSES = new Set<PackageProgressStatus>([
  "resolved",
  "altered",
  "skipped",
]);

function collectActivePackageRecordIds(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
): string[] {
  const records = progress?.records ?? [];
  const closedIds = new Set(
    records
      .filter((r) => CLOSED_PACKAGE_STATUSES.has(r.status))
      .map((r) => r.id),
  );
  const byStatus = (status: "active" | "available") =>
    records.filter((r) => r.status === status).map((r) => r.id);
  const excerptIds = allExcerpts
    .filter(
      (e) =>
        e.kind !== "premise" && e.kind !== "system" && !closedIds.has(e.id),
    )
    .map((e) => e.id);

  return [
    ...new Set([
      ...byStatus("active"),
      ...byStatus("available"),
      ...excerptIds,
    ]),
  ].slice(0, 8);
}

function summarizeEstablishedActors(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
): DirectorPackageContext["establishedActors"] {
  const pkgActorIds = new Set(
    allExcerpts.filter((e) => e.kind === "actor").map((e) => e.id),
  );
  return [...(progress?.actors ?? [])]
    .sort(
      (a, b) =>
        Number(pkgActorIds.has(b.actorId)) - Number(pkgActorIds.has(a.actorId)),
    )
    .slice(0, 4)
    .map((actor) => ({
      actorId: actor.actorId,
      status: actor.status,
      disposition: actor.disposition,
      ...(actor.facts.length > 0
        ? { facts: actor.facts.slice(-2).map((fact) => clipText(fact, 120)) }
        : {}),
    }));
}

function summarizeLatestPackageEvents(
  progress: PackageProgress | undefined,
): DirectorPackageContext["latestEvents"] {
  const superseded = supersededIdSet(progress?.events);
  return (progress?.events ?? [])
    .filter((event) => !superseded.has(event.id))
    .slice(-4)
    .map((event) => ({
      id: event.id,
      recordId: event.recordId,
      certainty: event.certainty,
      to: event.to,
      note: clipText(event.note, 120),
    }));
}

function collectClaimedFrom<
  T extends { id: string; certainty: string; supersedes?: string },
>(
  events: readonly T[] | undefined,
  format: (event: T) => string,
  push: (text: string) => void,
): void {
  if (!events?.length) return;
  const superseded = supersededIdSet(events);
  for (const event of events) {
    if (!superseded.has(event.id) && event.certainty === "claimed") {
      push(format(event));
    }
  }
}

function collectClaimedUncertainties(
  progress: PackageProgress | undefined,
  push: (text: string) => void,
): void {
  collectClaimedFrom(
    progress?.events,
    (event) => `Claimed (${event.recordId}): ${event.note}`,
    push,
  );
  collectClaimedFrom(
    progress?.actorEvents,
    (actorEvent) =>
      `Claimed actor note (${actorEvent.actorId}): ${actorEvent.note}`,
    push,
  );
}

function collectOpenEpistemicUncertainties(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
  push: (text: string) => void,
): void {
  const resolved = new Set(
    (progress?.records ?? [])
      .filter((r) => r.status === "resolved" || r.status === "altered")
      .map((r) => r.id),
  );
  for (const excerpt of allExcerpts) {
    const open =
      excerpt.epistemicStatus === "ambiguous" ||
      excerpt.epistemicStatus === "unresolved";
    if (open && !resolved.has(excerpt.id)) {
      push(
        `${excerpt.epistemicStatus} ${excerpt.kind} (${excerpt.id}): keep open.`,
      );
    }
  }
}

function collectSummarizedPackageSecretIds(
  session: AdventureSession,
): Set<string> {
  return new Set([
    ...(session.packageProgress?.revealedSecretIds ?? []),
    ...session.hiddenState.secrets
      .filter((secret) => secret.status === "revealed")
      .map((secret) => secret.id),
    ...(session.packageProgress?.records ?? [])
      .filter(
        (record) =>
          record.kind === "secret" &&
          (record.status === "resolved" || record.status === "altered"),
      )
      .map((record) => record.id),
  ]);
}

function collectLegacyPackageSecretReveals(
  session: AdventureSession,
  packageSecretIds: ReadonlySet<string>,
  summarizedIds: ReadonlySet<string>,
): Set<string> {
  const turnIds = new Set<string>();
  // packageProgress is the durable summary for current sessions. The bounded
  // turn lookup retains compatibility for package secrets missing from it.
  if ([...packageSecretIds].some((id) => !summarizedIds.has(id))) {
    for (const turn of session.turns.slice(-DIRECTOR_HISTORY_LOOKBACK_TURNS)) {
      for (const id of turn.revealedSecretIds) {
        if (packageSecretIds.has(id) && !summarizedIds.has(id)) turnIds.add(id);
      }
    }
  }
  return turnIds;
}

function collectRevealedPackageSecretIds(
  session: AdventureSession,
  packageSecretIds: ReadonlySet<string>,
): Set<string> {
  const summarizedIds = collectSummarizedPackageSecretIds(session);
  const turnIds = collectLegacyPackageSecretReveals(
    session,
    packageSecretIds,
    summarizedIds,
  );
  return new Set([...summarizedIds, ...turnIds]);
}

function collectUnrevealedSecretUncertainties(
  session: AdventureSession,
  gmOnly: readonly PackageExcerpt[],
  push: (text: string) => void,
): void {
  const packageSecretIds = new Set(
    gmOnly
      .filter((excerpt) => excerpt.kind === "secret")
      .map((excerpt) => excerpt.id),
  );
  const revealed = collectRevealedPackageSecretIds(session, packageSecretIds);
  for (const excerpt of gmOnly) {
    if (excerpt.kind === "secret" && !revealed.has(excerpt.id)) {
      push(`Unrevealed secret (${excerpt.id}).`);
    }
  }
}

function collectPackageUncertainties(
  session: AdventureSession,
  allExcerpts: readonly PackageExcerpt[],
  pkg?: PromptAdventurePackage,
): string[] {
  const items: string[] = [];
  const push = (text: string) => {
    appendUniqueClipped(items, text, 140);
  };
  collectClaimedUncertainties(session.packageProgress, push);
  collectOpenEpistemicUncertainties(session.packageProgress, allExcerpts, push);
  collectUnrevealedSecretUncertainties(session, pkg?.gmOnly ?? [], push);
  return items.slice(0, 4);
}

function resolvePackageSceneId(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
): string | undefined {
  return progress?.sceneId ?? allExcerpts.find((e) => e.kind === "scene")?.id;
}

export function buildPackageContext(
  session: AdventureSession,
  pkg?: PromptAdventurePackage,
): DirectorPackageContext | undefined {
  if (!session.sourcePackage && !hasPackageExcerpts(pkg)) return undefined;

  const progress = session.packageProgress;
  const allExcerpts = pkg ? [...pkg.playerSafe, ...pkg.gmOnly] : [];
  const sceneId = resolvePackageSceneId(progress, allExcerpts);

  return {
    ...(sceneId ? { sceneId } : {}),
    activeRecordIds: collectActivePackageRecordIds(progress, allExcerpts),
    establishedActors: summarizeEstablishedActors(progress, allExcerpts),
    latestEvents: summarizeLatestPackageEvents(progress),
    openUncertainties: collectPackageUncertainties(session, allExcerpts, pkg),
  };
}
