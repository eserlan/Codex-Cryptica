import { parseKankaExportZip, type CCImportSession } from "@codex/importer";
import { wrapWithAbort } from "./import-abort-utils";

export interface KankaProcessorCallbacks {
  rejectFile: (name: string, reason: string) => void;
  setImportMode: (mode: "cc" | "oracle" | null) => void;
  setStatusMessage: (msg: string) => void;
  setStep: (step: "upload" | "processing" | "review" | "report") => void;
  createEngine: () => any;
  setSession: (session: CCImportSession | null) => void;
  setReport: (report: any) => void;
}

export async function processKankaFile(
  file: File,
  signal: AbortSignal,
  callbacks: KankaProcessorCallbacks,
): Promise<void> {
  callbacks.setImportMode("cc");
  callbacks.setStatusMessage("Preparing Kanka import review...");

  let session: CCImportSession | null = null;
  try {
    const pkg = await parseKankaExportZip(file);
    session = await wrapWithAbort(
      callbacks.createEngine().prepare(pkg),
      signal,
    );
  } catch (error) {
    if (
      signal.aborted ||
      (error instanceof Error && error.message === "Import aborted")
    ) {
      callbacks.setStep("upload");
      callbacks.setSession(null);
      callbacks.setReport(null);
      callbacks.setImportMode(null);
      return;
    }
    callbacks.rejectFile(
      file.name,
      error instanceof Error ? error.message : "Invalid Kanka export ZIP",
    );
  }

  callbacks.setSession(session);
  callbacks.setStep(session ? "review" : "upload");
  if (!session) callbacks.setImportMode(null);
}
