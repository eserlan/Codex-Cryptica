import { AdventureRuntime } from "../adventure-runtime";
import { AdventureState } from "../adventure-state.svelte";
import {
  resolveAdventureDependencies,
  type AdventureManagerDependencies,
} from "../adventure-dependencies";
import { initialSession } from "../adventure-session";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AdventureJsonV1Schema,
  type AdventureJsonV1,
} from "@codex/adventure-engine";
import { AdventurePackageContextCache } from "#lib/services/adventure/adventure-package-context.js";

export const referencePackage: AdventureJsonV1 = AdventureJsonV1Schema.parse(
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "../../fixtures/adventures/reference-one-shot/adventure.v1.json",
      ),
      "utf8",
    ),
  ),
);

export const minimalPackage: AdventureJsonV1 = AdventureJsonV1Schema.parse(
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "static/schemas/adventure-json/examples/minimal.v1.json",
      ),
      "utf8",
    ),
  ),
);

export const packageRef = {
  packageId: "the-last-grind",
  version: "1.0.0",
  formatVersion: "adventure-json/v1",
  hash: "b".repeat(64),
};

/** A package cache whose loader returns the reference one-shot. */
export function referencePackageCache(
  loader: any = async () => ({
    hash: packageRef.hash,
    path: "",
    package: referencePackage,
    originFormat: "adventure-json/v1",
  }),
  listApproved: any = async () => [],
) {
  return new AdventurePackageContextCache(loader, listApproved);
}

/** The pin a session carries for `pkg`, with the fixture hash the loaders serve. */
export function packageRefFor(pkg: AdventureJsonV1) {
  return {
    ...packageRef,
    packageId: pkg.id,
    version: pkg.version,
  };
}

/** A package cache whose loader returns `pkg` for the pin from `packageRefFor`. */
export function packageCacheFor(pkg: AdventureJsonV1) {
  return referencePackageCache(async () => ({
    hash: packageRef.hash,
    path: "",
    package: pkg,
    originFormat: "adventure-json/v1",
  }));
}

export const now = "2026-08-16T12:00:00.000Z";
export const completeProposal = {
  kind: "complete" as const,
  narration: "A lantern flickers at the road's end.",
  visiblePatch: {
    situation: {
      text: "A lantern flickers",
      source: "provisional" as const,
    },
    objectives: { add: [], update: [], removeIds: [] },
    activeCharacters: { add: [], update: [], removeIds: [] },
    knownFacts: { add: [], update: [], removeIds: [] },
    relationships: { add: [], update: [], removeIds: [] },
  },
  hiddenPatch: {
    secrets: { add: [], update: [], removeIds: [] },
    gmThreads: { add: [], update: [], removeIds: [] },
  },
  revealSecretIds: [],
  provisionalFacts: [],
  sourceRecordIds: [],
};

export const rollProposal = {
  kind: "roll-required" as const,
  setupNarration: "The bridge groans beneath Mara's feet.",
  uncertainty: "Can Mara cross before the span breaks?",
  stakes: "A fall would carry Mara into the flooded ravine.",
  dice: {
    expression: "1d20",
    outcomeBands: [
      { id: "result", label: "The result determines the crossing." },
    ],
  },
  sourceRecordIds: [],
};

export function dependencies() {
  let current: any = null;
  return {
    repository: {
      async list() {
        return { effectiveActiveId: null, entries: [] };
      },
      async save(_revision: number | null, session: any) {
        current = session;
        return { ok: true, session };
      },
      async savePinned(session: any) {
        current = session;
        return { ok: true, session };
      },
      async load() {
        return { condition: "normal", session: current };
      },
      async archive() {
        current = { ...current, status: "archived" };
        return { ok: true, session: current };
      },
    },
    generation: {
      async generate() {
        return completeProposal;
      },
    },
    summary: {
      async summarize(request: { throughSequence: number }) {
        return { text: "Notes.", throughSequence: request.throughSequence };
      },
    },
    clearGenerationInteraction: async () => {},
    confirmGenerationInteraction: async () => {},
    context: {
      async listPlaceRecords() {
        return undefined;
      },
      async resolveAnchors() {
        return [];
      },
      async resolveActionRelevant() {
        return [];
      },
      async resolveOpeningRelevant() {
        return [];
      },
    },
    authority: {
      async acquire(key: any) {
        return {
          ok: true,
          lease: {
            ...key,
            ownerId: "owner",
            fencingToken: 1,
            expiresAt: Date.now() + 10_000,
          },
        };
      },
      async verify() {
        return true;
      },
      async renew(lease: any) {
        return { ok: true, lease };
      },
      async release() {},
    },
    coordinator: {
      start() {},
      async stop() {},
      subscribe() {
        return () => {};
      },
    },
    now: () => now,
  };
}
export const startInput = {
  vaultId: "vault-1",
  title: "Road",
  premise: "Find the road",
  playerCharacter: {
    kind: "provisional" as const,
    name: "Mara",
    description: "Guide",
  },
};

/** A committed-state harness for testing each injected workflow directly. */
export function createAdventureRuntime(
  overrides: Partial<AdventureManagerDependencies> = {},
  packageProgress?: { sceneId: string },
) {
  let id = 0;
  const deps = resolveAdventureDependencies({
    ...dependencies(),
    clearGenerationInteraction: async () => {},
    idGenerator: () => `id-${++id}`,
    ...overrides,
  } as unknown as AdventureManagerDependencies);
  const state = new AdventureState();
  state.session = initialSession({
    ...startInput,
    ...(packageProgress ? { sourcePackage: packageRef } : {}),
    now,
    idGenerator: deps.idGenerator,
  });
  if (packageProgress) state.session.packageProgress = packageProgress;
  state.phase = "ready";
  state.lease = {
    vaultId: startInput.vaultId,
    sessionId: state.session.id,
    ownerId: "owner",
    fencingToken: 1,
    expiresAt: Date.now() + 10_000,
  };
  return { state, deps, runtime: new AdventureRuntime(state, deps) };
}
