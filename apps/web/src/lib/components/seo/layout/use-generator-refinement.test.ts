/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const hub = vi.hoisted(() => ({
  addEntity: vi.fn(() => "derived-1"),
  addProvenance: vi.fn(),
  removeEntity: vi.fn(),
}));
const track = vi.hoisted(() => vi.fn());
const loreRequest = vi.hoisted(() => vi.fn());
const service = vi.hoisted(() => ({
  iteration: 2,
  start: vi.fn(() => ({ title: "Mira", lore: "old lore" })),
  cancel: vi.fn(),
  accept: vi.fn(),
}));

vi.mock("$lib/services/GeneratorRefinementService.svelte", () => ({
  GeneratorRefinementService: class {
    iteration = service.iteration;
    start = service.start;
    cancel = service.cancel;
    accept = service.accept;
  },
}));
vi.mock("$lib/stores/session-hub.svelte", () => ({ sessionHubStore: hub }));
vi.mock("$lib/stores/ui/lore-merge.svelte", () => ({
  loreMergeStore: { request: loreRequest },
}));
vi.mock("$lib/utils/lore-sections", () => ({
  buildLoreMergePlan: vi.fn(() => ({ hasChanges: true })),
}));
vi.mock("$lib/services/analytics/zaraz-analytics", () => ({
  trackEvent: track,
}));

import { useGeneratorRefinement } from "./use-generator-refinement.svelte";

const current = {
  type: "character",
  title: "Mira",
  summary: "s",
  content: "Body",
  lore: "old lore",
  labels: [],
  status: "draft",
};

function setup(options: { canRefine?: boolean } = {}) {
  const applyRefinedOutput = vi.fn();
  const onOpenFromHub = vi.fn();
  const refinement = useGeneratorRefinement({
    getGeneratorType: () => "npc",
    getGeneratedData: () => current as never,
    getDocumentLayout: () => ({ content: "Body", lore: "old lore" }) as never,
    getCurrentEntityId: () => "entity-0",
    getContextSelection: () => ({ entities: [], trimmed: false }) as never,
    canRefineCurrentOutput: () => options.canRefine ?? true,
    applyRefinedOutput,
    onOpenFromHub,
  });
  return { refinement, applyRefinedOutput, onOpenFromHub };
}

const proposal = {
  type: "character",
  title: "Mira the Bold",
  summary: "s2",
  content: "New body",
  lore: "old lore",
  labels: [],
  status: "draft",
} as never;

describe("useGeneratorRefinement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens for the current output only after a successful generation", () => {
    const blocked = setup({ canRefine: false });
    blocked.refinement.openForCurrentOutput();
    expect(blocked.refinement.open).toBe(false);

    const allowed = setup();
    allowed.refinement.openForCurrentOutput();
    expect(allowed.refinement.open).toBe(true);
    expect(track).toHaveBeenCalledWith("generator_refinement_opened", {
      generator_type: "npc",
      source: "current_output",
    });
  });

  it("closes the hub detail before refining a hub entity", () => {
    const { refinement, onOpenFromHub } = setup();

    refinement.openForHubEntity({ id: "hub-1", title: "Hub" } as never);

    expect(onOpenFromHub).toHaveBeenCalledOnce();
    expect(refinement.open).toBe(true);
  });

  it("cancels, resets and tracks", () => {
    const { refinement } = setup();
    refinement.openForCurrentOutput();

    refinement.cancel();

    expect(service.cancel).toHaveBeenCalledOnce();
    expect(refinement.open).toBe(false);
    expect(track).toHaveBeenCalledWith("generator_refinement_cancelled", {
      generator_type: "npc",
    });
  });

  it("records the accepted draft as a refinement of the source", async () => {
    const { refinement, applyRefinedOutput } = setup();
    refinement.openForCurrentOutput();

    await refinement.accept(proposal);

    expect(hub.addEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Mira the Bold",
        derivedFromEntityId: "entity-0",
        derivation: "refine",
      }),
    );
    expect(hub.removeEntity).toHaveBeenCalledWith("entity-0");
    expect(applyRefinedOutput).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Mira the Bold" }),
      "derived-1",
    );
    expect(service.accept).toHaveBeenCalledOnce();
    expect(refinement.open).toBe(false);
  });

  it("keeps the modal open when the user backs out of a lore merge", async () => {
    loreRequest.mockResolvedValue(null);
    const { refinement, applyRefinedOutput } = setup();
    refinement.openForCurrentOutput();

    await refinement.accept({
      ...(proposal as object),
      lore: "new lore",
    } as never);

    expect(refinement.open).toBe(true);
    expect(hub.addEntity).not.toHaveBeenCalled();
    expect(applyRefinedOutput).not.toHaveBeenCalled();
  });

  it("uses the merged lore the user resolved", async () => {
    loreRequest.mockResolvedValue("merged lore");
    const { refinement } = setup();
    refinement.openForCurrentOutput();

    await refinement.accept({
      ...(proposal as object),
      lore: "new lore",
    } as never);

    expect(hub.addEntity).toHaveBeenCalledWith(
      expect.objectContaining({ lore: "merged lore" }),
    );
  });
});
