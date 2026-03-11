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

    it("should handle lite mode correctly", () => {
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

  describe("isExpandRequest", () => {
    it("should return true for expansion keywords", () => {
      expect(OracleCommandParser.isExpandRequest("elaborate on this")).toBe(
        true,
      );
      expect(OracleCommandParser.isExpandRequest("describe the tavern")).toBe(
        true,
      );
    });

    it("should return false for other queries", () => {
      expect(OracleCommandParser.isExpandRequest("hello")).toBe(false);
    });
  });
});
