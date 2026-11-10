import { session } from "./reducer-fixtures";
import { expect, it } from "vitest";
import {
  error,
  idAllocationError,
  updatedSession,
} from "../src/reducer-result";

it("retains validation codes and messages and gives ID failures a consistent error", () => {
  expect(error("unknown-secret", "Unknown secret: missing")).toEqual({
    ok: false,
    errors: [{ code: "unknown-secret", message: "Unknown secret: missing" }],
  });
  expect(idAllocationError()).toEqual(
    error(
      "id-allocation-failed",
      "Could not allocate unique IDs for the generated state.",
    ),
  );
});

it("increments revision once without changing when the session was last played", () => {
  const candidate = session();
  const lastPlayedAt = candidate.lastPlayedAt;
  const result = updatedSession(candidate, "2026-11-11T00:00:00.000Z");
  expect(result).toEqual({ ok: true, value: candidate });
  expect(result.value).toBe(candidate);
  expect(candidate.revision).toBe(1);
  expect(candidate.updatedAt).toBe("2026-11-11T00:00:00.000Z");
  expect(candidate.lastPlayedAt).toBe(lastPlayedAt);
});
