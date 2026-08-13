import { describe, expect, it } from "vitest";
import {
  createLargeVaultEntities,
  getLargeVaultFixtureChecksum,
  LARGE_VAULT_ENTITY_COUNT,
} from "./large-vault";

describe("date-heavy large-vault fixture", () => {
  it("contains a reproducible dated workload with concentrated same-day entries", () => {
    const entities = Object.values(createLargeVaultEntities());
    const dated = entities.filter((entity) => entity.date);
    const exact = dated.filter(
      (entity) =>
        entity.date?.month !== undefined && entity.date.day !== undefined,
    );
    const sameDay = exact.filter(
      (entity) => entity.date?.month === 6 && entity.date.day === 18,
    );

    expect(entities).toHaveLength(LARGE_VAULT_ENTITY_COUNT);
    expect(dated.length).toBeGreaterThan(1_500);
    expect(exact.length).toBeGreaterThan(1_400);
    expect(sameDay.length).toBeGreaterThan(200);
    expect(dated.some((entity) => entity.date?.month === undefined)).toBe(true);
    expect(entities.some((entity) => entity.date === undefined)).toBe(true);
  });

  it("keeps the benchmark checksum stable", () => {
    expect(getLargeVaultFixtureChecksum()).toBe(getLargeVaultFixtureChecksum());
  });
});
