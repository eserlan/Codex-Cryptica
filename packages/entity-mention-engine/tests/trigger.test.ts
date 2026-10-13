import { describe, expect, it } from "bun:test";
import { detectTrigger } from "../src/trigger";

describe("detectTrigger", () => {
  it("opens for @ at the start of the text", () => {
    expect(detectTrigger("@ela", 4)).toEqual({
      query: "ela",
      start: 0,
      end: 4,
    });
  });

  it("opens for @ after whitespace or a newline", () => {
    expect(detectTrigger("who is @ela", 11)).toEqual({
      query: "ela",
      start: 7,
      end: 11,
    });
    expect(detectTrigger("hi\n@el", 6)).toEqual({
      query: "el",
      start: 3,
      end: 6,
    });
  });

  it("opens with an empty query right after @", () => {
    expect(detectTrigger("who is @", 8)).toEqual({
      query: "",
      start: 7,
      end: 8,
    });
  });

  it("ignores @ inside a word or an email address", () => {
    expect(detectTrigger("a@b.com", 7)).toBeNull();
    expect(detectTrigger("mail@el", 7)).toBeNull();
  });

  it("closes once the query contains a space", () => {
    expect(detectTrigger("@Elara Voss", 11)).toBeNull();
  });

  it("returns null when the caret is before the @", () => {
    expect(detectTrigger("who is @ela", 3)).toBeNull();
  });

  it("returns null when there is no @ before the caret", () => {
    expect(detectTrigger("hello there", 5)).toBeNull();
  });
});
