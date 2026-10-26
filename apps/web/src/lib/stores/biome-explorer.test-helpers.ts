import { vi } from "vitest";
import type { BiomeProfile } from "biome-engine";
import type {
  BiomeEntitySummary,
  BiomeVaultGateway,
  LoadedBiome,
} from "#lib/services/biome/biome-vault-gateway.js";
import { BiomeExplorerStore } from "./biome-explorer.svelte";

export function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: vi.fn((k: string) => void data.delete(k)),
  };
}

export interface FakeVault extends BiomeVaultGateway {
  records: Map<
    string,
    { title: string; profile: BiomeProfile; content: string }
  >;
  images: Map<string, string>;
  failWrites: boolean;
}

export function fakeVault(): FakeVault {
  const records: FakeVault["records"] = new Map();
  const images = new Map<string, string>();
  let next = 1;
  const vault: FakeVault = {
    records,
    images,
    failWrites: false,
    async list(): Promise<BiomeEntitySummary[]> {
      return [...records.entries()].map(([id, r]) => ({
        id,
        title: r.title,
        referenceName: r.profile.reference?.name ?? null,
        updatedAt: null,
      }));
    },
    async load(id): Promise<LoadedBiome | null> {
      const r = records.get(id);
      return r ? { title: r.title, profile: structuredClone(r.profile) } : null;
    },
    async create(title, profile, content) {
      if (vault.failWrites) throw new Error("disk full");
      const id = `e${next++}`;
      records.set(id, { title, profile: structuredClone(profile), content });
      return id;
    },
    async update(id, title, profile, content) {
      if (vault.failWrites) throw new Error("disk full");
      if (!records.has(id)) throw new Error("missing");
      records.set(id, { title, profile: structuredClone(profile), content });
    },
    async remove(id) {
      if (vault.failWrites) throw new Error("disk full");
      records.delete(id);
      images.delete(id);
    },
    async attachImage(id, file) {
      if (vault.failWrites) throw new Error("disk full");
      images.set(id, file.name);
    },
    async removeImage(id) {
      if (vault.failWrites) throw new Error("disk full");
      images.delete(id);
    },
    async imageUrl(id) {
      const name = images.get(id);
      return name ? `blob:${name}` : "";
    },
  };
  return vault;
}

export function makeStore(
  overrides: Partial<ConstructorParameters<typeof BiomeExplorerStore>[0]> = {},
) {
  const vault = fakeVault();
  const storage = memoryStorage();
  const copied: string[] = [];
  let clipboardWorks = true;
  let writable = true;
  let tick = 1000;
  let idCounter = 0;
  const store = new BiomeExplorerStore({
    vault,
    storage,
    copyText: async (text) => {
      if (!clipboardWorks) return false;
      copied.push(text);
      return true;
    },
    isAiAllowed: () => true,
    isVaultWritable: () => writable,
    now: () => tick++,
    newId: () => `id${++idCounter}`,
    ...overrides,
  });
  return {
    store,
    vault,
    storage,
    copied,
    breakClipboard: () => (clipboardWorks = false),
    setWritable: (value: boolean) => (writable = value),
  };
}
