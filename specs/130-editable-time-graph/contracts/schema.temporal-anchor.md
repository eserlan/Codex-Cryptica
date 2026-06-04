# Contract: `schema` — TemporalAnchor

Package: `packages/schema`. Public exports added to `src/entity.ts` (and re-exported via `src/index.ts`).

## Exports

```ts
export const TemporalAnchorSchema: z.ZodType<TemporalAnchor>;
export type TemporalAnchor = {
  id: string;
  type: string;
  label?: string;
  date?: TemporalMetadata;
  start_date?: TemporalMetadata;
  end_date?: TemporalMetadata;
  linkedEntityId?: string;
  note?: string;
};

// EntitySchema gains:
//   temporalAnchors: z.array(TemporalAnchorSchema).optional()
// Entity type gains: temporalAnchors?: TemporalAnchor[]
```

## Guarantees (test these)

1. **Back-compat**: an existing entity object **without** `temporalAnchors` parses successfully and is unchanged (SC-005).
2. **Validation**: an anchor with no `date`/`start_date`/`end_date` fails parse.
3. **Custom requires label**: `{ type: "custom" }` without `label` fails; with `label` passes.
4. **Range**: `{ start_date: {year: 600}, end_date: {year: 500} }` fails parse (inverted) (FR-031).
5. **Date shape**: anchor dates accept the same `TemporalMetadata` union as `entity.date` (year-precision and `DateSelection`), and reject free-form strings (FR-021, R5).
6. **Round-trip**: `TemporalAnchorSchema.parse(x)` is idempotent for valid `x`.
