# Synthetic GM Director Live Comparison

Generated: 2026-11-24T01:53:29.340Z
Proxy: http://127.0.0.1:8787
Origin: http://localhost:5173
Fixture actions per sample: 8
Samples per condition: 1

This report contains aggregate scores and bounded generation metadata only. It does not include prompts, narration, provider interaction IDs, API keys, or user data. One sample per condition is descriptive and does not establish a causal effect.

| Effort | Director | Context  | Sample | Result | A/S/C/CS/CC/UE | Progression / integrity signals                                                                   |    Completed / attempted; latency | Input / output tokens | Estimated price |
| ------ | -------- | -------- | -----: | ------ | -------------- | ------------------------------------------------------------------------------------------------- | --------------------------------: | --------------------- | --------------: |
| low    | off      | retained |      1 | pass   | 1/1/1/1/1/1    | 8 answers; 8 routes; 1 negative findings; 0 causal conflicts; 0 knowledge leaks; 1 quiet outcomes | 8/8 completed/attempted; 51997 ms | 78462 / 5367 tokens   |       $0.010530 |
| low    | on       | retained |      1 | pass   | 1/1/1/1/1/1    | 8 answers; 8 routes; 1 negative findings; 0 causal conflicts; 0 knowledge leaks; 1 quiet outcomes | 8/8 completed/attempted; 53947 ms | 90695 / 5090 tokens   |       $0.011614 |

## Per-turn transport and progression metadata

See the adjacent JSON file for each turn's registry model key, requested and reported effort, transport, thread mode, reset classification, commit result, progress category, rubric scores, and bounded canon/consequence failure reasons. Missing provider usage or pricing is reported as `unavailable`.

Before changing a global model or reasoning default, collect at least three paired replays per condition across two synthetic fixtures, show consistent predeclared progression improvement, preserve all secrecy/canon/agency stop-ship gates, and document latency and cost trade-offs.
