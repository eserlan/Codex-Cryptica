import { safeSnapshot } from "./text-generation-context";

/** Request shape shared by buffered and streaming proxy generation. */
export interface NormalizedGenerationRequest {
  contents: any[];
  generationConfig: any;
  finalSysInst: string | undefined;
  isPlainTextRequest: boolean;
}

function isFullRequest(raw: any): boolean {
  return raw && typeof raw === "object" && Array.isArray(raw.contents);
}

function singleContent(raw: any): any[] {
  return raw && typeof raw === "object" && raw.parts
    ? [raw]
    : [{ role: "user", parts: [{ text: String(raw) }] }];
}

function requestContents(raw: any): {
  contents: any[];
  generationConfig: any;
} {
  if (isFullRequest(raw)) {
    return {
      contents: raw.contents,
      generationConfig: raw.generationConfig || raw.generation_config || {},
    };
  }
  if (Array.isArray(raw)) {
    return {
      contents: [
        {
          role: "user",
          parts: raw.map((p) => (typeof p === "string" ? { text: p } : p)),
        },
      ],
      generationConfig: {},
    };
  }
  return {
    contents: singleContent(raw),
    generationConfig: {},
  };
}

function sanitizePart(part: any): any {
  if (typeof part === "string") return { text: part };
  if (part.text && typeof part.text !== "string") {
    console.warn(
      "[OracleProxy] Sanitizing object found in text field:",
      part.text,
    );
    return { text: String(part.text) };
  }
  return part;
}

function isPlainText(contents: any[], generationConfig: any): boolean {
  const modalities: string[] =
    generationConfig?.responseModalities ??
    generationConfig?.response_modalities ??
    [];
  const wantsNonTextOutput =
    modalities.length > 0 &&
    !(modalities.length === 1 && modalities[0] === "TEXT");
  const hasNonTextInput = contents.some((c) =>
    (c.parts || []).some((p: any) => !p || typeof p.text !== "string"),
  );
  return !wantsNonTextOutput && !hasNonTextInput;
}

/** Snapshot reactive data before normalising any supported SDK request shape. */
export function normalizeGenerateContentRequest(
  request: any,
  systemInstruction: string | undefined,
): NormalizedGenerationRequest {
  const raw = safeSnapshot(request);
  const parsed = requestContents(raw);
  const contents = parsed.contents.map((c) => ({
    role: c.role || "user",
    parts: (c.parts || []).map(sanitizePart),
  }));
  const requestSysInst = raw?.systemInstruction ?? raw?.system_instruction;
  const finalSysInst =
    systemInstruction ??
    (typeof requestSysInst === "string"
      ? requestSysInst
      : requestSysInst?.parts?.[0]?.text);
  return {
    contents,
    generationConfig: parsed.generationConfig,
    finalSysInst,
    isPlainTextRequest: isPlainText(contents, parsed.generationConfig),
  };
}

function configSetting(config: any, primary: string, alias: string): unknown {
  return config?.[primary] ?? config?.[alias];
}

function operationSettings(config: any): Record<string, unknown> {
  // A schema enables validated output and permits top-level arrays on OpenAI.
  return Object.fromEntries(
    [
      ["schema", configSetting(config, "responseSchema", "response_schema")],
      ["temperature", config?.temperature],
      ["topP", configSetting(config, "topP", "top_p")],
      [
        "maxOutputTokens",
        configSetting(config, "maxOutputTokens", "max_output_tokens"),
      ],
    ].filter(([, value]) => value !== undefined),
  );
}

/** Both generation paths use identical provider-neutral messages and settings. */
export function buildOperationPipelineBody(params: {
  contents: any[];
  generationConfig: any;
  finalSysInst?: string;
}): Record<string, unknown> {
  const { contents, generationConfig, finalSysInst } = params;
  const messages: Array<{ role: string; content: string }> = [];
  if (finalSysInst) messages.push({ role: "system", content: finalSysInst });
  for (const c of contents) {
    messages.push({
      role: c.role === "model" ? "assistant" : "user",
      content: (c.parts || [])
        .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
        .join(""),
    });
  }
  const wantsJson =
    generationConfig?.responseMimeType === "application/json" ||
    generationConfig?.response_mime_type === "application/json";
  return {
    operation: wantsJson ? "structured-generation" : "freeform-generation",
    messages,
    ...operationSettings(generationConfig),
  };
}
