import { describe, expect, it, vi } from "vitest";
import { AdventureInteractionTransport } from "./adventure-interaction-transport";
import { session } from "./adventure-generation.test-fixtures";

const request = {
  session,
  phase: "action" as const,
  anchors: [],
  relevant: [],
  onNarration: () => {},
};
const params = {
  model: "luna-fast",
  input: "input",
  previousInteractionId: "saved",
};
const getModel = async (): Promise<never> => {
  throw new Error("unexpected SDK call");
};

describe("adventure interaction transport", () => {
  it("preserves the client receiver and collects streamed output and its final ID", async () => {
    const client = {
      getModel,
      async *sendInteractionStream() {
        expect(this).toBe(client);
        yield { type: "started" as const };
        yield { type: "delta" as const, text: "partial" };
        yield { type: "complete" as const, text: "", id: "final" };
      },
    };
    expect(
      await new AdventureInteractionTransport(client).send(request, params),
    ).toEqual({ id: "final", text: "partial" });
  });

  it.each([
    "interaction-stream-unavailable",
    "interaction-stream-incomplete",
    "interaction-stream-read-error",
  ])(
    "retries %s once with the same continuation parameters",
    async (reason) => {
      const sendInteraction = vi.fn(async (input) => {
        expect(input).toBe(params);
        return { id: "buffered", text: "output" };
      });
      const client = {
        getModel,
        sendInteraction,
        async *sendInteractionStream() {
          yield { type: "started" as const };
          throw new Error(reason);
        },
      };
      expect(
        await new AdventureInteractionTransport(client).send(request, params),
      ).toEqual({ id: "buffered", text: "output" });
      expect(sendInteraction).toHaveBeenCalledOnce();
    },
  );

  it("falls back when the stream ends without a complete event or ID", async () => {
    for (const completed of [false, true]) {
      const sendInteraction = vi.fn(async () => ({
        id: "buffered",
        text: "output",
      }));
      const transport = new AdventureInteractionTransport({
        getModel,
        sendInteraction,
        async *sendInteractionStream() {
          if (completed)
            yield { type: "complete" as const, text: "output", id: "" };
        },
      });
      expect(await transport.send(request, params)).toMatchObject({
        id: "buffered",
      });
      expect(sendInteraction).toHaveBeenCalledOnce();
    }
  });

  it("does not retry unsupported failures, explicit provider errors, or cancellation", async () => {
    for (const reason of [
      "interaction-output-too-long",
      "interaction-stream-incomplete",
    ]) {
      const controller = new AbortController();
      const sendInteraction = vi.fn(async () => ({
        id: "unexpected",
        text: "",
      }));
      const transport = new AdventureInteractionTransport({
        getModel,
        sendInteraction,
        async *sendInteractionStream() {
          if (reason === "interaction-stream-incomplete") controller.abort();
          yield { type: "error" as const, error: reason };
        },
      });
      await expect(
        transport.send(request, { ...params, signal: controller.signal }),
      ).rejects.toThrow();
      expect(sendInteraction).not.toHaveBeenCalled();
    }
  });

  it("requires buffering when previews are disabled and reports unavailable clients", async () => {
    const transport = new AdventureInteractionTransport({
      getModel,
      async *sendInteractionStream() {},
    });
    expect(transport.available).toBe(true);
    expect(transport.canBuffer).toBe(false);
    await expect(transport.send(request, params, false)).rejects.toThrow(
      "interaction-client-unavailable",
    );
    expect(new AdventureInteractionTransport({ getModel }).available).toBe(
      false,
    );
    await expect(transport.send(request, params)).rejects.toThrow(
      "interaction-stream-incomplete",
    );
  });
});
