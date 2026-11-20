import {
  ADVENTURE_JSON_FENCE_HINT,
  unwrapAdventureJsonFence,
} from "./adventure-json-fence.js";
import {
  buildAdventureRepairPrompt,
  adventureSourcePackageToAdventureJson,
  computeAdventureJsonHash,
  parseAdventureMarkdown,
  preflightAdventureJson,
  selectAdventureJsonPredecessor,
  validateAdventureJson,
  MAX_ADVENTURE_JSON_BYTES,
  MAX_ADVENTURE_MARKDOWN_BYTES,
  MAX_ADVENTURE_PDF_BYTES,
  type AdventureJsonV1,
  type StoredAdventurePackage,
} from "@codex/adventure-engine";
import type { ImportValidationIssue } from "./AdventureEntryChoices.svelte";

interface ImportDependencies {
  getVaultId: () => string;
  canImport: () => boolean;
  isGuest: () => boolean;
  saveApproved: (
    vaultId: string,
    pkg: AdventureJsonV1,
  ) => Promise<{
    package: AdventureJsonV1;
    status?: "created" | "deduplicated";
  }>;
  listApproved: (vaultId: string) => Promise<StoredAdventurePackage[]>;
  notify: (message: string) => void;
  onReview: () => void;
  onCancel: () => void;
  onApproved: (vaultId: string) => void;
}

interface ImportRequest {
  abortController: AbortController;
  requestToken: number;
  sourceVaultId: string;
}

function jsonFileError(file: File): string | null {
  if (!(
    file.type === "application/json" ||
    file.type === "text/json" ||
    /\.json$/i.test(file.name)
  ))
    return "Please choose an Adventure JSON (.json) file, or use the experimental Markdown/PDF convenience option below.";
  return file.size > MAX_ADVENTURE_JSON_BYTES
    ? "Adventure JSON files must be 10 MiB or smaller."
    : null;
}

function experimentalFileError(file: File, isPdf: boolean): string | null {
  if (!isPdf && file.size > MAX_ADVENTURE_MARKDOWN_BYTES)
    return "Adventure Markdown files must be 2 MiB or smaller.";
  if (isPdf && file.size > MAX_ADVENTURE_PDF_BYTES)
    return "Adventure PDF files must be 20 MiB or smaller.";
  return null;
}

async function findDuplicatePackage(
  stored: StoredAdventurePackage[],
  hash: string,
  isCurrent: () => boolean,
): Promise<StoredAdventurePackage | null> {
  for (const item of stored) {
    const storedHash =
      item.originFormat === "legacy-source-package"
        ? await computeAdventureJsonHash(item.package)
        : item.hash;
    if (!isCurrent()) return null;
    if (storedHash === hash) return item;
  }
  return null;
}

/** Per-surface import draft and request lifetime, independent of the visible form. */
export class AdventureImportController {
  draft = $state<AdventureJsonV1 | null>(null);
  experimentalOrigin = $state<"markdown" | "pdf" | null>(null);
  error = $state<string | null>(null);
  validationErrors = $state<ImportValidationIssue[]>([]);
  repairPrompt = $state<string | null>(null);
  inFlight = $state(false);
  approving = $state(false);
  approveError = $state<string | null>(null);
  duplicate = $state<StoredAdventurePackage | null>(null);
  predecessor = $state<StoredAdventurePackage | null>(null);
  private draftVaultId: string | null = null;
  private requestToken = 0;
  private abortController: AbortController | null = null;

  constructor(private readonly deps: ImportDependencies) {}

  private abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  destroy(): void {
    this.requestToken += 1;
    this.abort();
  }

  private isCurrent(
    request: Pick<ImportRequest, "requestToken" | "sourceVaultId">,
  ): boolean {
    return (
      request.requestToken === this.requestToken &&
      this.deps.getVaultId() === request.sourceVaultId &&
      !this.deps.isGuest()
    );
  }

  private beginRequest(): ImportRequest | null {
    this.abort();
    const abortController = new AbortController();
    this.abortController = abortController;
    const requestToken = ++this.requestToken;
    const sourceVaultId = this.deps.getVaultId();
    this.error = null;
    this.validationErrors = [];
    this.repairPrompt = null;
    this.approveError = null;
    this.duplicate = null;
    if (!this.deps.canImport() || this.deps.isGuest()) {
      this.inFlight = false;
      this.error = "Adventure import is only available in an owner Vault.";
      return null;
    }
    return { abortController, requestToken, sourceVaultId };
  }

  private reportReadError(
    error: unknown,
    request: ImportRequest,
    fallback: string,
  ): void {
    if (request.abortController.signal.aborted) return;
    if (this.isCurrent(request))
      this.error = error instanceof Error ? error.message : fallback;
  }

  private finishRequest({
    abortController,
    requestToken,
  }: ImportRequest): void {
    if (this.abortController === abortController) this.abortController = null;
    if (requestToken === this.requestToken) this.inFlight = false;
  }

  private async readFile(
    file: File,
    validateFile: () => string | null,
    fallbackError: string,
    processBytes: (bytes: Uint8Array, request: ImportRequest) => Promise<void>,
  ): Promise<void> {
    const request = this.beginRequest();
    if (!request) return;
    const fileError = validateFile();
    if (fileError) {
      this.inFlight = false;
      this.error = fileError;
      return;
    }
    this.inFlight = true;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!this.isCurrent(request) || request.abortController.signal.aborted)
        return;
      await processBytes(bytes, request);
    } catch (error) {
      this.reportReadError(error, request, fallbackError);
    } finally {
      this.finishRequest(request);
    }
  }

  private async reviewValidated(
    parsed: unknown,
    request: ImportRequest,
    origin: "markdown" | "pdf" | null,
    validationError: string,
    preflightInput: string,
  ): Promise<void> {
    const validation = validateAdventureJson(parsed);
    if (!validation.ok) {
      this.error = validationError;
      this.validationErrors = validation.errors;
      this.repairPrompt = buildAdventureRepairPrompt(
        preflightAdventureJson(preflightInput),
      );
      return;
    }
    let stored: StoredAdventurePackage[] = [];
    try {
      stored = await this.deps.listApproved(request.sourceVaultId);
    } catch {
      // Keep a valid local import reviewable when the package catalogue is unavailable.
    }
    if (!this.isCurrent(request)) return;
    const hash = await computeAdventureJsonHash(validation.value);
    if (!this.isCurrent(request)) return;
    const duplicate = await findDuplicatePackage(stored, hash, () =>
      this.isCurrent(request),
    );
    if (!this.isCurrent(request)) return;
    if (duplicate) {
      this.duplicate = duplicate;
      this.predecessor = null;
      return;
    }
    this.duplicate = null;
    const predecessor = selectAdventureJsonPredecessor(
      stored,
      validation.value,
      hash,
    );
    this.predecessor = predecessor
      ? {
          hash: predecessor.hash,
          path: "",
          package: predecessor.package,
          originFormat: "adventure-json/v1",
        }
      : null;
    this.draft = validation.value;
    this.experimentalOrigin = origin;
    this.draftVaultId = request.sourceVaultId;
    this.deps.onReview();
  }

  private async readJson(
    bytes: Uint8Array,
    request: ImportRequest,
  ): Promise<void> {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const unwrapped = unwrapAdventureJsonFence(text);
    let parsed: unknown;
    try {
      if (!unwrapped.ok) throw new Error(unwrapped.message);
      parsed = JSON.parse(unwrapped.text);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Malformed JSON document.";
      this.error = "Adventure JSON could not be parsed.";
      this.validationErrors = [
        {
          code: "INVALID_JSON",
          message:
            unwrapped.ok && unwrapped.text === text && text.includes("```")
              ? `${message} ${ADVENTURE_JSON_FENCE_HINT}`
              : message,
        },
      ];
      this.repairPrompt = buildAdventureRepairPrompt(
        preflightAdventureJson(unwrapped.ok ? unwrapped.text : text),
      );
      return;
    }
    await this.reviewValidated(
      parsed,
      request,
      null,
      "Adventure JSON validation failed.",
      unwrapped.text,
    );
  }

  importJson = async (file: File): Promise<void> => {
    await this.readFile(
      file,
      () => jsonFileError(file),
      "Unable to read the selected Adventure JSON file.",
      async (bytes, request) => this.readJson(bytes, request),
    );
  };

  private async readExperimental(
    bytes: Uint8Array,
    file: File,
    isPdf: boolean,
    request: ImportRequest,
  ): Promise<void> {
    const result = isPdf
      ? await this.readPdf(bytes, file.name, request.abortController.signal)
      : await parseAdventureMarkdown(bytes, { fileName: file.name });
    if (!this.isCurrent(request)) return;
    if (!result.ok) {
      if (result.error.code !== "ABORTED") this.error = result.error.message;
      return;
    }
    const adventureJson = adventureSourcePackageToAdventureJson(result.package);
    await this.reviewValidated(
      adventureJson,
      request,
      isPdf ? "pdf" : "markdown",
      "Converted adventure failed Adventure JSON validation.",
      JSON.stringify(adventureJson),
    );
  }

  private async readPdf(
    bytes: Uint8Array,
    fileName: string,
    signal: AbortSignal,
  ) {
    const { importAdventurePdfFile } =
      await import("#lib/services/adventure/adventure-pdf-import.js");
    return importAdventurePdfFile(bytes, fileName, signal);
  }

  importExperimental = async (file: File): Promise<void> => {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    await this.readFile(
      file,
      () => experimentalFileError(file, isPdf),
      "Unable to read the selected adventure file.",
      (bytes, request) => this.readExperimental(bytes, file, isPdf, request),
    );
  };

  private beginApproval(): Pick<
    ImportRequest,
    "requestToken" | "sourceVaultId"
  > {
    const sourceVaultId = this.draftVaultId;
    if (
      !sourceVaultId ||
      !this.isCurrent({ sourceVaultId, requestToken: this.requestToken })
    ) {
      const error = new Error(
        "Return to the owner Vault where this adventure was imported to approve it.",
      );
      this.approveError = error.message;
      throw error;
    }
    return { sourceVaultId, requestToken: this.requestToken };
  }

  private completeApproval(
    saved: Awaited<ReturnType<ImportDependencies["saveApproved"]>>,
    request: Pick<ImportRequest, "requestToken" | "sourceVaultId">,
  ): void {
    if (!this.isCurrent(request)) return;
    this.draft = saved.package;
    this.predecessor = null;
    this.deps.notify(
      saved.status === "deduplicated"
        ? `"${saved.package.title}" was already imported.`
        : `Approved "${saved.package.title}" for local play.`,
    );
    this.deps.onApproved(request.sourceVaultId);
  }

  private reportApprovalError(
    error: unknown,
    request: Pick<ImportRequest, "requestToken" | "sourceVaultId">,
  ): void {
    if (!this.isCurrent(request)) return;
    this.approveError =
      error instanceof Error
        ? error.message
        : "Unable to save the approved adventure package.";
  }

  approve = async (approved: AdventureJsonV1): Promise<void> => {
    const request = this.beginApproval();
    this.approving = true;
    this.approveError = null;
    try {
      const saved = await this.deps.saveApproved(
        request.sourceVaultId,
        approved,
      );
      this.completeApproval(saved, request);
    } catch (error) {
      this.reportApprovalError(error, request);
      throw error;
    } finally {
      if (request.requestToken === this.requestToken) this.approving = false;
    }
  };

  cancel = (): void => {
    this.destroy();
    this.draft = null;
    this.duplicate = null;
    this.predecessor = null;
    this.experimentalOrigin = null;
    this.draftVaultId = null;
    this.error = null;
    this.validationErrors = [];
    this.repairPrompt = null;
    this.inFlight = false;
    this.approveError = null;
    this.deps.onCancel();
  };

  reset(): void {
    this.cancel();
    this.approving = false;
  }
}
