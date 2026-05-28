# Quickstart

No new public APIs are exposed, but internal logic for data access will now throw or return errors when validation fails.

## Safely Reading Entities

```typescript
// Before:
const entity = await db.get("entities", id);

// After:
const rawEntity = await db.get("entities", id);
const parsed = EntitySchema.safeParse(rawEntity);

if (!parsed.success) {
  // Quarantine record, log warning
  console.warn(`Entity ${id} is corrupted:`, parsed.error);
  await quarantineService.quarantine(id, rawEntity);
  return null;
}

const entity = parsed.data;
```

## Running Migrations

Migrations will now be wrapped:

```typescript
await migrationService.safeUpgrade(currentVersion, TARGET_VERSION, async () => {
  // Standard upgrade logic
});
```
