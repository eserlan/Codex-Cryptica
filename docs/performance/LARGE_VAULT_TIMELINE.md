# Date-Heavy Timeline Fixture

The performance fixture in `apps/web/tests/performance/fixtures/large-vault.ts` is also the deterministic date-heavy Timeline fixture for issue #2147.

It contains 1,600 entities and 9,000 directed connections. Of the entities with dates:

- most have exact dates distributed across 240 years;
- every fifth dated entity is concentrated on June 18 to exercise same-day rendering;
- every 37th entity has a year-only approximate date;
- every 113th entity is undated.

The fixture remains synthetic and privacy-safe. Its version and checksum are written with aggregate performance samples; titles, lore, and entity content are not recorded.

Run the production-preview benchmark with:

```bash
bun run --filter web test:performance
```

The benchmark visits Agenda, Vertical Timeline, and Horizontal Timeline, records the logical result count and mounted DOM count for each view, scrolls each view, and verifies that large collections do not mount all matching entries at once.
