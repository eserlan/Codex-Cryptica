import { resolvePronounsLocally } from "./lib/services/ai/resolve-pronouns";

const history = [{ role: "user" as const, content: "who is kardos" }];
const query = "what does he do";

resolvePronounsLocally(query, history).then((res) => {
  console.log("RESULT for 'who is kardos':", res);
});
