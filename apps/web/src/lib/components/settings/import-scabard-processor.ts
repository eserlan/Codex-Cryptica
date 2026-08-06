import type { CCImportSession } from "@codex/importer";
import { parseScabardExport } from "@codex/importer";
import { wrapWithAbort } from "./import-abort-utils";

export interface ScabardProcessorCallbacks {
  rejectFile: (name: string, reason: string) => void;
  setImportMode: (mode: "cc" | "oracle" | null) => void;
  setStatusMessage: (msg: string) => void;
  setStep: (step: "upload" | "processing" | "review" | "report") => void;
  createEngine: () => any;
  setSession: (session: CCImportSession | null) => void;
  setReport: (report: any) => void;
}

export async function processScabardFile(
  file: File,
  text: string,
  signal: AbortSignal,
  callbacks: ScabardProcessorCallbacks,
): Promise<boolean> {
  callbacks.setImportMode("cc");
  callbacks.setStatusMessage("Preparing Scabard import review...");

  let session: CCImportSession | null = null;
  try {
    const scabardPackage = parseScabardExport(text);
    session = await wrapWithAbort(
      callbacks.createEngine().prepare(scabardPackage),
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
      return true;
    }
    callbacks.rejectFile(
      file.name,
      error instanceof Error ? error.message : "Invalid Scabard import package",
    );
  }

  callbacks.setSession(session);
  callbacks.setStep(session ? "review" : "upload");
  return true;
}
