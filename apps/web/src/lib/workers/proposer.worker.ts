/// <reference lib="webworker" />

import { ProposerService } from "@codex/proposer";

const service = new ProposerService();

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    if (type === "ANALYZE") {
      const { apiKey, modelName, entityId, content, availableTargets } =
        payload;
      const proposals = await service.analyzeEntity(
        apiKey,
        modelName,
        entityId,
        content,
        availableTargets,
      );
      self.postMessage({ type: "ANALYZE_RESULT", payload: proposals, id });
    } else if (type === "SHUTDOWN") {
      self.close();
    }
  } catch (err: any) {
    self.postMessage({ type: "ERROR", payload: err.message, id });
  }
};

export {};
