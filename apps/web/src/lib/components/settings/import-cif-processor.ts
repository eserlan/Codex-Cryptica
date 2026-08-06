import {
  parseCifPackage,
  validateCifManifest,
  resolveCifAssets,
  normalizeCifPackage,
  isThreadWeaverExport,
  convertThreadWeaverJsonToCif,
} from "@codex/importer";

export async function looksLikeCifFile(file: File): Promise<boolean> {
  if (/\.cif\.(json|zip)$/i.test(file.name)) return true;
  if (!file.name.toLowerCase().endsWith(".json")) return false;
  try {
    const parsed = JSON.parse(await file.text());
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as Record<string, unknown>).format === "codex-world-interchange"
    );
  } catch {
    return false;
  }
}

export async function looksLikeThreadWeaverFile(file: File): Promise<boolean> {
  if (!file.name.toLowerCase().endsWith(".json")) return false;
  try {
    const parsed = JSON.parse(await file.text());
    return isThreadWeaverExport(parsed);
  } catch {
    return false;
  }
}

export interface CifProcessorCallbacks {
  isGuest: boolean;
  rejectFile: (name: string, reason: string) => void;
  setImportMode: (mode: "cc" | "oracle" | null) => void;
  setStatusMessage: (msg: string) => void;
  setStep: (step: "upload" | "processing" | "review" | "report") => void;
  createCifEngine: () => any;
  setSession: (session: any) => void;
  setReport: (report: any) => void;
}

export async function processCifFile(
  file: File,
  signal: AbortSignal,
  callbacks: CifProcessorCallbacks,
): Promise<void> {
  await processCifSource(
    {
      fileName: file.name,
      size: file.size,
      text: () => file.text(),
      bytes: async () => new Uint8Array(await file.arrayBuffer()),
    },
    file.name,
    signal,
    callbacks,
  );
}

export async function processThreadWeaverFile(
  file: File,
  signal: AbortSignal,
  callbacks: CifProcessorCallbacks,
): Promise<void> {
  if (callbacks.isGuest) {
    callbacks.rejectFile(file.name, "Guests cannot import into a vault.");
    callbacks.setStep("upload");
    return;
  }

  callbacks.setImportMode("cc");
  callbacks.setStatusMessage("Converting Thread Weaver export...");

  let convertedText: string;
  try {
    const raw = JSON.parse(await file.text());
    convertedText = JSON.stringify(convertThreadWeaverJsonToCif(raw));
  } catch (error) {
    callbacks.rejectFile(
      file.name,
      error instanceof Error
        ? error.message
        : "Failed to convert Thread Weaver export",
    );
    callbacks.setStep("upload");
    callbacks.setImportMode(null);
    return;
  }

  const bytes = new TextEncoder().encode(convertedText);
  await processCifSource(
    {
      fileName: file.name.replace(/\.json$/i, ".cif.json"),
      size: bytes.byteLength,
      text: async () => convertedText,
      bytes: async () => bytes,
    },
    file.name,
    signal,
    callbacks,
  );
}

export async function processCifSource(
  source: Parameters<typeof parseCifPackage>[0],
  displayName: string,
  signal: AbortSignal,
  callbacks: CifProcessorCallbacks,
): Promise<void> {
  if (callbacks.isGuest) {
    callbacks.rejectFile(displayName, "Guests cannot import into a vault.");
    callbacks.setStep("upload");
    return;
  }

  callbacks.setImportMode("cc");
  callbacks.setStatusMessage("Preparing CIF import review...");

  const parseResult = await parseCifPackage(source);

  if (!parseResult.ok) {
    callbacks.rejectFile(
      displayName,
      parseResult.errors.map((e) => e.message).join(" "),
    );
    callbacks.setStep("upload");
    callbacks.setImportMode(null);
    return;
  }

  const validation = validateCifManifest(parseResult.manifest);
  if (!validation.ok) {
    callbacks.rejectFile(
      displayName,
      validation.errors.map((e) => e.message).join(" "),
    );
    callbacks.setStep("upload");
    callbacks.setImportMode(null);
    return;
  }

  let resolvedAssets: Awaited<ReturnType<typeof resolveCifAssets>> | null =
    null;
  if (parseResult.zip) {
    resolvedAssets = await resolveCifAssets(
      parseResult.manifest,
      parseResult.zip.files,
    );
    if (resolvedAssets.errors.length > 0) {
      callbacks.rejectFile(
        displayName,
        resolvedAssets.errors.map((e) => e.message).join(" "),
      );
      callbacks.setStep("upload");
      callbacks.setImportMode(null);
      return;
    }
  }

  const { pkg } = normalizeCifPackage(parseResult.manifest, {
    assets: resolvedAssets?.assets,
    zipIgnoredPaths: parseResult.zip?.ignoredPaths,
  });

  const seenWarnings = new Set(
    pkg.warnings.map((w) => `${w.code}:${w.ref ?? ""}:${w.message}`),
  );
  for (const warning of [
    ...validation.warnings,
    ...(resolvedAssets?.warnings ?? []),
  ]) {
    const key = `${warning.code}:${warning.ref ?? ""}:${warning.message}`;
    if (!seenWarnings.has(key)) {
      pkg.warnings.push(warning);
      seenWarnings.add(key);
    }
  }

  let session: any = null;
  try {
    session = await wrapWithAbort(
      callbacks.createCifEngine().prepare(pkg),
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
      displayName,
      error instanceof Error ? error.message : "Invalid CIF import package",
    );
  }

  callbacks.setSession(session);
  callbacks.setStep(session ? "review" : "upload");
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
