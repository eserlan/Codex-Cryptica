import {
  adventureTurnGenerationService,
  type AdventureTurnGenerationService,
} from "@codex/ai-engine";
import { oracleBridge } from "#lib/cloud-bridge/oracle-bridge.js";

let nextAdventureTurnRequestId = 0;

export function defaultGenerationService(): Pick<
  AdventureTurnGenerationService,
  "generate"
> {
  return {
    generate: (request: any, options?: any) => {
      if (!oracleBridge.isReady) {
        return adventureTurnGenerationService.generate(request, options);
      }
      // AbortSignal is not structured-cloneable and must not cross Comlink.
      const signal = options?.signal ?? request.signal;
      const { signal: _signal, ...workerOptions } = options ?? {};
      // Comlink cannot structured-clone functions nested inside the request.
      // Progress is a separate proxied argument at the bridge boundary.
      const {
        onNarration,
        signal: _requestSignal,
        ...cloneableRequest
      } = request;
      const workerRequest = $state.snapshot(cloneableRequest);
      const requestId = String(++nextAdventureTurnRequestId);
      const cancelWorkerRequest = () => {
        if (!oracleBridge.isReady) return;
        void oracleBridge.cancelAdventureTurn(requestId).catch(() => {});
      };
      signal?.addEventListener("abort", cancelWorkerRequest, { once: true });
      if (signal?.aborted) {
        signal.removeEventListener("abort", cancelWorkerRequest);
        throw new DOMException("Cancelled", "AbortError");
      }
      return oracleBridge
        .generateAdventureTurn(
          workerRequest,
          requestId,
          workerOptions,
          onNarration,
        )
        .finally(() => {
          signal?.removeEventListener("abort", cancelWorkerRequest);
        }) as any;
    },
  };
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
