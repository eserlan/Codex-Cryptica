import { describe, expect, it, vi } from "vitest";
import {
  createHelpHashArticleSelector,
  getHelpArticleIdFromHash,
} from "./help-direct-link";

describe("getHelpArticleIdFromHash", () => {
  it("returns the article id from a standalone Help hash", () => {
    expect(getHelpArticleIdFromHash("#help/family-tree")).toBe("family-tree");
  });

  it("returns null for hashes that do not identify an article", () => {
    expect(getHelpArticleIdFromHash("#section/family-tree")).toBeNull();
    expect(getHelpArticleIdFromHash("#help/")).toBeNull();
  });
});

describe("createHelpHashArticleSelector", () => {
  it("opens a known hash immediately and reports a current article load failure", async () => {
    let rejectLoad!: (error: Error) => void;
    const selectArticle = vi.fn();
    const onError = vi.fn();
    const selector = createHelpHashArticleSelector({
      getHash: () => "#help/graph-basics",
      selectArticle,
      clearSelection: vi.fn(),
      ensureArticles: () =>
        new Promise((_, reject) => {
          rejectLoad = reject;
        }),
      onError,
    });

    const pending = selector.selectFromHash();
    expect(selectArticle).toHaveBeenCalledWith("graph-basics");
    rejectLoad(new Error("chunk failed"));
    await pending;
    expect(onError).toHaveBeenCalledOnce();
  });

  it("ignores a superseded hash load after the selector is disposed", async () => {
    let hash = "#help/intro";
    const rejectLoads: Array<(error: Error) => void> = [];
    const selectArticle = vi.fn();
    const onError = vi.fn();
    const selector = createHelpHashArticleSelector({
      getHash: () => hash,
      selectArticle,
      clearSelection: vi.fn(),
      ensureArticles: () =>
        new Promise((_, reject) => rejectLoads.push(reject)),
      onError,
    });

    const oldLoad = selector.selectFromHash();
    hash = "#help/graph-basics";
    const newLoad = selector.selectFromHash();
    expect(selectArticle.mock.calls).toEqual([["intro"], ["graph-basics"]]);
    selector.dispose();
    rejectLoads[0](new Error("stale failure"));
    rejectLoads[1](new Error("load failed after unmount"));
    await Promise.all([oldLoad, newLoad]);
    expect(onError).not.toHaveBeenCalled();
  });
});
