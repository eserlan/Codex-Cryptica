import { vi } from "vitest";
import { FakeDir, asHandle } from "./fake-dir";
import {
  EntityTemplateStore,
  type EntityTemplateStoreDeps,
} from "./entity-template-store.svelte";
import type { EntityTemplateRepository } from "./entity-template-repository";

/** Repository fake that records calls and keeps state in memory. */
export function makeRepository(
  overrides: Partial<EntityTemplateRepository> = {},
) {
  return {
    loadAll: vi.fn().mockResolvedValue({
      templates: [],
      defaults: { version: 1, defaults: {} },
      legacy: [],
      warnings: [],
    }),
    saveTemplate: vi.fn().mockResolvedValue(undefined),
    deleteTemplate: vi.fn().mockResolvedValue(undefined),
    saveDefaults: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as EntityTemplateRepository & {
    loadAll: ReturnType<typeof vi.fn>;
    saveTemplate: ReturnType<typeof vi.fn>;
    deleteTemplate: ReturnType<typeof vi.fn>;
    saveDefaults: ReturnType<typeof vi.fn>;
  };
}

export function makeStore(
  opts: {
    repository?: ReturnType<typeof makeRepository>;
    readOnly?: boolean;
    theme?: string;
    ids?: string[];
  } = {},
) {
  const repository = opts.repository ?? makeRepository();
  const notify = vi.fn();
  const ids = [...(opts.ids ?? [])];
  let n = 0;
  const deps: EntityTemplateStoreDeps = {
    repository,
    getTheme: () => opts.theme ?? "workspace",
    isReadOnly: () => opts.readOnly ?? false,
    idGenerator: { uuid: () => ids.shift() ?? `id-${++n}` },
    notify,
  };
  const store = new EntityTemplateStore(deps);
  const vault = asHandle(new FakeDir("vault-1"));
  return { store, repository, notify, vault };
}

export const draft = (over: Record<string, unknown> = {}) => ({
  name: "Mine",
  entityType: "character",
  markdown: "## Summary\n\nWho they are.\n",
  ...over,
});
