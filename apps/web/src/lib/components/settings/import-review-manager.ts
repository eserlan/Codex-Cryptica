import type {
  CCImportSession,
  ItemDecision,
  MatchDecision,
  ImportReport,
  ImportEngine,
} from "@codex/importer";
import {
  setItemDecision,
  setMatchDecision,
  setItemType,
} from "@codex/importer";
import { wrapWithAbort } from "./import-abort-utils";

export interface ReviewSessionCallbacks {
  getSession: () => CCImportSession | null;
  setSession: (session: CCImportSession | null) => void;
  setStep: (step: "upload" | "processing" | "review" | "report") => void;
  setImportMode: (mode: "oracle" | "cc" | null) => void;
  setStatusMessage: (msg: string) => void;
  setImportProgress: (
    progress: { current: number; total: number } | null,
  ) => void;
  setReport: (report: ImportReport | null) => void;
  getAbortSignal: () => AbortSignal;
  suspendSaving: () => void;
  resumeSaving: () => void;
  flushPendingSaves: () => Promise<void>;
  notifyError: (msg: string) => void;
  createEngine: () => ImportEngine;
  resetState: () => void;
}

export class ImportReviewManager {
  private isCommitting = false;

  constructor(private callbacks: ReviewSessionCallbacks) {}

  handleCCItemDecisionChange = (draftRef: string, decision: ItemDecision) => {
    const session = this.callbacks.getSession();
    if (!session) return;
    this.callbacks.setSession(setItemDecision(session, draftRef, decision));
  };

  handleCCMatchDecisionChange = (draftRef: string, decision: MatchDecision) => {
    const session = this.callbacks.getSession();
    if (!session) return;
    if (session.sourceSystem === "vault-files" && decision === "update") {
      return;
    }
    this.callbacks.setSession(setMatchDecision(session, draftRef, decision));
  };

  handleCCItemTypeChange = (draftRef: string, type: string) => {
    const session = this.callbacks.getSession();
    if (!session) return;
    this.callbacks.setSession(setItemType(session, draftRef, type));
  };

  handleCCCommit = async () => {
    const session = this.callbacks.getSession();
    if (!session || this.isCommitting) return;

    this.isCommitting = true;

    this.callbacks.setStep("processing");
    this.callbacks.setImportMode("cc");
    this.callbacks.setStatusMessage(`Importing ${session.sourceLabel}...`);
    this.callbacks.setImportProgress(null);

    const signal = this.callbacks.getAbortSignal();

    this.callbacks.suspendSaving();
    try {
      const report = await wrapWithAbort(
        this.callbacks.createEngine().commit(
          session,
          (stage: string, current: number, total: number) => {
            this.callbacks.setImportProgress({ current, total });
            if (stage === "entity") {
              this.callbacks.setStatusMessage(
                `Importing entities (${current}/${total})...`,
              );
            } else if (stage === "connection") {
              this.callbacks.setStatusMessage(
                `Importing connections (${current}/${total})...`,
              );
            } else if (stage === "asset") {
              this.callbacks.setStatusMessage(
                `Importing assets (${current}/${total})...`,
              );
            }
          },
          signal,
        ),
        signal,
      );
      if (signal.aborted) {
        throw new Error("Import aborted");
      }
      this.callbacks.setStatusMessage("Finalizing and saving to vault...");
      await this.callbacks.flushPendingSaves();
      this.callbacks.setReport(report);
      this.callbacks.setStep("report");
    } catch (error) {
      if (
        signal.aborted ||
        (error instanceof Error && error.message === "Import aborted")
      ) {
        this.callbacks.setStep("review");
      } else {
        this.callbacks.notifyError(
          error instanceof Error
            ? error.message
            : "Import failed before the report could be created.",
        );
        this.callbacks.setStep("review");
      }
    } finally {
      this.callbacks.resumeSaving();
      this.isCommitting = false;
    }
  };

  handleCCReportDone = () => {
    this.callbacks.resetState();
  };
}
