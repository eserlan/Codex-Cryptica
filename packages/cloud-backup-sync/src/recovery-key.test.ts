import { describe, expect, it } from "vitest";
import { formatRecoveryKey, parseRecoveryKey } from "./recovery-key";

const ID = "3f2b9c1a-1111-4222-8333-444455556666";
const CODE = "a".repeat(64);

describe("recovery key", () => {
  it("round-trips a key so what is copied is what restores", () => {
    expect(parseRecoveryKey(formatRecoveryKey(ID, CODE))).toEqual({
      backupId: ID,
      ownerCode: CODE,
    });
  });

  it("survives the whitespace a paste picks up", () => {
    // Keys arrive via email, chat and text files; the wrapping is not the
    // user's mistake and must not read as an invalid key.
    for (const wrapped of [
      `  ${ID}:${CODE}  `,
      `${ID}:${CODE}\n`,
      `${ID}\n${CODE}`,
      `${ID} ${CODE}`,
    ]) {
      expect(parseRecoveryKey(wrapped)).toEqual({
        backupId: ID,
        ownerCode: CODE,
      });
    }
  });

  it("accepts an uppercased code, since the code is hex", () => {
    expect(parseRecoveryKey(`${ID}:${CODE.toUpperCase()}`)?.ownerCode).toBe(
      CODE,
    );
  });

  it("rejects a key that is missing a half", () => {
    expect(parseRecoveryKey(CODE)).toBeNull();
    expect(parseRecoveryKey(ID)).toBeNull();
    expect(parseRecoveryKey("")).toBeNull();
    expect(parseRecoveryKey("   ")).toBeNull();
  });

  it("rejects malformed halves rather than sending them to the server", () => {
    expect(parseRecoveryKey(`not-an-id:${CODE}`)).toBeNull();
    expect(parseRecoveryKey(`${ID}:short`)).toBeNull();
    expect(parseRecoveryKey(`${ID}:${CODE}:extra`)).toBeNull();
  });
});
