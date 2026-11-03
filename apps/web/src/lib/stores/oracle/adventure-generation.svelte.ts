import {
  adventureTurnGenerationService,
  type AdventureTurnGenerationService,
} from "@codex/ai-engine";
import { oracleBridge } from "#lib/cloud-bridge/oracle-bridge.js";

let nextAdventureTurnRequestId = 0;

type GenerateTurn = AdventureTurnGenerationService["generate"];

export function defaultGenerationService(): Pick<
  AdventureTurnGenerationService,
  "generate"
> {
  return {
    generate: (request, options) =>
      oracleBridge.isReady
        ? generateWorkerTurn(request, options)
        : adventureTurnGenerationService.generate(request, options),
  };
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
export function confirmDefaultGenerationInteraction(sessionId: string, revision?: number) {
  return oracleBridge.isReady
    ? oracleBridge.confirmAdventureInteraction(sessionId, revision)
    : Promise.resolve(
        adventureTurnGenerationService.confirmInteraction(sessionId, revision),
      );
}

export function clearDefaultGenerationInteraction(sessionId: string) {
  return oracleBridge.isReady
    ? oracleBridge.clearAdventureInteraction(sessionId)
    : Promise.resolve(
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
