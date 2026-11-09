import {
  buildOperationPipelineBody,
  type NormalizedGenerationRequest,
} from "./generation-request";
import { postProxyJson, readProxyGenerationResponse } from "./proxy-http";

interface ProxyGenerationRequest extends NormalizedGenerationRequest {
  proxyUrl: string;
  doFetch: typeof fetch;
  modelName: string;
  signal?: AbortSignal;
}

function sdkGenerationResult(data: any, text: string, candidates: any[]) {
  if (import.meta.env.DEV) {
    console.log(
      `[OracleProxy] Extracted text (${text.length} chars):`,
      text.substring(0, 50) + "...",
    );
  }
  return { response: { text: () => text, candidates }, rawResponse: data };
}

function operationText(content: any): string {
  if (typeof content === "string") return content;
  return content !== undefined ? JSON.stringify(content) : "";
}

async function sendViaOperationPipeline(params: ProxyGenerationRequest) {
  const { proxyUrl, doFetch, modelName, signal } = params;
  const body = buildOperationPipelineBody(params);
  console.log(`[OracleProxy] Fetching from: ${proxyUrl} (operation pipeline)`);
  if (import.meta.env.DEV) {
    // The registry resolves the serving model; this is only a caller hint.
    console.log(
      `[OracleProxy] Legacy model hint (ignored by pipeline): ${modelName}`,
    );
  }
  const response = await postProxyJson(doFetch, proxyUrl, body, signal);
  const data = await readProxyGenerationResponse(response);
  console.log(`[OracleProxy] Resolved model: ${data.modelKey ?? "unknown"}`);
  if (import.meta.env.DEV) {
    console.log("[OracleProxy] Received raw data (operation pipeline):", data);
  }
  const text = operationText(data.content);
  // Preserve the SDK candidates API as well as response.text().
  return sdkGenerationResult(data, text, [{ content: { parts: [{ text }] } }]);
}

function legacyText(candidates: any[]): string {
  const parts = candidates[0]?.content?.parts || [];
  return parts
    .map((p: any) => p.text || "")
    .filter(Boolean)
    .join("");
}

async function sendViaLegacyPassthrough(params: ProxyGenerationRequest) {
  const {
    proxyUrl,
    doFetch,
    modelName,
    contents,
    finalSysInst,
    generationConfig,
    signal,
  } = params;
  const body = {
    model: modelName,
    contents,
    system_instruction: finalSysInst
      ? { parts: [{ text: finalSysInst }] }
      : undefined,
    generationConfig,
  };
  console.log(
    `[OracleProxy] Fetching from: ${proxyUrl} (legacy passthrough, model: ${modelName})`,
  );
  const response = await postProxyJson(doFetch, proxyUrl, body, signal);
  const data = await readProxyGenerationResponse(response);
  if (import.meta.env.DEV)
    console.log("[OracleProxy] Received raw data:", data);
  const candidates = data.candidates || [];
  return sdkGenerationResult(data, legacyText(candidates), candidates);
}

/** Plain text uses the registry; multimodal requests retain Gemini passthrough. */
export async function generateViaProxy(params: ProxyGenerationRequest) {
  try {
    return params.isPlainTextRequest
      ? await sendViaOperationPipeline(params)
      : await sendViaLegacyPassthrough(params);
  } catch (err) {
    console.error("[OracleProxy] Fetch error:", err);
    throw err;
  }
}
