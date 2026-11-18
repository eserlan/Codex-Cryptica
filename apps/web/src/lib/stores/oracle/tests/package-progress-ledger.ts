import {
  applyPackageProgressEvents,
  packageProgressIndex,
  type AdventureJsonV1,
  type PackageProgress,
  type PackageProgressInput,
} from "@codex/adventure-engine";

export type LedgerStep = Omit<
  PackageProgressInput,
  "kind" | "certainty" | "note"
> &
  Partial<Pick<PackageProgressInput, "kind" | "certainty" | "note">>;

/** A progress ledger built turn by turn through the real ledger writer. */
export function buildLedger(
  pkg: AdventureJsonV1,
  turns: LedgerStep[][],
  sceneId: string,
): PackageProgress {
  const index = packageProgressIndex(pkg);
  let progress: PackageProgress = { sceneId };
  turns.forEach((steps, i) => {
    progress = applyPackageProgressEvents(
      progress,
      steps.map((step) => ({
        kind: index.packageRecordKinds[step.recordId],
        certainty: "confirmed",
        note: `note ${step.recordId}`,
        ...step,
      })),
      { turnId: `t${i + 1}`, index },
    ).progress;
  });
  return progress;
}

/** The minimal manager surface the progress components read. */
export function packageManager(
  pkg: AdventureJsonV1 | null,
  progress: PackageProgress | undefined,
  withPackage = true,
) {
  return {
    session: {
      id: "adventure-1",
      sourcePackage: withPackage ? { hash: "h".repeat(64) } : undefined,
      packageProgress: progress,
    },
    loadSourcePackage: async () => pkg,
  } as any;
}
