import type { GenerativeModel } from "@google/generative-ai";
import { normalizeGenerateContentRequest } from "./generation-request";
import { generateViaProxy } from "./proxy-generation";
import {
  type GenerationEvent,
  sendViaOperationPipelineStream,
} from "./proxy-generation-stream";

interface ProxyModelDependencies {
  getProxyUrl: () => string;
  doFetch: typeof fetch;
}

function createChatSession(model: GenerativeModel, options: any = {}) {
  // Copy initial history, then append turns only after successful generation.
  const history = [...(options.history || [])];
  return {
    sendMessageStream: async (
      query: string,
      requestOptions?: { signal?: AbortSignal },
    ) => {
      const contents = [...history, { role: "user", parts: [{ text: query }] }];
      const result = await model.generateContent({ contents }, requestOptions);
      const responseText = result.response.text();
      history.push(
        { role: "user", parts: [{ text: query }] },
        { role: "model", parts: [{ text: responseText }] },
      );
      return {
        stream: (async function* () {
          yield { text: () => responseText };
        })(),
      };
    },
  };
}

async function* unsupportedStream(): AsyncGenerator<GenerationEvent> {
  yield {
    type: "error",
    error: "streaming-not-supported-for-non-text-request",
  };
}

/** SDK-compatible adapter for proxy generation and chat history. */
export function createProxyModel(
  modelName: string,
  systemInstruction: string | undefined,
  dependencies: ProxyModelDependencies,
): GenerativeModel {
  const proxyUrl = dependencies.getProxyUrl();
  const doFetch = dependencies.doFetch;
  return {
    model: modelName,
    systemInstruction,
    startChat: (options: any = {}) =>
      createChatSession(
        createProxyModel(modelName, systemInstruction, dependencies),
        options,
      ),
    async generateContent(
      request: any,
      requestOptions?: { signal?: AbortSignal },
    ) {
      const { signal } = requestOptions ?? {};
      const normalized = normalizeGenerateContentRequest(
        request,
        systemInstruction,
      );
      return generateViaProxy({
        ...normalized,
        proxyUrl,
        doFetch,
        modelName,
        signal,
      });
    },
    generateContentStream(
      request: any,
      signal?: AbortSignal,
    ): AsyncGenerator<GenerationEvent> {
      const normalized = normalizeGenerateContentRequest(
        request,
        systemInstruction,
      );
      if (!normalized.isPlainTextRequest) return unsupportedStream();
      return sendViaOperationPipelineStream({
        ...normalized,
        proxyUrl,
        doFetch,
        signal,
      });
    },
  } as unknown as GenerativeModel;
}
