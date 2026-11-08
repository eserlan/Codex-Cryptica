import { vi } from "vitest";
import { PerformanceRecorder } from "@codex/performance-observability";
import type {
  EntityMutationContext,
  MutationDependencies,
} from "./entity-mutation-context";
import type { LocalEntity } from "./types";

vi.mock("./events.svelte", () => ({ vaultEventBus: { emit: vi.fn() } }));
vi.mock("../ui/session-mode.svelte", () => ({
  sessionModeStore: { isDemoMode: false },
}));
vi.mock("../debug.svelte", () => ({ debugStore: { warn: vi.fn() } }));
vi.mock("../../services/cache.svelte", () => ({
  cacheService: { remove: vi.fn() },
}));
vi.mock("./registry", () => ({ updateLastInternalChange: vi.fn() }));

export function makeMutationEntity(
  id = "hero",
  patch: Partial<LocalEntity> = {},
): LocalEntity {
  return {
    id,
    title: id,
    type: "character",
    content: "Content",
    lore: "Lore",
    labels: [],
    aliases: [],
    connections: [],
    metadata: {},
    ...patch,
  } as LocalEntity;
}

export function mutationTestContext() {
  const recorder = new PerformanceRecorder();
  const span = {
    complete: vi.fn(),
    cancel: vi.fn(),
    fail: vi.fn(),
    stale: vi.fn(),
  };
  vi.spyOn(recorder, "start").mockReturnValue(span);
  const repository = {
    entities: {
      hero: makeMutationEntity(),
      place: makeMutationEntity("place"),
    },
    enqueueSave: vi.fn(async (_id: string, task: () => Promise<unknown>) =>
      task(),
    ),
  };
  const persistence = {
    scheduleSave: vi.fn().mockResolvedValue(undefined),
    persistImmediately: vi.fn(async (entries: { entity: LocalEntity }[]) =>
      entries.map(({ entity }) => ({ id: entity.id, ok: true })),
    ),
  };
  const loader = {
    markContentLoaded: vi.fn(),
    isContentLoaded: vi.fn().mockReturnValue(true),
    loadEntityContent: vi.fn(),
  };
  const deps = {
    repository,
    persistence,
    loader,
    performanceRecorder: recorder,
    activeVaultId: vi.fn((): string | null => "vault"),
    isGuest: vi.fn(() => false),
    getActiveVaultHandle: vi.fn().mockResolvedValue({}),
    getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
    updateEntityCount: vi.fn(),
    invalidateUrlCache: vi.fn(),
    getServices: vi.fn(() => null),
    onEntityDelete: vi.fn(),
    onBatchUpdate: vi.fn(),
    onEntitiesUpdated: vi.fn(),
    onConnectionAdded: vi.fn(),
    onConnectionRemoved: vi.fn(),
    onConnectionUpdated: vi.fn(),
  };
  const context: EntityMutationContext = {
    deps: deps as unknown as MutationDependencies,
    get entities() {
      return repository.entities;
    },
    set entities(entities) {
      repository.entities = entities;
    },
  };
  return { context, deps, recorder, span, repository, persistence, loader };
}
