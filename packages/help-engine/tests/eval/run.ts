/**
 * Evaluation report for the contextual help assistant (#3427).
 *
 *   bun run eval                      retrieval quality over the real help articles (offline)
 *   bun run eval -- --live [--url U]  also ask a running Worker, record latency and citations
 *
 * The offline part needs no network and no key: it is the part CI enforces.
 * `--live` needs the Worker running (`bunx wrangler dev`) with a provider key,
 * and is how latency, correctness and cost are measured for the findings.
 */
import { IN_SCOPE, SCREENS } from "./questions";
import {
  buildRealBundle,
  evaluateInScope,
  evaluateOutOfScope,
  inSplit,
  ofKind,
} from "./evaluate";
import { OUT_OF_SCOPE } from "./questions";

const bundle = buildRealBundle();
const inScope = evaluateInScope(bundle);
const outOfScope = evaluateOutOfScope(bundle);

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
console.log(
  `\nKnowledge: ${bundle.chunks.length} chunks, ${bundle.helpIds.length} articles, ${bundle.features.length} features`,
);
console.log(
  "\nIn-scope questions (recall@3 = a correct source is in the top three)",
);
for (const r of inScope.results) {
  console.log(
    `  ${r.hit ? "✓" : "✗"} ${r.split === "holdout" ? "H" : "t"} rel ${r.topRelevance.toFixed(2)}  ${r.question.padEnd(58)} [${r.screen}] ${r.sources.join(", ")}`,
  );
}
console.log(
  `  recall@3 ${pct(inScope.recallAt3)}   answered ${pct(inScope.answeredRate)}`,
);
for (const split of ["tune", "holdout"] as const) {
  const part = inSplit(inScope.results, split);
  console.log(
    `    ${split}: recall@3 ${pct(part.filter((r) => r.hit).length / part.length)} over ${part.length}`,
  );
}
console.log(
  "\nUnrelated questions (word overlap alone must send these to no-match)",
);
for (const r of outOfScope.results) {
  console.log(
    `  ${r.noMatch ? "✓" : "✗"} ${r.split === "holdout" ? "H" : "t"} rel ${r.topRelevance.toFixed(2)}  ${r.question}`,
  );
}
console.log(`  no-match ${pct(outOfScope.noMatchRate)}`);
const nearMiss = evaluateOutOfScope(bundle, ofKind(OUT_OF_SCOPE, "near-miss"));
console.log(
  "\nNear-miss questions (name a covered feature, ask for something it lacks; the model must refuse, checked with --live)",
);
for (const r of nearMiss.results) {
  console.log(
    `  ${r.noMatch ? "refused by floor" : "reaches the model "} rel ${r.topRelevance.toFixed(2)}  ${r.question}`,
  );
}
const weakestIn = Math.min(...inScope.results.map((r) => r.topRelevance));
const strongestOut = Math.max(...outOfScope.results.map((r) => r.topRelevance));
console.log(
  `\nRelevance gap: weakest in-scope ${weakestIn.toFixed(2)} vs strongest out-of-scope ${strongestOut.toFixed(2)}`,
);

if (process.argv.includes("--live")) {
  const i = process.argv.indexOf("--url");
  const base = (i >= 0 ? process.argv[i + 1] : "http://localhost:8787").replace(
    /\/$/,
    "",
  );
  const runs = Number(process.argv[process.argv.indexOf("--runs") + 1]) || 1;
  console.log(
    `\nLive run against ${base} (${runs} pass${runs === 1 ? "" : "es"})`,
  );
  const latencies: number[] = [];
  let answered = 0;
  let cited = 0;
  let correct = 0;
  let total = 0;
  for (let pass = 0; pass < runs; pass++) {
    for (const q of IN_SCOPE) {
      const started = performance.now();
      try {
        const res = await fetch(`${base}/api/help/ask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost",
          },
          body: JSON.stringify({
            question: q.question,
            history: [],
            context: SCREENS[q.screen],
          }),
        });
        latencies.push(performance.now() - started);
        total++;
        const body = (await res.json()) as {
          outcome?: string;
          sources?: { id: string }[];
          error?: { code?: string };
        };
        if (res.ok && body.outcome === "answered") {
          answered++;
          if ((body.sources?.length ?? 0) > 0) cited++;
          if (body.sources?.some((s) => q.expect.includes(s.id.split("#")[0])))
            correct++;
        } else {
          console.log(
            `  ! ${q.question}: ${res.status} ${body.error?.code ?? body.outcome}`,
          );
        }
      } catch (error) {
        console.log(`  ! ${q.question}: ${(error as Error).message}`);
      }
    }
  }
  let refusedNearMiss = 0;
  const nearMissQuestions = ofKind(OUT_OF_SCOPE, "near-miss");
  for (const q of nearMissQuestions) {
    try {
      const res = await fetch(`${base}/api/help/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost",
        },
        body: JSON.stringify({
          question: q.question,
          history: [],
          context: SCREENS[q.screen],
        }),
      });
      const body = (await res.json()) as { outcome?: string };
      const refused = body.outcome !== "answered";
      if (refused) refusedNearMiss++;
      console.log(`  ${refused ? "✓ refused " : "✗ ANSWERED"} ${q.question}`);
    } catch (error) {
      console.log(`  ! ${q.question}: ${(error as Error).message}`);
    }
  }
  console.log(
    `  near-miss refused ${refusedNearMiss} of ${nearMissQuestions.length}`,
  );
  latencies.sort((a, b) => a - b);
  const at = (p: number) =>
    latencies[
      Math.min(latencies.length - 1, Math.floor(p * latencies.length))
    ] ?? NaN;
  console.log(
    `  requests ${total}, answered ${answered}, cited ${cited}, correct source ${correct}`,
  );
  console.log(
    `  latency p50 ${at(0.5).toFixed(0)} ms, p90 ${at(0.9).toFixed(0)} ms, max ${at(1).toFixed(0)} ms`,
  );
}
