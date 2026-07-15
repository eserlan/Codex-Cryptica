import { resolvePronounsLocally } from "@codex/ai-engine";

const history = [{ role: "user" as const, content: "who is kardos" }];
const query = "what does he do";

resolvePronounsLocally(query, history).then((res) => {
  console.log("RESULT for 'who is kardos':", res);
});
