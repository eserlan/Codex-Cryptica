/// <reference lib="webworker" />

import { ProposerService } from "@codex/proposer";
import { getDB, DB_NAME, DB_VERSION } from "../utils/idb";

let service: ProposerService | null = null;

function getService() {
  if (!service) {
    // We defer opening the DB until we actually need it (e.g. for future persistence tasks)
    // For now ANALYZE is pure logic, but this keeps it consistent with the main app.
    service = new ProposerService(DB_NAME, DB_VERSION, getDB());
  }
  return service;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data || {};

  if (!type || !id) {
    console.warn("ProposerWorker: Received malformed message", e.data);
    return;
  }

  try {
    if (type === "ANALYZE") {
      const { apiKey, modelName, entityId, content, availableTargets } =
        payload;
      const proposals = await getService().analyzeEntity(
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
