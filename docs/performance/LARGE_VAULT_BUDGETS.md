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

Run locally with:

```sh
cd apps/web
bun run build
bun run test:performance
```

Private-vault comparisons must remain local. Only aggregate allowlisted
durations and counts may be copied into issue or PR documentation.
