import { describe, it, expect } from "vitest";
import { OracleCommandParser } from "./oracle-parser";

describe("OracleCommandParser", () => {
  describe("parse", () => {
    it("should parse /help", () => {
      expect(OracleCommandParser.parse("/help", false)).toEqual({
        type: "help",
      });
    });

    it("should parse /clear", () => {
      expect(OracleCommandParser.parse("/clear", false)).toEqual({
        type: "clear",
      });
    });

    it("should parse /revise", () => {
      expect(OracleCommandParser.parse("/revise", false)).toEqual({
        type: "revise",
      });
    });

    it("should not keep /regenerate as a command alias", () => {
      expect(OracleCommandParser.parse("/regenerate", false)).toEqual({
        type: "chat",
        query: "/regenerate",
        isAIIntent: true,
      });
    });

    it("should parse /roll", () => {
      expect(OracleCommandParser.parse("/roll 2d6+5", false)).toEqual({
        type: "roll",
        formula: "2d6+5",
      });
    });

    it("should parse /create with quoted name", () => {
      expect(OracleCommandParser.parse('/create "Hero"', false)).toEqual({
        type: "create",
        entityName: "Hero",
        entityType: "character",
        isDrawing: false,
      });
    });

    it("should parse /create with quoted name and type", () => {
      expect(
        OracleCommandParser.parse('/create "Village" as "location"', false),
      ).toEqual({
        type: "create",
        entityName: "Village",
        entityType: "location",
        isDrawing: false,
      });
    });

    it("should parse /create with unquoted type", () => {
      expect(OracleCommandParser.parse('/create "Orc" as npc', false)).toEqual({
        type: "create",
        entityName: "Orc",
        entityType: "npc",
        isDrawing: false,
      });
    });

    it("should parse /connect", () => {
      expect(
        OracleCommandParser.parse('/connect "A" label "B"', false),
      ).toEqual({
        type: "connect",
        sourceName: "A",
        label: "label",
        targetName: "B",
      });
    });

    it("should parse /merge", () => {
      expect(
        OracleCommandParser.parse('/merge "Old" into "New"', false),
      ).toEqual({
        type: "merge",
        sourceName: "Old",
        targetName: "New",
      });
    });

    it("should parse /plot", () => {
      expect(OracleCommandParser.parse('/plot "Character"', false)).toEqual({
        type: "plot",
        query: "Character",
      });
    });

    it("should handle ai disabled correctly", () => {
      const query = "Hello oracle";
      expect(OracleCommandParser.parse(query, true)).toEqual({
        type: "chat",
        query,
        isAIIntent: false,
      });
      expect(OracleCommandParser.parse(query, false)).toEqual({
        type: "chat",
        query,
        isAIIntent: true,
      });
    });
  });

  describe("detectImageIntent", () => {
    it("should detect explicit /draw command", () => {
      expect(OracleCommandParser.detectImageIntent("/draw a dragon")).toBe(
        true,
      );
    });

    it("should detect 'generate an image' phrases", () => {
      expect(
        OracleCommandParser.detectImageIntent(
          "please generate an image of a forest",
        ),
      ).toBe(true);
    });

    it("should detect 'portrait of' construction", () => {
      expect(
        OracleCommandParser.detectImageIntent("give me a portrait of a king"),
      ).toBe(true);
    });

    it("should detect verb + noun combination", () => {
      expect(
        OracleCommandParser.detectImageIntent("show me a map of the world"),
      ).toBe(true);
      expect(
        OracleCommandParser.detectImageIntent("paint a picture of a cat"),
      ).toBe(true);
    });

    it("should return false for non-image intents", () => {
      expect(
        OracleCommandParser.detectImageIntent("tell me about dragons"),
      ).toBe(false);
    });
  });
});

describe("OracleCommandParser: /table and /deck (#2247)", () => {
  const parse = (q: string) => OracleCommandParser.parse(q, false);

  it("parses a table name", () => {
    expect(parse("/table Forest Encounters")).toEqual({
      type: "roll-table",
      sourceName: "Forest Encounters",
    });
  });

  it("asks for a name when given none", () => {
    expect(parse("/table").type).toBe("error");
    expect(parse("/deck  ").type).toBe("error");
  });

  it("does not eat the name when the input has leading whitespace", () => {
    // Commands match on the trimmed form, so slicing the raw input by the
    // matched prefix's length was off by the whitespace — "/table Forest"
    // typed with a leading space came back as "ble Forest".
    expect(parse("  /table Forest Encounters")).toEqual({
      type: "roll-table",
      sourceName: "Forest Encounters",
    });
    expect(parse("\t/deck Complications")).toMatchObject({
      type: "draw-deck",
      sourceName: "Complications",
    });
  });

  it("reports both readings of a trailing number, since either may be the name", () => {
    expect(parse("/deck Tarot 3")).toEqual({
      type: "draw-deck",
      sourceName: "Tarot 3",
      countedName: "Tarot",
      drawCount: 3,
    });
  });

  it("caps a draw count so a typo cannot lock the thread", () => {
    // A with-replacement draw loops once per card, each a rejection-sampled
    // roll, so an unbounded count is a freeze rather than a silly result.
    expect(parse("/deck Tarot 999999")).toMatchObject({ drawCount: 100 });
  });

  it("floors a zero count at one card", () => {
    expect(parse("/deck Tarot 0")).toMatchObject({ drawCount: 1 });
  });

  it("does not treat /tables as a table command", () => {
    expect(parse("/tables").type).not.toBe("roll-table");
  });
});
