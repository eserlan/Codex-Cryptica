import type { ChronicaExportDocument, CCImportSession } from "@codex/importer";
import {
  validateImportFile,
  JsonParser,
  detectChronicaExport,
  parseChronicaExports,
} from "@codex/importer";

export interface ChronicaProcessorCallbacks {
  rejectFile: (name: string, reason: string) => void;
  setImportMode: (mode: "cc" | "oracle" | null) => void;
  setStatusMessage: (msg: string) => void;
  setStep: (step: "upload" | "processing" | "review" | "report") => void;
  createEngine: () => any;
  setSession: (session: CCImportSession | null) => void;
  setReport: (report: any) => void;
}

export async function processChronicaFiles(
  files: File[],
  parsers: any[],
  signal: AbortSignal,
  callbacks: ChronicaProcessorCallbacks,
): Promise<boolean> {
  const chronicaDocuments: ChronicaExportDocument[] = [];
  const chronicaMixedRejections: { name: string; reason: string }[] = [];

  for (const file of files) {
    const fileValidation = validateImportFile(file);
    if (!fileValidation.success) continue;

    const parser = parsers.find((p) => p.accepts(file));
    if (!(parser instanceof JsonParser)) continue;

    try {
      const result = await parser.parse(file);
      const parsedJson = JSON.parse(result.text);
      if (detectChronicaExport(parsedJson)) {
        chronicaDocuments.push({ fileName: file.name, json: parsedJson });
        continue;
      }

      chronicaMixedRejections.push({
        name: file.name,
        reason: "Chronica imports cannot be mixed with other import types",
      });
    } catch {
      // Invalid JSON handled in main pass
    }
  }

  if (chronicaDocuments.length === 0) {
    return false;
  }

  callbacks.setImportMode("cc");
  callbacks.setStatusMessage("Preparing Chronica import review...");

  for (const rejection of chronicaMixedRejections) {
    callbacks.rejectFile(rejection.name, rejection.reason);
  }

  for (const file of files) {
    if (chronicaDocuments.some((doc) => doc.fileName === file.name)) {
      continue;
    }
    if (chronicaMixedRejections.some((entry) => entry.name === file.name)) {
      continue;
    }

    const fileValidation = validateImportFile(file);
    if (!fileValidation.success) {
      callbacks.rejectFile(file.name, fileValidation.reason);
      continue;
    }

    const parser = parsers.find((p) => p.accepts(file));
    if (!parser) {
      callbacks.rejectFile(file.name, "Unsupported file type");
      continue;
    }

    if (parser instanceof JsonParser) {
      try {
        const result = await parser.parse(file);
        JSON.parse(result.text);
      } catch {
        callbacks.rejectFile(file.name, "Invalid JSON");
      }
      continue;
    }

    callbacks.rejectFile(
      file.name,
      "Chronica imports cannot be mixed with other import types",
    );
  }

  let session: CCImportSession | null = null;
  try {
    const chronicaPackage = parseChronicaExports(chronicaDocuments);
    session = await wrapWithAbort(
      callbacks.createEngine().prepare(chronicaPackage),
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
      chronicaDocuments.map((doc) => doc.fileName).join(", "),
      error instanceof Error
        ? error.message
        : "Invalid Chronica import package",
    );
  }

  callbacks.setSession(session);
  callbacks.setStep(session ? "review" : "upload");
  return true;
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
