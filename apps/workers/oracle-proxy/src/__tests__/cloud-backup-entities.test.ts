import { describe, expect, it } from "vitest";
import {
  bundleEntities,
  groupByShard,
  hashEntities,
} from "../cloud-backup-entities";
import {
  cloudBackupShardOf,
  hashCloudBackupEntity,
} from "../../../../../packages/schema/src/publishing";

describe("cloud backup entity preparation", () => {
  it("accepts bundles whose entities all have string ids", () => {
    const entities = [
      { id: "one", title: "First" },
      { id: "two", title: "Second" },
    ];

    expect(bundleEntities({ entities })).toEqual(entities);
  });

  it.each([
    [null],
    [{}],
    [{ entities: "not an array" }],
    [{ entities: [{ id: "valid" }, { title: "missing id" }] }],
    [{ entities: [null] }],
  ])("rejects non-shardable bundle shapes: %j", (bundle) => {
    expect(bundleEntities(bundle)).toBeNull();
  });

  it("groups entities by the schema shard and preserves their records", () => {
    const entities = [
      { id: "first", title: "First" },
      { id: "second", title: "Second" },
    ];

    const groups = groupByShard(entities);

    expect([...groups.keys()]).toEqual([
      ...new Set(entities.map(({ id }) => cloudBackupShardOf(id))),
    ]);
    for (const entity of entities) {
      expect(groups.get(cloudBackupShardOf(entity.id))?.[entity.id]).toEqual(
        entity,
      );
    }
  });

  it("creates the same entity hashes used by the backup schema", async () => {
    const entities = [
      { id: "first", title: "First" },
      { id: "second", title: "Second" },
    ];

    await expect(hashEntities(entities)).resolves.toEqual({
      first: await hashCloudBackupEntity(entities[0]),
      second: await hashCloudBackupEntity(entities[1]),
    });
  });
});
