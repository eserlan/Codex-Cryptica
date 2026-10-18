import { DEFAULT_CF_IMAGE_MODEL } from "./image-defaults";
import { getCorsHeaders } from "./cors";
import { checkRateLimit } from "./rate-limiting";
import type { Env } from "./env";

/**
 * FLUX.2 models are served through the multipart image-generation endpoint.
 * Matched by family rather than by an exhaustive list so a new klein or dev
 * variant keeps working without a proxy deploy.
 */
export function usesMultipartInput(model: string): boolean {
  return /flux-2/i.test(model);
}

/**
 * Whether a model's schema declares `negative_prompt`.
 *
 * The AI binding validates input against that schema and answers "8001:
 * Invalid input" for a field the model does not declare — Lucid Origin, for
 * one. The REST endpoint is more forgiving and ignores it, which is how this
 * was missed: the same request succeeded over REST and failed through the
 * binding. An allow-list, because a rejection breaks generation outright while
 * an omitted negative merely goes unused.
 */
export function supportsNegativePrompt(model: string): boolean {
  if (usesMultipartInput(model)) return true;
  return /stable-diffusion|dreamshaper|phoenix/i.test(model);
}

function buildMultipartInput(
  prompt: string,
  width: number,
  height: number,
  negativePrompt?: string,
) {
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", String(width));
  form.append("height", String(height));
  if (negativePrompt) form.append("negative_prompt", negativePrompt);

  const formResponse = new Response(form);
  const contentType =
    formResponse.headers.get("content-type") || "multipart/form-data";
  return {
    multipart: {
      body: formResponse.body || form,
      contentType,
    },
  };
}

/**
 * Safely convert ArrayBuffer to Base64 avoiding stack overflows.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunk, len)) as any,
    );
  }
  return btoa(binary);
}

export async function handleImageGeneration(
  request: Request,
  env: Env,
  isAllowedOrigin: boolean,
): Promise<Response> {
  if (!isAllowedOrigin) {
    return new Response("Forbidden", {
      status: 403,
      headers: getCorsHeaders(request.headers, env),
    });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
  const limitResult = await checkRateLimit(ip);
  if (!limitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: {
          message:
            "Daily image generation limit exceeded. Please try again tomorrow, or configure your own Cloudflare Account ID and API Token in settings.",
          code: "RATE_LIMIT_EXCEEDED",
        },
      }),
      {
        status: 429,
        headers: {
          ...getCorsHeaders(request.headers, env),
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const body = (await request.json()) as any;
    const prompt = body.prompt;
    const targetModel = body.model || DEFAULT_CF_IMAGE_MODEL;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: { message: "Prompt is required" } }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(request.headers, env),
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (!env.AI) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Workers AI binding is not configured on the proxy",
          },
        }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(request.headers, env),
            "Content-Type": "application/json",
          },
        },
      );
    }

    console.log(
      `[Oracle Proxy] Generating image using Workers AI model: ${targetModel}`,
    );
    const width = Number(body.width) || 1024;
    const height = Number(body.height) || 1024;
    // Forwarded rather than dropped: the client has always sent this and
    // the proxy has always discarded it, so every negative term composed
    // for a proxy image went nowhere.
    const negativePrompt = body.negative_prompt
      ? String(body.negative_prompt)
      : undefined;

    // Workers AI does not take one input shape. The FLUX.2 family expects
    // a multipart body, because that endpoint also accepts reference
    // images for editing; every other text-to-image model expects a plain
    // object and answers a multipart body with "field required: prompt".
    // Sending the wrong one is a 5012, not a soft failure, so the shape
    // follows the model.
    const image = await generateImage(env, targetModel, {
      prompt,
      width,
      height,
      negativePrompt,
    });

    return new Response(
      JSON.stringify({
        success: true,
        result: { image },
      }),
      {
        status: 200,
        headers: {
          ...getCorsHeaders(request.headers, env),
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return imageGenerationErrorResponse(request, env, error);
  }
}

function imageGenerationErrorResponse(
  request: Request,
  env: Env,
  error: unknown,
): Response {
  console.error("[Oracle Proxy] Cloudflare Workers AI image error:", error);
  const raw =
    error instanceof Error ? error.message : "Image generation failed";
  // 4006 is the shared account's daily neuron budget, not a fault in the
  // request. It reached users as a raw provider string about neurons,
  // which explains nothing and suggests nothing they can do.
  const outOfBudget = /\b4006\b|daily free allocation/i.test(raw);

  return new Response(
    JSON.stringify({
      error: {
        message: outOfBudget
          ? "The shared image allowance for today is used up. It resets daily — or configure your own Cloudflare Account ID and API Token in settings to generate without the shared limit."
          : raw,
        code: outOfBudget ? "IMAGE_BUDGET_EXCEEDED" : "IMAGE_GEN_FAILED",
      },
    }),
    {
      status: outOfBudget ? 429 : 500,
      headers: {
        ...getCorsHeaders(request.headers, env),
        "Content-Type": "application/json",
      },
    },
  );
}

async function generateImage(
  env: Env,
  model: string,
  input: {
    prompt: string;
    width: number;
    height: number;
    negativePrompt?: string;
  },
): Promise<string> {
  const { prompt, width, height, negativePrompt } = input;
  const modelInput = usesMultipartInput(model)
    ? buildMultipartInput(prompt, width, height, negativePrompt)
    : {
        prompt,
        width,
        height,
        ...(negativePrompt && supportsNegativePrompt(model)
          ? { negative_prompt: negativePrompt }
          : {}),
      };
  const output = await env.AI!.run(model, modelInput);
  const base64Image = getBase64Image(output);
  if (base64Image !== null) return base64Image;

  const buffer = await getImageBuffer(output);
  return arrayBufferToBase64(buffer);
}

function getBase64Image(output: unknown): string | null {
  if (typeof output !== "object" || output === null || !("image" in output)) {
    return null;
  }
  const image = (output as { image: unknown }).image;
  return typeof image === "string" ? image : null;
}

async function getImageBuffer(output: unknown): Promise<ArrayBuffer> {
  if (output instanceof ArrayBuffer) return output;
  if (output instanceof Uint8Array) {
    return output.buffer.slice(
      output.byteOffset,
      output.byteOffset + output.byteLength,
    ) as ArrayBuffer;
  }

  const image =
    typeof output === "object" && output !== null && "image" in output
      ? (output as { image: unknown }).image
      : output;
  if (image instanceof ArrayBuffer) return image;
  if (image instanceof Uint8Array) {
    return image.buffer.slice(
      image.byteOffset,
      image.byteOffset + image.byteLength,
    ) as ArrayBuffer;
  }
  if (isResponseBody(image)) {
    return new Response(image as BodyInit).arrayBuffer();
  }

  throw new Error("Invalid output format returned from Workers AI");
}

function isResponseBody(value: unknown): boolean {
  return (
    value instanceof ReadableStream ||
    (typeof value === "object" &&
      value !== null &&
      ("getReader" in value || "arrayBuffer" in value))
  );
}
