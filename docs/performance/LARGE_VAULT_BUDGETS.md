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

## Validated scenario-attributed baseline (2026-08-10)

The five runs below are the reviewed baseline set for the corrected harness at
commit `362be069a0edaeb6ef98f729dc8d23b8697a56f3`. Each ran the production
preview against `large-vault.v1`, with the same fixed viewport and single
Chromium worker. Every artifact contains all seven required scenario sections
and at least one completed sample in each section.

| Workflow run                                                                        | Result |
| ----------------------------------------------------------------------------------- | ------ |
| [`31361013632`](https://github.com/eserlan/Codex-Cryptica/actions/runs/31361013632) | passed |
| [`31361329151`](https://github.com/eserlan/Codex-Cryptica/actions/runs/31361329151) | passed |
| [`31361512051`](https://github.com/eserlan/Codex-Cryptica/actions/runs/31361512051) | passed |
| [`31361698800`](https://github.com/eserlan/Codex-Cryptica/actions/runs/31361698800) | passed |
| [`31361902467`](https://github.com/eserlan/Codex-Cryptica/actions/runs/31361902467) | passed |

The values below are the median of each run's statistic, with the full range
across the five workflow runs. They are aggregate-only synthetic-fixture data.

| Scenario                | Signal                            | Five-run median |          Range | Provisional report-only ceiling |
| ----------------------- | --------------------------------- | --------------: | -------------: | ------------------------------: |
| Cold open/index         | `vault_open_cold` median          |          143 ms |     132–225 ms |                          300 ms |
| Cold open/index         | `search_index_persist` median     |           31 ms |       24–32 ms |                           50 ms |
| Warm open               | `vault_open_warm` median          |           61 ms |      57–100 ms |                          140 ms |
| Rendered-node selection | `graph_select` median             |          330 ms |     328–335 ms |                          400 ms |
| Focus-depth change      | `graph_focus_depth_change` median |        1,170 ms | 1,154–1,230 ms |                        1,500 ms |
| Explorer workflow       | `explorer_open` p90               |           40 ms |       35–88 ms |                          125 ms |
| Explorer workflow       | `explorer_filter` p90             |           39 ms |       36–41 ms |                           50 ms |
| Table workflow          | `table_open` median               |          824 ms |     756–863 ms |                        1,100 ms |
| Table workflow          | `table_sort` median               |          633 ms |     543–962 ms |                        1,200 ms |
| Table workflow          | `table_filter` p90                |          757 ms |   714–1,111 ms |                        1,400 ms |
| Single-entity save      | `entity_save` median              |          443 ms |     436–449 ms |                          550 ms |

### Analysis

- The corrected harness is stable for selection (a 7 ms total range), focus
  depth (77 ms), persistence (13 ms), and warm open (43 ms). These are suitable
  for report-only comparison.
- The cold-open range is wider because it includes the full first-load lifecycle;
  a 300 ms ceiling preserves 33% headroom above the slowest observed run.
- Table sorting and filtering show runner-sensitive variance. Their ceilings use
  roughly 25% headroom above the slowest observed statistic, so they report
  meaningful regressions without treating current variation as a failure.
- `search_index_batch` is not emitted by this lifecycle and is therefore not a
  candidate for the v1 manifest. Cold-open duration and index persistence remain
  the observable signals for this suite.
- The reviewed manifest lives at
  `apps/web/tests/performance/budgets/large-vault.v1.json`. Its evaluator
  rejects malformed, unknown, and missing scenario evidence, while report-only
  regressions stay visible in the GitHub summary without failing the workflow.
- These are **not blocking limits** yet. Validate the manifest in report-only
  mode for five additional successful workflow runs, then consider switching it
  to `blocking`.

Run locally with:

```sh
cd apps/web
bun run build
bun run test:performance
bun tests/performance/large-vault-budget.ts \
  test-results/large-vault-results.v1.json \
  tests/performance/budgets/large-vault.v1.json
```

Private-vault comparisons must remain local. Only aggregate allowlisted
durations and counts may be copied into issue or PR documentation.
