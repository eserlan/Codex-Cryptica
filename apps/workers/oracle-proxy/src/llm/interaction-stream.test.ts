import { afterEach, describe, expect, it, vi } from "vitest";
import {
  handleInteractionStream,
  normalizeInteractionStreamEvent,
} from "./interaction-stream";

const env = {
  OPENAI_API_KEY: "test-openai",
  GEMINI_API_KEY: "test-gemini",
} as any;
const request = () =>
  new Request("https://proxy.test/", {
    method: "POST",
    headers: { Origin: "https://codexcryptica.com" },
  });

function sse(events: Record<string, unknown>[]): Response {
  const text = events
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join("");
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}
async function eventsFrom(response: Response): Promise<any[]> {
  return (await response.text())
    .split("\n\n")
    .filter((value) => value.startsWith("data:"))
    .map((line) => JSON.parse(line.slice(5).trim()));
}

afterEach(() => vi.unstubAllGlobals());

describe("Solo Adventure provider conversation SSE", () => {
  it("ignores Gemini private thought steps and streams only model output", () => {
    const steps = new Set<number>();
    expect(
      normalizeInteractionStreamEvent(
        "gemini",
        { event_type: "step.start", index: 0, step: { type: "thought" } },
        steps,
      ),
    ).toBeNull();
    expect(
      normalizeInteractionStreamEvent(
        "gemini",
        {
          event_type: "step.delta",
          index: 0,
          delta: { type: "text", text: "GM secret" },
        },
        steps,
      ),
    ).toBeNull();
    expect(
      normalizeInteractionStreamEvent(
        "gemini",
        { event_type: "step.start", index: 1, step: { type: "model_output" } },
        steps,
      ),
    ).toBeNull();
    expect(
      normalizeInteractionStreamEvent(
        "gemini",
        { event_type: "step.delta", index: 1, delta: { type: "text", text: "{\"kind\"" } },
        steps,
      ),
    ).toEqual({ type: "delta", text: '{"kind"' });
  });

  it("streams OpenAI Responses and supplies the new continuation id", async () => {
    const fetcher = vi.fn(async () =>
      sse([
        { type: "response.created", response: { id: "r-1" } },
        { type: "response.output_text.delta", delta: '{"kind":"complete",' },
        { type: "response.output_text.delta", delta: '"narration":"Hello."}' },
        { type: "response.completed", response: { id: "r-1" } },
      ]),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await handleInteractionStream(
      {
        model: "luna-fast",
        input: "Respond with valid JSON",
        previous_interaction_id: "prior",
        generationConfig: { responseMimeType: "application/json" },
      },
      request(),
      env,
    );
    expect(result.status).toBe(200);
    const received = await eventsFrom(result);
    expect(received.map((x) => x.type)).toEqual([
      "started", "delta", "delta", "complete",
    ]);
    expect(received.at(-1)).toEqual({
      type: "complete",
      id: "r-1",
      text: '{"kind":"complete","narration":"Hello."}',
    });
    const [url, opts] = fetcher.mock.calls[0] as any[];
    expect(url).toContain("/v1/responses");
    const payload = JSON.parse(opts.body);
    expect(payload.previous_response_id).toBe("prior");
    expect(payload.stream).toBe(true);
    expect(payload.text.format).toEqual({ type: "json_object" });
  });

  it("handles Gemini Interactions continuation and excludes hidden reasoning", async () => {
    const fetcher = vi.fn(async () =>
      sse([
        { event_type: "interaction.created", interaction: { id: "v1_reply" } },
        { event_type: "step.start", index: 0, step: { type: "thought" } },
        { event_type: "step.delta", index: 0, delta: { type: "text", text: "secret reasoning" } },
        { event_type: "step.start", index: 1, step: { type: "model_output", content: [{ type: "text", text: '{"kind":' }] } },
        { event_type: "step.delta", index: 1, delta: { type: "text", text: '"complete"}' } },
        { event_type: "interaction.completed", interaction: { id: "v1_reply" } },
      ]),
    );
    vi.stubGlobal("fetch", fetcher);
    const res = await handleInteractionStream(
      { model: "gemini-flash-lite", input: "continue", previous_interaction_id: "v1_prior" },
      request(),
      env,
    );
    const events = await eventsFrom(res);
    expect(events.at(-1)).toEqual({
      type: "complete",
      id: "v1_reply",
      text: '{"kind":"complete"}',
    });
    expect(JSON.stringify(events)).not.toContain("secret reasoning");
    const [url, options] = fetcher.mock.calls[0] as any[];
    expect(url).toContain("/v1beta/interactions");
    expect(JSON.parse(options.body)).toMatchObject({
      previous_interaction_id: "v1_prior",
      stream: true,
    });
  });

  it("reports incomplete streams as errors, never completed turns", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      sse([{ type: "response.output_text.delta", delta: "partial" }]),
    ));
    const res = await handleInteractionStream(
      { model: "luna-fast", input: "test" },
      request(),
      env,
    );
    const events = await eventsFrom(res);
    expect(events.at(-1)).toEqual({
      type: "error",
      error: "interaction-stream-incomplete",
    });
    expect(events.some((x) => x.type === "complete")).toBe(false);
  });

  it("reports expired provider continuations as a typed 409", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response('{"error":{"message":"not found"}}', { status: 404 }),
    ));
    const res = await handleInteractionStream(
      { model: "gemini-flash-lite", input: "continue", previous_interaction_id: "v1_expired" },
      request(),
      env,
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("INTERACTION_NOT_FOUND");
  });
});
