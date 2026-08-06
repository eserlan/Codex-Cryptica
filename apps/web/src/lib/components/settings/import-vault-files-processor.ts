import type {
  DroppedItem,
  CCImportPackage,
  MissingImageReference,
  CCImportSession,
  ImportReport,
} from "@codex/importer";
import {
  droppedItemsToPackage,
  buildVaultFilesMappingRules,
  vaultFileSourceRefBuilder,
  ImportEngine,
  setItemDecision,
} from "@codex/importer";
import { createWebVaultWriter } from "$lib/features/importer/web-vault-writer";

export interface VaultFilesProcessorCallbacks {
  isGuest: boolean;
  getAbortSignal: () => AbortSignal;
  getVault: () => any;
  getSession: () => CCImportSession | null;
  setSession: (session: CCImportSession | null) => void;
  setReport: (report: ImportReport | null) => void;
  setStep: (step: "upload" | "processing" | "review" | "report") => void;
  setImportMode: (mode: "oracle" | "cc" | null) => void;
  setStatusMessage: (msg: string) => void;
  setDiscoveredEntities: (entities: any[]) => void;
  setRejectedFiles: (files: { name: string; reason: string }[]) => void;
  setMissingImageRefs: (refs: MissingImageReference[]) => void;
  getVaultFilesPackage: () => CCImportPackage | null;
  setVaultFilesPackage: (pkg: CCImportPackage | null) => void;
}

export class VaultFilesProcessor {
  constructor(private callbacks: VaultFilesProcessorCallbacks) {}

  handleVaultFiles = async (items: DroppedItem[]) => {
    if (this.callbacks.isGuest) {
      this.callbacks.setRejectedFiles([
        { name: "Import Files", reason: "Guests cannot import into a vault." },
      ]);
      this.callbacks.setStep("upload");
      return;
    }

    this.callbacks.setStep("processing");
    this.callbacks.setImportMode("cc");
    this.callbacks.setStatusMessage("Preparing your files for review...");
    this.callbacks.setDiscoveredEntities([]);
    this.callbacks.setSession(null);
    this.callbacks.setReport(null);
    this.callbacks.setRejectedFiles([]);
    this.callbacks.setMissingImageRefs([]);
    this.callbacks.setVaultFilesPackage(null);

    if (items.length === 0) {
      this.callbacks.setStep("upload");
      this.callbacks.setImportMode(null);
      return;
    }

    const { pkg, missingImageRefs } = await droppedItemsToPackage(items);

    if (pkg.entityDrafts.length === 0) {
      let rejected = pkg.warnings.map((w) => ({
        name: w.ref ?? "Import Files",
        reason: w.message,
      }));
      if (rejected.length === 0) {
        rejected = [
          {
            name: "Import Files",
            reason:
              "None of the dropped files were recognized as vault content.",
          },
        ];
      }
      this.callbacks.setRejectedFiles(rejected);
      this.callbacks.setStep("upload");
      this.callbacks.setImportMode(null);
      return;
    }

    this.callbacks.setVaultFilesPackage(pkg);
    this.callbacks.setMissingImageRefs(missingImageRefs);
    await this.prepareVaultFilesSession();
  };

  prepareVaultFilesSession = async () => {
    const pkg = this.callbacks.getVaultFilesPackage();
    if (!pkg) return;
    const signal = this.callbacks.getAbortSignal();
    const rules = buildVaultFilesMappingRules(pkg.entityDrafts);

    const currentSession = this.callbacks.getSession();
    const priorDecisions = new Map(
      currentSession?.items
        .map(
          (item) =>
            [
              item.draft.sourceId ?? item.draft.sourcePath,
              item.decision,
            ] as const,
        )
        .filter(([draftRef]) => draftRef !== undefined) ?? [],
    );

    try {
      const engine = new ImportEngine(
        {
          writer: createWebVaultWriter(this.callbacks.getVault(), {
            titleFallback: false,
          }),
        },
        {
          mappingRules: rules,
          sourceRefBuilder: vaultFileSourceRefBuilder,
        },
      );

      let session = await wrapWithAbort(engine.prepare(pkg), signal);
      for (const item of session.items) {
        const draftRef = item.draft.sourceId ?? item.draft.sourcePath;
        const prior = draftRef ? priorDecisions.get(draftRef) : undefined;
        if (prior) session = setItemDecision(session, draftRef!, prior);
      }
      this.callbacks.setSession(session);
      this.callbacks.setStep("review");
    } catch (error) {
      if (
        signal.aborted ||
        (error instanceof Error && error.message === "Import aborted")
      ) {
        this.callbacks.setStep("upload");
        this.callbacks.setSession(null);
        this.callbacks.setReport(null);
        this.callbacks.setImportMode(null);
        return;
      }
      this.callbacks.setRejectedFiles([
        {
          name: "Import Files",
          reason:
            error instanceof Error
              ? error.message
              : "Could not prepare a review for these files.",
        },
      ]);
      this.callbacks.setStep("upload");
      this.callbacks.setImportMode(null);
    }
  };
}

function wrapWithAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new Error("Import aborted"));

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error("Import aborted"));
    };
    signal.addEventListener("abort", onAbort);

    promise
      .then((val) => {
        signal.removeEventListener("abort", onAbort);
        resolve(val);
      })
      .catch((err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      });
  });
}
