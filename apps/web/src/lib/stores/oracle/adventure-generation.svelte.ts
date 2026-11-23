import type {
  AdventureOocService,
  AdventureSummaryService,
  AdventureTurnGenerationService,
} from "@codex/ai-engine";
import { oracleBridge } from "#lib/cloud-bridge/oracle-bridge.js";

let nextAdventureTurnRequestId = 0;

type GenerateTurn = AdventureTurnGenerationService["generate"];
type AdventureAIServices = Pick<
  typeof import("@codex/ai-engine"),
  | "adventureOocService"
  | "adventureSummaryService"
  | "adventureTurnGenerationService"
>;
type AdventureAILoader = () => Promise<AdventureAIServices>;
const loadAdventureAIServices: AdventureAILoader = async () => {
  await ensureAiSessionForWorker();
  return import("@codex/ai-engine");
};

async function ensureAiSessionForWorker(): Promise<void> {
  const { ensureAiSession } =
    await import("#lib/services/ai/session-bootstrap.js");
  await ensureAiSession();
}

export function defaultGenerationService(
  load: AdventureAILoader = loadAdventureAIServices,
): Pick<AdventureTurnGenerationService, "generate"> {
  return {
    generate: (request, options) => {
      if (oracleBridge.isReady) {
        const signal = options?.signal ?? request.signal;
        if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
        return ensureAiSessionForWorker().then(() =>
          generateWorkerTurn(request, options),
        );
      }
      return load().then(({ adventureTurnGenerationService }) =>
        adventureTurnGenerationService.generate(request, options),
      );
    },
  };
}

/** The story-notes call, in the worker when it is ready and on this thread otherwise. */
export function defaultSummaryService(
  load: AdventureAILoader = loadAdventureAIServices,
): Pick<AdventureSummaryService, "summarize"> {
  return {
    summarize: (request, options) => {
      if (!oracleBridge.isReady)
        return load().then(({ adventureSummaryService }) =>
          adventureSummaryService.summarize(request, options),
        );
      return dispatchAdventureWorker(
        "summary",
        request,
        options,
        (snapshot, requestId, workerOptions) =>
          oracleBridge.summarizeAdventure(snapshot, requestId, workerOptions),
      ) as ReturnType<AdventureSummaryService["summarize"]>;
    },
  };
}

/** Stateless OOC clarification call, in the worker when ready and on this thread otherwise. */
export function defaultOocService(
  load: AdventureAILoader = loadAdventureAIServices,
): Pick<AdventureOocService, "ask"> {
  return {
    ask: (request, options) => {
      if (!oracleBridge.isReady)
        return load().then(({ adventureOocService }) =>
          adventureOocService.ask(request, options),
        );
      return dispatchAdventureWorker(
        "ooc",
        request,
        options,
        (snapshot, requestId, workerOptions) =>
          oracleBridge.askAdventureOoc(snapshot, requestId, workerOptions),
      ) as ReturnType<AdventureOocService["ask"]>;
    },
  };
}

function dispatchAdventureWorker<
  Request,
  Options extends { signal?: AbortSignal },
  Result,
>(
  prefix: "summary" | "ooc",
  request: Request,
  options: Options | undefined,
  dispatch: (
    request: Request,
    requestId: string,
    options: Omit<Options, "signal">,
  ) => Promise<Result>,
): Promise<Result> {
  if (options?.signal?.aborted) throw abortReason(options.signal);
  return ensureAiSessionForWorker().then(() => {
    const signal = options?.signal;
    const { signal: _signal, ...workerOptions } = options ?? ({} as Options);
    const requestId = `${prefix}-${++nextAdventureTurnRequestId}`;
    const removeCancellation = forwardWorkerCancellation(requestId, signal);
    return dispatch(
      $state.snapshot(request) as Request,
      requestId,
      workerOptions as Omit<Options, "signal">,
    ).finally(removeCancellation);
  });
}

function generateWorkerTurn(
  ...[request, options]: Parameters<GenerateTurn>
): ReturnType<GenerateTurn> {
  // Signals and callbacks cannot be structured-cloned across Comlink.
  const signal = options?.signal ?? request.signal;
  const { signal: _signal, ...workerOptions } = options ?? {};
  const { onNarration, signal: _requestSignal, ...cloneableRequest } = request;
  const workerRequest = $state.snapshot(cloneableRequest);
  const requestId = String(++nextAdventureTurnRequestId);
  const removeCancellation = forwardWorkerCancellation(requestId, signal);
  return oracleBridge
    .generateAdventureTurn(workerRequest, requestId, workerOptions, onNarration)
    .finally(removeCancellation) as ReturnType<GenerateTurn>;
}

function forwardWorkerCancellation(
  requestId: string,
  signal?: AbortSignal,
): () => void {
  const cancelWorkerRequest = () => {
    if (!oracleBridge.isReady) return;
    void oracleBridge.cancelAdventureTurn(requestId).catch(() => {});
  };
  const removeCancellation = () =>
    signal?.removeEventListener("abort", cancelWorkerRequest);
  signal?.addEventListener("abort", cancelWorkerRequest, { once: true });
  if (signal?.aborted) {
    removeCancellation();
    throw new DOMException("Cancelled", "AbortError");
  }
  return removeCancellation;
}

/** Advance remote conversation history only after a local adventure save. */
export async function confirmDefaultGenerationInteraction(
  sessionId: string,
  revision?: number,
) {
  return oracleBridge.isReady
    ? oracleBridge.confirmAdventureInteraction(sessionId, revision)
    : loadAdventureAIServices().then(({ adventureTurnGenerationService }) =>
        adventureTurnGenerationService.confirmInteraction(sessionId, revision),
      );
}

export async function clearDefaultGenerationInteraction(sessionId: string) {
  return oracleBridge.isReady
    ? oracleBridge.clearAdventureInteraction(sessionId)
    : loadAdventureAIServices().then(({ adventureTurnGenerationService }) =>
        adventureTurnGenerationService.clearInteraction(sessionId),
      );
}

export function isAbort(cause: unknown, signal?: AbortSignal): boolean {
  return Boolean(
    signal?.aborted ||
    (cause instanceof DOMException && cause.name === "AbortError"),
  );
}

export function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("Cancelled", "AbortError");
}
