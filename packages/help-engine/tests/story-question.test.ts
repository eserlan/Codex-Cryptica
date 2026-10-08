import { describe, expect, it } from "vitest";
import {
  ORACLE_REDIRECT_MESSAGE,
  isStoryQuestion,
  oracleRedirectAnswer,
} from "../src/response/finalize";

describe("isStoryQuestion", () => {
  it("recognises a question about what a character or creature would do", () => {
    expect(isStoryQuestion("what would the goblin do?")).toBe(true);
    expect(isStoryQuestion("how would the innkeeper react?")).toBe(true);
    expect(isStoryQuestion("what does the bandit say to us")).toBe(true);
  });

  it("leaves product questions alone, including ones that mention do", () => {
    expect(isStoryQuestion("how do I play solo?")).toBe(false);
    expect(isStoryQuestion("what does the Oracle button do?")).toBe(false);
    expect(isStoryQuestion("what would happen if I delete the vault?")).toBe(
      false,
    );
    expect(isStoryQuestion("how do I connect two entities?")).toBe(false);
  });
});

describe("oracleRedirectAnswer", () => {
  it("points the player at the Oracle, with no sources or action", () => {
    const answer = oracleRedirectAnswer();
    expect(answer.outcome).toBe("out-of-scope");
    expect(answer.answer).toBe(ORACLE_REDIRECT_MESSAGE);
    expect(answer.answer).toMatch(/Oracle/);
    expect(answer.sources).toEqual([]);
    expect(answer.action).toBeNull();
    expect(answer.suggestions).toEqual([]);
  });
});
