import type { Env } from "../env";
import { getCorsHeaders } from "../cors";
import { getModel } from "./registry";
import { forwardInteractionToGemini } from "./adaptors/gemini-adaptor";
import {
  forwardInteractionToOpenAi,
  extractOpenAiResponseText,
} from "./adaptors/openai-adaptor";

/**
 * Handle an Interactions-style request (server-side conversation state).
 *
 * `body.model` is looked up against the model registry first: an OpenAI
 * registry key (e.g. "luna-fast") routes to OpenAI's Responses API,
 * threading `previous_response_id`; anything else (including raw Gemini
 * model ids not in the registry, for back-compat) forwards to Gemini's
 * `/v1beta/interactions`, threading `previous_interaction_id`. Either way the
 * client only ever sends/receives the provider-neutral `previous_interaction_id`
 * / `{ id, text }` shape — callers (chat/revision/generator sessions) don't
 * need to know which provider is serving a given model key.
 *
 * Returns `{ id, text }`; an expired/invalid previous id is mapped to a typed
 * 409 so the client can reset and replay full history.
 */
// fallow-ignore-next-line complexity
export async function handleInteraction(
  body: any,
  request: Request,
  env: Env,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  const rawModel = typeof body?.model === "string" ? body.model : undefined;
  const registryModel = rawModel ? getModel(rawModel) : undefined;
  const wantsOpenAi = registryModel?.provider === "openai";

  const outgoingBody = {
    ...body,
    model: rawModel,
  };

  if (registryModel && registryModel.provider === "gemini") {
    outgoingBody.model = registryModel.modelId;
  }

  const geminiFallbackModel =
    getModel("gemini-flash-lite")?.modelId ?? "gemini-3.5-flash-lite";
  const isGeminiContinuation =
    typeof body?.previous_interaction_id === "string" &&
    /^(?:v1_|interactions\/)/.test(body.previous_interaction_id);

  let result: any;
  let isGeminiResult: boolean;

  if (
    wantsOpenAi &&
    !isGeminiContinuation &&
    (env.OPENAI_API_KEY || body.previous_interaction_id)
  ) {
    result = await forwardInteractionToOpenAi(
      outgoingBody,
      registryModel!.modelId,
      env,
    );
    isGeminiResult = false;

    const isStaleId =
      body.previous_interaction_id &&
      (result.status === 404 ||
        result.status === 400 ||
        /previous_interaction_id|previous_response_id|interaction.*not found|response.*not found/i.test(
          (result.data as any)?.error?.message || "",
        ));

    // A continuation id belongs to the provider that issued it. Do not send a
    // Gemini id to OpenAI (or retry an OpenAI continuation on Gemini), because
    // this request contains only the incremental turn and would lose history.
    if (!result.ok && !isStaleId && !body.previous_interaction_id) {
      console.warn(
        `[Oracle Proxy] OpenAI interaction failed (${result.status}), falling back to Gemini (${geminiFallbackModel}):`,
        (result.data as any)?.error?.message,
      );
      const geminiBody = {
        ...body,
        model: geminiFallbackModel,
      };
      result = await forwardInteractionToGemini(geminiBody, env);
      isGeminiResult = true;
    }
  } else if (wantsOpenAi) {
    const geminiBody = {
      ...body,
      model: geminiFallbackModel,
    };
    result = await forwardInteractionToGemini(geminiBody, env);
    isGeminiResult = true;
  } else {
    result = await forwardInteractionToGemini(outgoingBody, env);
    isGeminiResult = true;
  }

  if (result.transportError) {
    return json(
      { error: { message: "Failed to reach Interactions API" } },
      502,
    );
  }
  if (result.parseError) {
    return json(
      {
        error: {
          message: "Proxy error: invalid response from Interactions API",
          code: "UPSTREAM_PARSE_ERROR",
        },
      },
      502,
    );
  }

  const data = result.data as any;

  if (!result.ok) {
    const message: string =
      data?.error?.message || "Interaction request failed";
    // An expired or unknown previous id (retention window elapsed, or an
    // OpenAI previous_response_id that's aged out) is recoverable: the
    // client should drop the id and replay full history.
    const isStaleId =
      body.previous_interaction_id &&
      (result.status === 404 ||
        result.status === 400 ||
        /previous_interaction_id|previous_response_id|interaction.*not found|response.*not found/i.test(
          message,
        ));
    if (isStaleId) {
      return json({ error: { message, code: "INTERACTION_NOT_FOUND" } }, 409);
    }
    return json({ error: { message } }, result.status);
  }

  // Gemini's Interactions API: output text lives at steps[].content[].text
  // (model_output steps). OpenAI's Responses API: output text lives at
  // output[].content[].text (message items, output_text blocks).
  const extractedText = isGeminiResult
    ? (Array.isArray(data.steps) ? data.steps : [])
        .flatMap((s: any) => (Array.isArray(s?.content) ? s.content : []))
        .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
        .filter(Boolean)
        .join("")
    : extractOpenAiResponseText(data);

  return json({ id: data.id, text: extractedText }, 200);
}
