# Internal UI Contract: Timeline Window

This is an internal application contract, not a public API.

```ts
type TimelineWindow = {
  startIndex: number;
  endIndex: number;
  overscan: number;
  anchor: string | null;
  viewMode: "agenda" | "vertical" | "horizontal";
  generation: number;
};

type WindowedEntries<T> = {
  items: readonly T[];
  totalCount: number;
  startIndex: number;
  endIndex: number;
  generation: number;
};
```

## Contract rules

- The projection accepts an already filtered, chronologically ordered sequence and never reimplements date semantics.
- It clamps invalid bounds and returns an empty projection for an empty sequence.
- It returns the full logical count for accessibility/status messaging while exposing only the bounded mounted slice.
- It preserves stable identity across adjacent windows.
- A stale generation cannot be applied after a newer range change.
- Selection and keyboard commands operate against the full logical sequence; rendering only affects mounted DOM.
- The contract must support a negative test for invalid bounds and a stale/cancelled range update.
