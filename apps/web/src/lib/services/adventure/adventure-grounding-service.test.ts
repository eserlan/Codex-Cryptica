import { describe, expect, it, vi } from "vitest";
import { AdventureGroundingService } from "./adventure-grounding-service";
import {
  completeProposal,
  startInput,
} from "#lib/stores/oracle/tests/adventure-fixtures.js";
import { initialSession } from "#lib/stores/oracle/adventure-session.js";

const session = () =>
  initialSession({
    ...startInput,
    now: "2026-11-03T12:00:00Z",
    idGenerator: () => "session",
  });
function context() {
  return {
    resolveAnchors: vi.fn(async () => [
      {
        recordId: "anchor",
        displayName: "Town",
        content: "Town canon",
        role: "anchor" as const,
      },
    ]),
    resolveOpeningRelevant: vi.fn(async () => []),
    resolveActionRelevant: vi.fn(async () => []),
    verifyRequiredSources: vi.fn(async () => {}),
  };
}

describe("AdventureGroundingService", () => {
  it("overwrites caller excerpts, freshly resolves every request and accepts empty matches", async () => {
    const sources = context();
    const transport = { generate: vi.fn(async () => completeProposal) };
    const grounded = new AdventureGroundingService(sources).wrap(transport);
    const request = {
      session: session(),
      phase: "opening" as const,
      anchors: [],
      relevant: [],
    };
    await grounded.generate(request);
    await grounded.generate(request);
    expect(sources.resolveAnchors).toHaveBeenCalledTimes(2);
    expect(sources.verifyRequiredSources).toHaveBeenCalledTimes(2);
    expect(transport.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        anchors: [expect.objectContaining({ recordId: "anchor" })],
        relevant: [],
      }),
    );
  });

  it("uses persisted roll action and preserves the supplied outcome", async () => {
    const sources = context();
    const current = session();
    current.pendingRoll = {
      playerAction: "Ask the keeper",
      suppliedOutcome: { kind: "numeric", value: 16 },
    } as any;
    const transport = { generate: vi.fn(async () => completeProposal) };
    await new AdventureGroundingService(sources).wrap(transport).generate({
      session: current,
      phase: "roll-resolution",
      anchors: [],
      relevant: [],
      rollResolution: current.pendingRoll!.suppliedOutcome,
    });
    expect(sources.resolveActionRelevant).toHaveBeenCalledWith(
      current,
      "Ask the keeper",
    );
    expect(transport.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        rollResolution: { kind: "numeric", value: 16 },
      }),
    );
  });

  it("blocks dispatch on retrieval failure without exposing the raw error", async () => {
    const sources = context();
    sources.resolveOpeningRelevant.mockRejectedValue(
      new Error("secret world text"),
    );
    const transport = { generate: vi.fn(async () => completeProposal) };
    await expect(
      new AdventureGroundingService(sources).wrap(transport).generate({
        session: session(),
        phase: "opening",
        anchors: [],
        relevant: [],
      }),
    ).rejects.toThrow(
      "Unable to load world context. Please retry, or restore a missing source or edit your selection.",
    );
    expect(transport.generate).not.toHaveBeenCalled();
  });

  it("blocks a cancelled lookup and does not verify or dispatch its late result", async () => {
    const sources = context();
    const controller = new AbortController();
    sources.resolveOpeningRelevant.mockImplementation(async () => {
      controller.abort();
      return [];
    });
    const transport = { generate: vi.fn(async () => completeProposal) };
    await expect(
      new AdventureGroundingService(sources)
        .wrap(transport)
        .generate(
          { session: session(), phase: "opening", anchors: [], relevant: [] },
          { signal: controller.signal },
        ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(transport.generate).not.toHaveBeenCalled();
  });

  it("rejects stale session/control before dispatch", async () => {
    const sources = context();
    const verify = vi.fn(async () => {
      throw new Error("control-lost");
    });
    const transport = { generate: vi.fn(async () => completeProposal) };
    await expect(
      new AdventureGroundingService(sources, verify).wrap(transport).generate({
        session: session(),
        phase: "opening",
        anchors: [],
        relevant: [],
      }),
    ).rejects.toThrow("control-lost");
    expect(transport.generate).not.toHaveBeenCalled();
  });

  it("prepares background with bounded current-session knowledge", async () => {
    const current = session();
    const result = await new AdventureGroundingService(context()).prepare({
      session: current,
      purpose: "background",
    });
    expect(result).toMatchObject({
      vaultId: current.vaultId,
      sessionId: current.id,
      purpose: "background",
      anchors: [expect.objectContaining({ recordId: "anchor" })],
    });
    expect(result.sessionKnowledge).toContain("provisionalFacts");
  });
});

it("does not silently trim essential required source text", async () => {
  const sources = context();
  sources.resolveAnchors.mockResolvedValue([
    {
      recordId: "a",
      displayName: "Anchor",
      content: "x".repeat(25_000),
      role: "anchor",
    },
  ]);
  const transport = { generate: vi.fn(async () => completeProposal) };
  await expect(
    new AdventureGroundingService(sources).wrap(transport).generate({
      session: session(),
      phase: "opening",
      anchors: [],
      relevant: [],
    }),
  ).rejects.toThrow("Unable to load world context");
  expect(transport.generate).not.toHaveBeenCalled();
});

it("keeps the persisted uncertainty, stakes and action available after clearing provider history", async () => {
  const current = session();
  current.pendingRoll = {
    inputId: "roll-input",
    playerAction: "Cross the bridge",
    uncertainty: "Will the bridge hold?",
    stakes: "A fall into the river",
    suppliedOutcome: { kind: "numeric", value: 16 },
  } as any;
  const prepared = await new AdventureGroundingService(context()).prepare({
    session: current,
    purpose: "roll-resolution",
  });
  expect(JSON.parse(prepared.sessionKnowledge).pendingRoll).toMatchObject({
    playerAction: "Cross the bridge",
    stakes: "A fall into the river",
    suppliedOutcome: { value: 16 },
  });
});

it("rejects a session that becomes stale during lookup", async () => {
  const sources = context();
  let current = true;
  sources.resolveOpeningRelevant.mockImplementation(async () => {
    current = false;
    return [];
  });
  const verify = vi.fn(async () => {
    if (!current) throw new Error("stale-adventure-context");
  });
  const transport = { generate: vi.fn(async () => completeProposal) };
  await expect(
    new AdventureGroundingService(sources, verify).wrap(transport).generate({
      session: session(),
      phase: "opening",
      anchors: [],
      relevant: [],
    }),
  ).rejects.toThrow("stale-adventure-context");
  expect(verify).toHaveBeenCalledTimes(2);
  expect(transport.generate).not.toHaveBeenCalled();
});

it("returns a safe typed unavailable outcome when a required source disappears", async () => {
  const sources = context();
  sources.verifyRequiredSources.mockRejectedValue(
    new Error("required-source-unavailable"),
  );
  const transport = { generate: vi.fn(async () => completeProposal) };
  await expect(
    new AdventureGroundingService(sources).wrap(transport).generate({
      session: session(),
      phase: "opening",
      anchors: [],
      relevant: [],
    }),
  ).rejects.toMatchObject({
    name: "AdventureGroundingError",
    code: "unavailable",
  });
  expect(transport.generate).not.toHaveBeenCalled();
});
