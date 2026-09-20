import { describe, expect, it, vi } from "vitest";
import { applyArrival, parseArrival } from "./arrival";

describe("parseArrival", () => {
  it("reads from, source and mode", () => {
    expect(
      parseArrival(
        "?from=answer&source=is-my-rpg-campaign-idea-good&mode=assess",
      ),
    ).toEqual({
      sourceKind: "answer",
      sourceId: "is-my-rpg-campaign-idea-good",
      suggestedMode: "assess",
    });
  });

  it("accepts URLSearchParams too", () => {
    const params = new URLSearchParams("from=tools&source=faq&mode=develop");
    expect(parseArrival(params)).toEqual({
      sourceKind: "tools",
      sourceId: "faq",
      suggestedMode: "develop",
    });
  });

  it("returns nothing when there is no source", () => {
    expect(parseArrival("")).toBeNull();
    expect(parseArrival("?from=answer&mode=assess")).toBeNull();
  });

  it("turns an unknown from into other", () => {
    expect(parseArrival("?from=twitter&source=abc")?.sourceKind).toBe("other");
    expect(parseArrival("?source=abc")?.sourceKind).toBe("other");
  });

  it("ignores an unknown mode", () => {
    const arrival = parseArrival("?from=answer&source=abc&mode=challenge");
    expect(arrival).toEqual({ sourceKind: "answer", sourceId: "abc" });
    expect(arrival?.suggestedMode).toBeUndefined();
  });

  it.each([
    "Some free text",
    "has spaces",
    "UPPER",
    "-leading",
    "trailing-",
    "double--dash",
    "<script>",
    "a/b",
    "x".repeat(121),
  ])("ignores a source that is not a plain slug: %s", (source) => {
    expect(
      parseArrival(`?from=answer&source=${encodeURIComponent(source)}`),
    ).toBeNull();
  });

  it("never carries free text through", () => {
    const arrival = parseArrival(
      "?from=answer&source=abc&mode=assess&idea=my%20secret%20idea&text=hello",
    );
    expect(JSON.stringify(arrival)).not.toMatch(/secret|hello/);
  });
});

describe("applyArrival", () => {
  const store = (status: string) => ({
    status,
    setMode: vi.fn(),
  });

  it("preselects the suggested mode and focuses the input for a fresh visit", () => {
    const s = store("empty");
    const focus = vi.fn();
    applyArrival(
      { sourceKind: "answer", sourceId: "abc", suggestedMode: "assess" },
      s as never,
      focus,
    );
    expect(s.setMode).toHaveBeenCalledWith("assess");
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("leaves a conversation in progress alone", () => {
    const s = store("active");
    const focus = vi.fn();
    applyArrival(
      { sourceKind: "answer", sourceId: "abc", suggestedMode: "assess" },
      s as never,
      focus,
    );
    expect(s.setMode).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });

  it("does nothing without an arrival", () => {
    const s = store("empty");
    const focus = vi.fn();
    applyArrival(null, s as never, focus);
    expect(s.setMode).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });

  it("still focuses the input when there is no suggested mode", () => {
    const s = store("empty");
    const focus = vi.fn();
    applyArrival({ sourceKind: "tools", sourceId: "abc" }, s as never, focus);
    expect(s.setMode).not.toHaveBeenCalled();
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
