import {
  mutationTestContext,
  makeMutationEntity,
} from "./entity-mutation-test-helpers";
import { describe, expect, it } from "vitest";
import {
  hasLongFormUpdate,
  markMutationContentLoaded,
  finishBulkMutation,
} from "./entity-mutation-effects";
import { summarizeBulkMutation } from "./bulk-results";

describe("entity mutation effects", () => {
  it("recognises empty long form updates but excludes undefined text and metadata", () => {
    expect(hasLongFormUpdate({ content: "" })).toBe(true);
    expect(hasLongFormUpdate({ lore: "" })).toBe(true);
    expect(hasLongFormUpdate({ content: undefined, title: "title" })).toBe(
      false,
    );
  });

  it("marks the supplied staged record or the current record, tolerating a missing entity", () => {
    const { context, loader } = mutationTestContext();
    const staged = { hero: makeMutationEntity() };
    markMutationContentLoaded(context, "hero", staged);
    expect(staged.hero.contentLoaded).toBe(true);
    expect(context.entities.hero.contentLoaded).toBeUndefined();
    markMutationContentLoaded(context, "hero");
    expect(context.entities.hero.contentLoaded).toBe(true);
    markMutationContentLoaded(context, "missing");
    expect(loader.markContentLoaded).toHaveBeenCalledWith("missing");
  });

  it.each(["success", "failed", "cancelled"] as const)(
    "reports %s outcomes with successful counts",
    (status) => {
      const { span } = mutationTestContext();
      const result = summarizeBulkMutation(["hero"], [{ id: "hero", status }]);
      expect(finishBulkMutation(span, result)).toBe(result);
      if (status === "success") {
        expect(span.complete.mock.calls[0][0]()).toEqual({
          changedEntityCount: 1,
        });
        expect(span.fail).not.toHaveBeenCalled();
      } else {
        expect(span.fail.mock.calls[0][1]()).toEqual({ changedEntityCount: 0 });
        expect(span.complete).not.toHaveBeenCalled();
      }
    },
  );
});
