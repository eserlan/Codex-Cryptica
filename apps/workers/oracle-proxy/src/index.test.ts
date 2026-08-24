import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { DEFAULT_CF_IMAGE_MODEL } from "../../../../packages/oracle-engine/src/image-defaults";
import worker, { isOriginAllowed } from "./index";

describe("Oracle Proxy Worker CORS", () => {
  const emptyEnv = { GEMINI_API_KEY: "test-key" };

  it("allows every origin this Worker actually serves, with no env vars set", () => {
    // One Worker serves all environments, so the defaults have to cover all of
    // them — setting ALLOWED_ORIGINS per environment is what broke staging on
    // 2026-08-11.
    for (const origin of [
      "https://codexcryptica.com",
      "https://www.codexcryptica.com",
      "https://staging.codexcryptica.com",
      "https://codex-cryptica.pages.dev",
    ]) {
      expect(isOriginAllowed(origin, emptyEnv), origin).toBeTruthy();
    }
  });

  it("does not allow domains the project no longer serves", () => {
    // An allowlist entry for an unregistered domain hands CORS access to
    // whoever registers it next; these two resolve nowhere.
    for (const origin of [
      "https://codex-cryptica.com",
      "https://staging.codex-cryptica.com",
    ]) {
      expect(isOriginAllowed(origin, emptyEnv), origin).toBeFalsy();
    }
  });

  it("adds CORS headers to starter deck reads", async () => {
    const response = await worker.fetch(
      new Request(
        "https://oracle-proxy.espen-erlandsen.workers.dev/api/starter-tile-decks/kenney-scribble-dungeons",
        { headers: { Origin: "https://codexcryptica.com" } },
      ),
      {
        ...emptyEnv,
        BUCKET: {
          get: async () => ({
            body: new Blob(["{}"], { type: "application/json" }).stream(),
            etag: "starter-deck-manifest",
          }),
        },
      },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://codexcryptica.com",
    );
  });

  it("allows Cloudflare Pages preview subdomains for this project", () => {
    expect(
      isOriginAllowed(
        "https://feature-branch.codex-cryptica.pages.dev",
        emptyEnv,
      ),
    ).toBeTruthy();
    expect(
      isOriginAllowed("https://staging.codex-cryptica.pages.dev", emptyEnv),
    ).toBeTruthy();
  });

  it("allows any localhost or loopback dev origin", () => {
    expect(isOriginAllowed("http://localhost:4173", emptyEnv)).toBeTruthy();
    expect(isOriginAllowed("http://localhost:5173", emptyEnv)).toBeTruthy();
    expect(isOriginAllowed("http://127.0.0.1:4173", emptyEnv)).toBeTruthy();
    expect(isOriginAllowed("http://127.0.0.1:9999", emptyEnv)).toBeTruthy();
  });

  it("allows the Turnstile token header during publish preflight", async () => {
    const response = await worker.fetch(
      new Request(
        "https://oracle-proxy.espen-erlandsen.workers.dev/api/publish-vault",
        {
          method: "OPTIONS",
          headers: {
            Origin: "https://staging.codexcryptica.com",
            "Access-Control-Request-Headers":
              "content-type,x-turnstile-token,x-filename",
          },
        },
      ),
      emptyEnv,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "X-Turnstile-Token",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "X-Filename",
    );
  });

  it("treats ALLOWED_ORIGINS as an exact allowlist", () => {
    expect(
      isOriginAllowed("http://localhost:4173", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com,http://localhost:4173",
      }),
    ).toBeTruthy();
    expect(
      isOriginAllowed("https://codexcryptica.com", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
      }),
    ).toBeFalsy();
    expect(
      isOriginAllowed("http://localhost:4173", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
      }),
    ).toBeFalsy();
    expect(
      isOriginAllowed("https://feature-branch.codex-cryptica.pages.dev", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
      }),
    ).toBeFalsy();
  });

  it("can explicitly allow Cloudflare Pages previews with a strict allowlist", () => {
    expect(
      isOriginAllowed("https://feature-branch.codex-cryptica.pages.dev", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
        ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS: "true",
      }),
    ).toBeTruthy();
    expect(
      isOriginAllowed("https://feature-branch.evil.pages.dev", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
        ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS: "true",
      }),
    ).toBeFalsy();
  });

  it("rejects non-loopback origins that are not allowlisted", () => {
    expect(isOriginAllowed("https://evil.com", emptyEnv)).toBeFalsy();
    expect(
      isOriginAllowed("https://feature-branch.evil.pages.dev", emptyEnv),
    ).toBeFalsy();
    expect(isOriginAllowed("http://192.168.0.15:4173", emptyEnv)).toBeFalsy();
    expect(isOriginAllowed("file://localhost", emptyEnv)).toBeFalsy();
  });
});

describe("Oracle Proxy Worker directory routing", () => {
  const env = { GEMINI_API_KEY: "test-key" };

  it("returns method not allowed for unsupported directory listing methods", async () => {
    const response = await worker.fetch(
      new Request(
        "https://oracle-proxy.espen-erlandsen.workers.dev/api/directory/listings",
        {
          method: "POST",
          headers: {
            Origin: "https://codexcryptica.com",
          },
        },
      ),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(405);
  });

  it("returns method not allowed for unsupported published listing methods", async () => {
    const response = await worker.fetch(
      new Request(
        "https://oracle-proxy.espen-erlandsen.workers.dev/api/published/pub-123/listing",
        {
          method: "PATCH",
          headers: {
            Origin: "https://codexcryptica.com",
          },
        },
      ),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(405);
  });

  it("returns not found for unknown published subroutes", async () => {
    const response = await worker.fetch(
      new Request(
        "https://oracle-proxy.espen-erlandsen.workers.dev/api/published/pub-123/unknown",
        {
          method: "GET",
          headers: {
            Origin: "https://codexcryptica.com",
          },
        },
      ),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(405);
  });
});

describe("Oracle Proxy Worker image generation", () => {
  beforeEach(() => {
    (globalThis as any).caches = {
      default: {
        match: vi.fn(async () => undefined),
        put: vi.fn(async () => undefined),
      },
    };
  });

  const request = (body: Record<string, unknown>) =>
    new Request(
      "https://oracle-proxy.espen-erlandsen.workers.dev/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://codexcryptica.com",
        },
        body: JSON.stringify(body),
      },
    );

  it("uses the shared Cloudflare image model when no model is provided", async () => {
    const ai = {
      run: vi.fn(async () => ({ image: "base64-image" })),
    };

    const response = await worker.fetch(
      request({ prompt: "castle at sunset" }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      result: { image: "base64-image" },
    });
    // The default is a FLUX.2 model, which takes multipart.
    expect(ai.run).toHaveBeenCalledWith(
      DEFAULT_CF_IMAGE_MODEL,
      expect.objectContaining({
        multipart: expect.objectContaining({
          body: expect.any(Object),
          contentType: expect.stringContaining("multipart/form-data"),
        }),
      }),
    );
  });

  it("forwards the requested size and the negative prompt as multipart", async () => {
    // Both were dropped: every proxy image came back 1024x1024 whatever
    // framing the prompt asked for, and its negative terms went nowhere.
    const ai = { run: vi.fn(async () => ({ image: "base64-image" })) };

    await worker.fetch(
      request({
        prompt: "a tall figure",
        model: "@cf/black-forest-labs/flux-2-klein-4b",
        width: 832,
        height: 1216,
        negative_prompt: "watermark, extra fingers",
      }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    const { body, contentType } = ai.run.mock.calls[0][1].multipart;
    const form = await new Response(body, {
      headers: { "content-type": contentType },
    }).formData();

    expect(form.get("width")).toBe("832");
    expect(form.get("height")).toBe("1216");
    expect(form.get("negative_prompt")).toBe("watermark, extra fingers");
  });

  it("still defaults the size when the caller sends none", async () => {
    const ai = { run: vi.fn(async () => ({ image: "base64-image" })) };

    await worker.fetch(
      request({ prompt: "a tall figure" }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    const { body, contentType } = ai.run.mock.calls[0][1].multipart;
    const form = await new Response(body, {
      headers: { "content-type": contentType },
    }).formData();

    expect(form.get("width")).toBe("1024");
    expect(form.get("negative_prompt")).toBeNull();
  });

  it("uses the requested Cloudflare image model when one is provided", async () => {
    const ai = {
      run: vi.fn(async () => ({ image: "base64-image" })),
    };
    const model = "@cf/black-forest-labs/flux-2-dev";

    const response = await worker.fetch(
      request({ prompt: "castle at sunset", model }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(ai.run).toHaveBeenCalledWith(
      model,
      expect.objectContaining({
        multipart: expect.objectContaining({
          body: expect.any(Object),
          contentType: expect.stringContaining("multipart/form-data"),
        }),
      }),
    );
  });

  it("sends a plain object to models that do not take multipart", async () => {
    // Workers AI answers a multipart body with "5012: field required: prompt"
    // for anything outside the FLUX.2 family — a hard failure, not a fallback.
    const ai = { run: vi.fn(async () => ({ image: "base64-image" })) };

    await worker.fetch(
      request({
        prompt: "a tall figure",
        model: "@cf/leonardo/phoenix-1.0",
        width: 832,
        height: 1216,
        negative_prompt: "watermark",
      }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    expect(ai.run).toHaveBeenCalledWith("@cf/leonardo/phoenix-1.0", {
      prompt: "a tall figure",
      width: 832,
      height: 1216,
      negative_prompt: "watermark",
    });
  });

  it("withholds the negative prompt from a model that does not declare it", async () => {
    // The binding validates against the model schema and answers "8001:
    // Invalid input" for an undeclared field, which fails the generation
    // outright. REST ignores the same field, which is how this was missed.
    const ai = { run: vi.fn(async () => ({ image: "base64-image" })) };

    await worker.fetch(
      request({
        prompt: "a tall figure",
        model: "@cf/leonardo/lucid-origin",
        negative_prompt: "watermark",
      }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    expect(ai.run.mock.calls[0][1].negative_prompt).toBeUndefined();
    expect(ai.run.mock.calls[0][1].prompt).toBe("a tall figure");
  });

  it("sends the negative prompt to a model that does declare it", async () => {
    const ai = { run: vi.fn(async () => ({ image: "base64-image" })) };

    await worker.fetch(
      request({
        prompt: "a tall figure",
        model: "@cf/leonardo/phoenix-1.0",
        negative_prompt: "watermark",
      }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    expect(ai.run.mock.calls[0][1].negative_prompt).toBe("watermark");
  });

  it("explains the shared daily budget instead of quoting neurons", async () => {
    // 4006 is the account's daily allocation, not a fault in the request, and
    // reached users as a raw provider string about neurons.
    const ai = {
      run: vi.fn(async () => {
        throw new Error(
          "4006: you have used up your daily free allocation of 10,000 neurons",
        );
      }),
    };

    const response = await worker.fetch(
      request({ prompt: "a tall figure" }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(429);
    const body = (await response.json()) as any;
    expect(body.error.code).toBe("IMAGE_BUDGET_EXCEEDED");
    expect(body.error.message).toContain("shared image allowance");
    expect(body.error.message).not.toContain("neurons");
  });

  it("still reports other generation failures as they came", async () => {
    const ai = {
      run: vi.fn(async () => {
        throw new Error("5012: Invalid input");
      }),
    };

    const response = await worker.fetch(
      request({ prompt: "a tall figure" }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as any;
    expect(body.error.code).toBe("IMAGE_GEN_FAILED");
    expect(body.error.message).toContain("5012");
  });

  it("omits the negative prompt when the caller sends none", async () => {
    const ai = { run: vi.fn(async () => ({ image: "base64-image" })) };

    await worker.fetch(
      request({ prompt: "a tall figure", model: "@cf/leonardo/lucid-origin" }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    expect(ai.run).toHaveBeenCalledWith("@cf/leonardo/lucid-origin", {
      prompt: "a tall figure",
      width: 1024,
      height: 1024,
    });
  });
});

describe("Oracle Proxy Worker Interactions API", () => {
  const env = { GEMINI_API_KEY: "test-key" };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const request = (body: Record<string, unknown>) =>
    new Request("https://oracle-proxy.espen-erlandsen.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://codexcryptica.com",
      },
      body: JSON.stringify(body),
    });

  it("rewrites model to registry modelId for Gemini entries and ignores non-string model values", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "v1_gemini",
            steps: [{ content: [{ text: "gemini reply" }] }],
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const res1 = await worker.fetch(
      request({ input: "hi", model: "gemini-flash-lite" }),
      env,
      {} as ExecutionContext,
    );
    expect(res1.status).toBe(200);
    const body1 = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body1.model).toBe("gemini-3.5-flash-lite");

    const res2 = await worker.fetch(
      request({ input: "hi", model: { invalid: true } }),
      env,
      {} as ExecutionContext,
    );
    expect(res2.status).toBe(200);
    const body2 = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body2.model).toBe("gemini-3.5-flash-lite");
  });

  it("routes an unrecognized operation to legacy generateContent", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "v1_abc",
            status: "completed",
            steps: [
              {
                type: "model_output",
                content: [{ type: "text", text: "The crone speaks." }],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      request({
        input: "Tell me about the crone",
        model: "gemini-3-flash-preview",
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: "v1_abc", text: "The crone speaks." }),
    );

    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(String(calledUrl)).toContain("/v1beta/interactions");
    const sent = JSON.parse(init.body as string);
    expect(sent.input).toBe("Tell me about the crone");
    expect(sent.store).toBe(true);
  });

  it("threads previous_interaction_id through to the upstream", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "v1_two", steps: [] }), {
          status: 200,
        }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await worker.fetch(
      request({ input: "and then?", previous_interaction_id: "v1_abc" }),
      env,
      {} as ExecutionContext,
    );

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const sent = JSON.parse(init.body as string);
    expect(sent.previous_interaction_id).toBe("v1_abc");
  });

  it("maps an expired previous_interaction_id to a 409 INTERACTION_NOT_FOUND", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { message: "previous_interaction_id not found" },
          }),
          { status: 404 },
        ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      request({ input: "continue", previous_interaction_id: "expired" }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: "INTERACTION_NOT_FOUND" }),
      }),
    );
  });

  it("routes an OpenAI registry key (luna-fast) to the Responses API and extracts output text", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "resp_abc",
            output: [
              {
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: "The crone speaks." }],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      request({ input: "Tell me about the crone", model: "luna-fast" }),
      { ...env, OPENAI_API_KEY: "test-openai-key" },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: "resp_abc", text: "The crone speaks." }),
    );

    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(String(calledUrl)).toContain("/v1/responses");
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe("gpt-5.6-luna");
    expect(sent.input).toBe("Tell me about the crone");
    expect(sent.store).toBe(true);
  });

  it("threads previous_interaction_id as previous_response_id for OpenAI models", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "resp_two", output: [] }), {
          status: 200,
        }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await worker.fetch(
      request({
        input: "and then?",
        model: "luna-fast",
        previous_interaction_id: "resp_abc",
      }),
      { ...env, OPENAI_API_KEY: "test-openai-key" },
      {} as ExecutionContext,
    );

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const sent = JSON.parse(init.body as string);
    expect(sent.previous_response_id).toBe("resp_abc");
  });

  it("maps an expired previous_response_id on an OpenAI model to a 409 INTERACTION_NOT_FOUND", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { message: "previous_response_id not found" },
          }),
          { status: 404 },
        ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      request({
        input: "continue",
        model: "luna-fast",
        previous_interaction_id: "expired",
      }),
      { ...env, OPENAI_API_KEY: "test-openai-key" },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: "INTERACTION_NOT_FOUND" }),
      }),
    );
  });
});

describe("Oracle Proxy Worker: operation-field discriminator (US1 regression)", () => {
  const env = { GEMINI_API_KEY: "test-key" };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const post = (body: Record<string, unknown>) =>
    new Request("https://oracle-proxy.espen-erlandsen.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://codexcryptica.com",
      },
      body: JSON.stringify(body),
    });

  it("routes a body.input request through the legacy Interactions branch unchanged when no operation field is present", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "v1_x", steps: [] }), {
          status: 200,
        }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      post({ input: "hello" }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: "v1_x", text: "" }),
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/v1beta/interactions",
    );
  });

  it("routes a plain contents request through the legacy generateContent branch unchanged when no operation field is present", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      post({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ candidates: [] });
    expect(String(fetchMock.mock.calls[0][0])).toContain(":generateContent");
  });

  it("does not route through the new pipeline when operation is an unrecognized value", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      post({
        operation: "not-a-real-operation",
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toContain(":generateContent");
  });

  it("replays the full pre-existing request-shape matrix with no client-visible change (Story 1 Scenario 2)", async () => {
    // Interactions shape
    const interactionsFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "v1_a",
            steps: [{ content: [{ text: "reply" }] }],
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = interactionsFetch as typeof fetch;
    const interactionsResponse = await worker.fetch(
      post({ input: "hi" }),
      env,
      {} as ExecutionContext,
    );
    expect(interactionsResponse.status).toBe(200);
    expect(await interactionsResponse.json()).toEqual({
      id: "v1_a",
      text: "reply",
    });

    // generateContent shape
    const generateFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "ok" }] } }],
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = generateFetch as typeof fetch;
    const generateResponse = await worker.fetch(
      post({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }),
      env,
      {} as ExecutionContext,
    );
    expect(generateResponse.status).toBe(200);
    expect(await generateResponse.json()).toEqual({
      candidates: [{ content: { parts: [{ text: "ok" }] } }],
    });

    // Malformed generateContent shape (missing contents) still 400s exactly as before
    const invalidResponse = await worker.fetch(
      post({ notContents: true }),
      env,
      {} as ExecutionContext,
    );
    expect(invalidResponse.status).toBe(400);
  });
});
