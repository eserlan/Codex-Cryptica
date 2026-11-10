import { expect, it } from "vitest";
import { error, idAllocationError } from "../src/reducer-result";

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
