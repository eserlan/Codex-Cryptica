# Large-vault performance budgets

Issue #2149 starts in report-only mode. The scheduled/manual workflow runs the
production-preview benchmark against the synthetic 1,600-entity fixture and
uploads an aggregate-only JSON artifact plus a GitHub summary. It does not send
vault data or enforce a threshold.

Before enabling blocking budgets, collect at least five successful workflow
runs on the same runner class. Review their raw artifacts, preserve all
outliers/failures, and record the selected variance headroom. Then commit the
reviewed `large-vault.v1.json` manifest, run it report-only for five further
successful executions, and only then change its mode to `blocking`.

## Initial baseline evidence (2026-08-10)

Five successful production-preview runs are retained for comparison:

| Workflow run  | Commit    |
| ------------- | --------- |
| `31337315339` | `c5455e6` |
| `31337319624` | `c5455e6` |
| `31337614085` | `c5455e6` |
| `31342663443` | `c5455e6` |
| `31351997281` | `ca077ab` |

All five used fixture `large-vault.v1` (checksum
`fc7b431e314956fbd4c387d6c0b5be8e3b7272766069585190a077e9ac4e1aa2`), pinned
Chromium `148.0.7778.96`, and the `ubuntu24` runner image.

The run-level medians show the expected optimization priorities: search index
batching ranged from 2,788.4 to 4,956.1 ms; rendered-node selection ranged
from 480.6 to 2,046.3 ms; and Table open ranged from 809.3 to 901.5 ms.

These artifacts are evidence only, not an approved budget baseline. They do
not encode scenario attribution, and they predate the current graph focus
depth instrumentation. In particular, they cannot establish the required
`graph_focus_depth_change` and `table_sort` scenario budgets. Preserve these
artifacts as pre-change comparison data; collect a fresh five-run set from the
commit that introduces scenario-attributed results before committing the
report-only manifest.

Run locally with:

```sh
cd apps/web
bun run build
bun run test:performance
```

Private-vault comparisons must remain local. Only aggregate allowlisted
durations and counts may be copied into issue or PR documentation.
