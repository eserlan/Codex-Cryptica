import { describe, expect, it, vi } from "vitest";
import type { AdventureSession } from "@codex/adventure-engine";
import { AdventureActions } from "../adventure-actions";
import { AdventurePlaceLinker } from "../adventure-places";
import { completeProposal, createAdventureRuntime } from "./adventure-fixtures";

const records = [
  { id: "r-nombe", title: "Nombe", type: "location" },
  { id: "r-orra", title: "Orra", type: "character" },
];

function withPlaces(session: AdventureSession): AdventureSession {
  return {
    ...session,
    places: [
      { id: "p-home", name: "Home village" },
      { id: "p-nombe", name: "The Nombe" },
    ],
    currentPlaceId: "p-nombe",
  };
}

function linkerFor(listPlaceRecords: ReturnType<typeof vi.fn>) {
  return new AdventurePlaceLinker({ context: { listPlaceRecords } } as never);
}

describe("place linker", () => {
  const base = () => withPlaces(createAdventureRuntime().state.session!);

  it("links a place to the Vault location with the same title", async () => {
    const linked = await linkerFor(vi.fn().mockResolvedValue(records)).link(
      base(),
    );
    expect(linked.places?.find((p) => p.id === "p-nombe")?.sourceRecordId).toBe(
      "r-nombe",
    );
    expect(linked.places?.find((p) => p.id === "p-home")).not.toHaveProperty(
      "sourceRecordId",
    );
  });

  it("does not ask the Vault when there are no places", async () => {
    const list = vi.fn().mockResolvedValue(records);
    const session = createAdventureRuntime().state.session!;
    expect(await linkerFor(list).link({ ...session, places: [] })).toEqual({
      ...session,
      places: [],
    });
    expect(list).not.toHaveBeenCalled();
  });

  it("returns the same session when nothing changes", async () => {
    const session = base();
    expect(await linkerFor(vi.fn().mockResolvedValue([])).link(session)).toBe(
      session,
    );
  });

  it("leaves the session alone when the lookup is unavailable or fails", async () => {
    const session = base();
    expect(
      await linkerFor(vi.fn().mockResolvedValue(undefined)).link(session),
    ).toBe(session);
    expect(
      await linkerFor(
        vi.fn().mockRejectedValue(new Error("vault-not-open")),
      ).link(session),
    ).toBe(session);
  });
});

describe("place links through a real turn", () => {
  function harness(list: ReturnType<typeof vi.fn>) {
    const { state, deps, runtime } = createAdventureRuntime();
    state.session = withPlaces(state.session!);
    deps.context = { ...deps.context, listPlaceRecords: list } as never;
    const requests: AdventureSession[] = [];
    deps.generation = {
      generate: vi.fn(async (request: { session: AdventureSession }) => {
        requests.push(request.session);
        return completeProposal;
      }),
    } as never;
    return {
      state,
      requests,
      runtime: new (runtime.constructor as any)(state, deps),
    };
  }

  it("generates from the linked session and saves the links with the turn", async () => {
    const h = harness(vi.fn().mockResolvedValue(records));
    await new AdventureActions(h.runtime).submitAction("Walk on");
    expect(
      h.requests[0]?.places?.find((p) => p.id === "p-nombe")?.sourceRecordId,
    ).toBe("r-nombe");
    expect(
      h.state.session?.places?.find((p) => p.id === "p-nombe")?.sourceRecordId,
    ).toBe("r-nombe");
  });

  it("never fails a turn when the Vault lookup fails", async () => {
    const h = harness(vi.fn().mockRejectedValue(new Error("vault-not-open")));
    await new AdventureActions(h.runtime).submitAction("Walk on");
    expect(h.state.phase).toBe("ready");
    expect(h.state.errorMessage).toBeNull();
    expect(h.state.session?.turns).toHaveLength(1);
    expect(h.state.session?.places?.some((p) => p.sourceRecordId)).toBe(false);
  });
});
