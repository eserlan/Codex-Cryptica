/**
 * Test-only CIF manifest builders. Return plain unknown-shaped objects (not
 * typed against CifManifest) so parse/validate are exercised the same way
 * they'd see arbitrary untrusted input.
 */

export interface FixtureEntity {
  key: string;
  kind?: string;
  title?: string;
  summary?: string;
  content?: { format: "markdown"; body: string };
  labels?: string[];
  aliases?: string[];
  parent?: string;
  dates?: {
    start?: { value: string; precision: "year" | "month" | "day" };
    end?: { value: string; precision: "year" | "month" | "day" };
  };
  media?: Array<{ assetKey: string; role?: string }>;
  source?: { id?: string; url?: string };
  extensions?: Record<string, unknown>;
}

export interface FixtureRelationship {
  key?: string;
  from: string;
  to: string;
  kind?: string;
  label?: string;
  directed?: boolean;
}

export interface FixtureManifestOptions {
  format?: string;
  version?: string;
  system?: string;
  worldKey?: string;
  worldTitle?: string;
  entities?: FixtureEntity[];
  relationships?: FixtureRelationship[];
  assets?: Array<Record<string, unknown>>;
  extensions?: Record<string, unknown>;
}

function entity(
  key: string,
  overrides: Partial<FixtureEntity> = {},
): FixtureEntity {
  return {
    key,
    kind: "character",
    title: key,
    content: { format: "markdown", body: `Body for ${key}` },
    ...overrides,
  };
}

function manifest(options: FixtureManifestOptions = {}): unknown {
  const entities = (
    options.entities ?? [entity("characters/a"), entity("characters/b")]
  ).map((e) => ({
    key: e.key,
    kind: e.kind ?? "character",
    title: e.title ?? e.key,
    ...(e.summary !== undefined ? { summary: e.summary } : {}),
    content: e.content ?? { format: "markdown", body: `Body for ${e.key}` },
    ...(e.labels !== undefined ? { labels: e.labels } : {}),
    ...(e.aliases !== undefined ? { aliases: e.aliases } : {}),
    ...(e.parent !== undefined ? { parent: e.parent } : {}),
    ...(e.dates !== undefined ? { dates: e.dates } : {}),
    ...(e.media !== undefined ? { media: e.media } : {}),
    ...(e.source !== undefined ? { source: e.source } : {}),
    ...(e.extensions !== undefined ? { extensions: e.extensions } : {}),
  }));

  const relationships = (options.relationships ?? []).map((r) => ({
    ...(r.key !== undefined ? { key: r.key } : {}),
    from: r.from,
    to: r.to,
    kind: r.kind ?? "related_to",
    ...(r.label !== undefined ? { label: r.label } : {}),
    ...(r.directed !== undefined ? { directed: r.directed } : {}),
  }));

  return {
    format: options.format ?? "codex-world-interchange",
    version: options.version ?? "1.0",
    source: {
      system: options.system ?? "fixture-tool",
      ...(options.worldKey !== undefined ? { worldKey: options.worldKey } : {}),
    },
    world: { title: options.worldTitle ?? "Fixture World" },
    entities,
    relationships,
    assets: options.assets ?? [],
    ...(options.extensions !== undefined
      ? { extensions: options.extensions }
      : {}),
  };
}

export function validMinimalManifest(
  overrides: FixtureManifestOptions = {},
): unknown {
  return manifest(overrides);
}

export function manifestWithDuplicateEntityKey(): unknown {
  return manifest({
    entities: [
      entity("characters/a"),
      entity("characters/a", { title: "Duplicate" }),
    ],
  });
}

export function manifestWithDuplicateRelationshipKey(): unknown {
  return manifest({
    entities: [entity("characters/a"), entity("characters/b")],
    relationships: [
      { key: "rel-1", from: "characters/a", to: "characters/b", kind: "knows" },
      { key: "rel-1", from: "characters/b", to: "characters/a", kind: "knows" },
    ],
  });
}

export function manifestWithUnresolvedParent(): unknown {
  return manifest({
    entities: [entity("characters/a", { parent: "does/not/exist" })],
  });
}

export function manifestWithUnresolvedEndpoint(): unknown {
  return manifest({
    entities: [entity("characters/a")],
    relationships: [
      { from: "characters/a", to: "does/not/exist", kind: "knows" },
    ],
  });
}

export function manifestWithUnresolvedAssetRef(): unknown {
  return manifest({
    entities: [
      entity("characters/a", { media: [{ assetKey: "missing-asset" }] }),
    ],
  });
}

export function manifestWithSelfLink(): unknown {
  return manifest({
    entities: [entity("characters/a")],
    relationships: [
      { from: "characters/a", to: "characters/a", kind: "knows" },
    ],
  });
}

export function manifestWithHierarchyCycle(): unknown {
  return manifest({
    entities: [
      entity("places/a", { parent: "places/b" }),
      entity("places/b", { parent: "places/a" }),
    ],
  });
}

/** A parent chain deep enough to prove cycle detection doesn't recurse (stack-safe). */
export function manifestWithDeepParentChain(depth = 10000): unknown {
  const entities: FixtureEntity[] = [];
  for (let i = 0; i < depth; i++) {
    entities.push(
      entity(`chain/${i}`, { parent: i > 0 ? `chain/${i - 1}` : undefined }),
    );
  }
  return manifest({ entities });
}

export function manifestWithUnsupportedVersion(version = "99.0"): unknown {
  return manifest({ version });
}

export function nonCifJson(): unknown {
  return { hello: "world" };
}

export function manifestWithUndirectedRelationship(): unknown {
  return manifest({
    entities: [entity("characters/a"), entity("characters/b")],
    relationships: [
      {
        from: "characters/a",
        to: "characters/b",
        kind: "spouse_of",
        directed: false,
      },
    ],
  });
}

export function manifestWithDuplicateRelationshipRecords(): unknown {
  return manifest({
    entities: [entity("characters/a"), entity("characters/b")],
    relationships: [
      {
        from: "characters/a",
        to: "characters/b",
        kind: "knows",
        label: "old friend",
      },
      {
        from: "characters/a",
        to: "characters/b",
        kind: "knows",
        label: "old friend",
      },
    ],
  });
}

export function manifestWithoutWorldKey(): unknown {
  return manifest({ worldKey: undefined, entities: [entity("characters/a")] });
}

export function manifestWithDatesAtEachPrecision(): unknown {
  return manifest({
    entities: [
      entity("characters/year", {
        dates: { start: { value: "1142", precision: "year" } },
      }),
      entity("characters/month", {
        dates: { start: { value: "1142-07", precision: "month" } },
      }),
      entity("characters/day", {
        dates: { start: { value: "1142-07-18", precision: "day" } },
      }),
    ],
  });
}

export function manifestWithUnknownKindAndExtension(): unknown {
  return manifest({
    entities: [
      entity("characters/a", {
        kind: "deity",
        extensions: { "some-tool": { customField: "value" } },
      }),
    ],
  });
}

export function manifestWithNonEmptyAssets(): unknown {
  return manifest({
    entities: [entity("characters/a")],
    assets: [
      {
        key: "art/a.png",
        mediaType: "image/png",
        url: "https://example.invalid/a.png",
      },
    ],
  });
}

export function oversizedManifestText(targetBytes: number): string {
  const base = manifest({
    entities: [
      entity("characters/a", {
        content: { format: "markdown", body: "x".repeat(targetBytes) },
      }),
    ],
  });
  return JSON.stringify(base);
}

/** ~1,000-entity manifest with a partner + one child per entity, for SC-006. */
export function largeManifest(entityCount = 1000): unknown {
  const entities: FixtureEntity[] = [];
  for (let i = 0; i < entityCount; i++) {
    entities.push(
      entity(`generated/${i}`, {
        parent: i > 0 ? `generated/${Math.floor((i - 1) / 2)}` : undefined,
        labels: ["generated"],
      }),
    );
  }
  const relationships: FixtureRelationship[] = [];
  for (let i = 1; i < entityCount; i++) {
    relationships.push({
      from: `generated/${i}`,
      to: `generated/${Math.floor((i - 1) / 2)}`,
      kind: "reports_to",
    });
  }
  return manifest({ entities, relationships });
}
