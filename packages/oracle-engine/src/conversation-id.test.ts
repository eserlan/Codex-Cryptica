import { describe, it, expect } from "vitest";
import { oracleConversationId } from "./conversation-id";

describe("oracleConversationId", () => {
  it("is stable per vault and distinct across vaults", () => {
    expect(oracleConversationId("v1")).toBe("oracle:v1:normal");
    expect(oracleConversationId("v1")).not.toBe(oracleConversationId("v2"));
  });
});
