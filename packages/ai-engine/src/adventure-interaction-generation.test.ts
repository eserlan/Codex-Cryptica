import { describe, expect, it } from "vitest";
import { buildAdventurePrompt } from "@codex/adventure-engine";
import { AdventureInteractionGeneration } from "./adventure-interaction-generation";
import { AdventureInteractionContext } from "./adventure-interaction-context";
import { InteractionExpiredError } from "./client-manager";
import {
  session,
  completeResponse,
} from "./adventure-generation.test-fixtures";
import type { AdventureAIClient } from "./adventure-generation.types";

const request = {
  session,
  phase: "action" as const,
  anchors: [],
  relevant: [],
};
const getModel = async (): Promise<never> => {
  throw new Error("unexpected stateless client");
};
type InteractionParams = Parameters<
  NonNullable<AdventureAIClient["sendInteraction"]>
>[0];

describe("adventure retained generation", () => {
  it("rebuilds full state once on expiry and stages the new ID until acknowledgement", async () => {
    const calls: InteractionParams[] = [];
    const context = new AdventureInteractionContext();
    const generator = new AdventureInteractionGeneration(
      {
        getModel,
        async sendInteraction(params) {
          calls.push(params);
          if (calls.length === 2) throw new InteractionExpiredError("expired");
          return { id: `reply-${calls.length}`, text: completeResponse };
        },
      },
      context,
    );
    await generator.generate(
      request,
      buildAdventurePrompt(request),
      "instruction",
      {},
    );
    context.confirm(session.id, 1);
    const next = { ...request, session: { ...session, revision: 1 } };
    await generator.generate(
      next,
      buildAdventurePrompt(next),
      "instruction",
      {},
    );
    expect(calls.map((call) => call.previousInteractionId)).toEqual([
      null,
      "reply-1",
      null,
    ]);
    expect(JSON.parse(calls[1].input)).toHaveProperty("stateDelta");
    expect(JSON.parse(calls[2].input)).toHaveProperty("state");
    expect(context.get(session.id)).toMatchObject({
      previousInteractionId: null,
      pending: { id: "reply-3" },
    });
  });

  it("withdraws invalid previews and repairs against the last saved ID", async () => {
    const calls: InteractionParams[] = [];
    const previews: string[] = [];
    const context = new AdventureInteractionContext();
    const generator = new AdventureInteractionGeneration(
      {
        getModel,
        async sendInteraction(params) {
          calls.push(params);
          return {
            id: `reply-${calls.length}`,
            text: calls.length === 2 ? "invalid" : completeResponse,
          };
        },
      },
      context,
    );
    await generator.generate(
      request,
      buildAdventurePrompt(request),
      "instruction",
      {},
    );
    context.confirm(session.id);
    const next = {
      ...request,
      session: { ...session, revision: 1 },
      onNarration: (text: string) => previews.push(text),
    };
    await generator.generate(
      next,
      buildAdventurePrompt(next),
      "instruction",
      {},
    );
    expect(previews).toEqual([""]);
    expect(calls.map((call) => call.previousInteractionId)).toEqual([
      null,
      "reply-1",
      "reply-1",
    ]);
    expect(JSON.parse(calls[2].input).responseRepair).toContain(
      "Previous JSON failed validation",
    );
    expect(context.get(session.id)).toMatchObject({
      previousInteractionId: "reply-1",
      pending: { id: "reply-3" },
    });
  });

  it("repairs with streaming when no buffered capability exists", async () => {
    let calls = 0;
    const generator = new AdventureInteractionGeneration(
      {
        getModel,
        async *sendInteractionStream() {
          calls += 1;
          yield {
            type: "complete" as const,
            text: calls === 1 ? "invalid" : completeResponse,
            id: `stream-${calls}`,
          };
        },
      },
      new AdventureInteractionContext(),
    );
    await expect(
      generator.generate(
        { ...request, onNarration: () => {} },
        buildAdventurePrompt(request),
        "instruction",
        {},
      ),
    ).resolves.toMatchObject({ kind: "complete" });
    expect(calls).toBe(2);
  });

  it.each(["invalid", "expired", "missing-id", "cancelled", "repair-expired"])(
    "clears context and bounds retries on %s failure",
    async (reason) => {
      let calls = 0;
      const context = new AdventureInteractionContext();
      const initial = context.get(session.id);
      const controller = new AbortController();
      const generator = new AdventureInteractionGeneration(
        {
          getModel,
          async sendInteraction() {
            calls += 1;
            if (
              reason === "expired" ||
              (reason === "repair-expired" && calls === 2)
            )
              throw new InteractionExpiredError("expired");
            if (reason === "cancelled") controller.abort();
            return {
              id: reason === "missing-id" ? "" : "reply",
              text: ["invalid", "repair-expired"].includes(reason)
                ? "invalid"
                : completeResponse,
            };
          },
        },
        context,
      );
      await expect(
        generator.generate(
          request,
          buildAdventurePrompt(request),
          "instruction",
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
      expect(calls).toBe(
        ["invalid", "expired", "repair-expired"].includes(reason) ? 2 : 1,
      );
      expect(context.get(session.id)).not.toBe(initial);
      expect(context.get(session.id).pending).toBeNull();
    },
  );

  it("reports an unavailable interaction client", async () => {
    const generator = new AdventureInteractionGeneration(
      { getModel },
      new AdventureInteractionContext(),
    );
    await expect(
      generator.generate(
        request,
        buildAdventurePrompt(request),
        "instruction",
        {},
      ),
    ).rejects.toThrow("interaction-client-unavailable");
  });
});
