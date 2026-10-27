import { describe, expect, it } from "vitest";
import { MAP_LAYER_ORDER } from "map-engine";
import {
  DEFAULT_MAP_SETTINGS,
  gridFieldsFor,
  layerRecord,
  parseMapSettings,
} from "./map-settings";

describe("map settings compatibility", () => {
  it("fills absent fields with defaults and creates every layer flag", () => {
    expect(parseMapSettings("{}")).toEqual(DEFAULT_MAP_SETTINGS);
    expect(Object.keys(layerRecord(true))).toEqual([...MAP_LAYER_ORDER]);
  });

  it("round-trips supported settings, preserving zero, false and null", () => {
    const settings = {
      ...DEFAULT_MAP_SETTINGS,
      gridType: "hex-flat",
      gridSize: 0,
      gridOffsetX: 0,
      showLabels: false,
      soloFog: true,
      gridColor: "#123456",
      fogColor: null,
      visionMode: "selected",
      visionRange: 0,
      hexLabelConfig: { style: "axial", offsetQ: 5 },
    };
    expect(parseMapSettings(JSON.stringify(settings))).toEqual(settings);
  });

  it.each(["{", "null", ""])("ignores unreadable settings %s", (raw) => {
    expect(parseMapSettings(raw)).toBeNull();
  });

  it("rejects incorrect primitive types and unknown grid and vision modes", () => {
    const invalid = Object.fromEntries(
      Object.keys(DEFAULT_MAP_SETTINGS).map((key) => [key, []]),
    );
    // Arrays were historically accepted as object-shaped layer records.
    expect(parseMapSettings(JSON.stringify(invalid))).toEqual(
      DEFAULT_MAP_SETTINGS,
    );
    expect(
      parseMapSettings(
        JSON.stringify({
          gridType: "triangle",
          visionMode: "all",
          layerVisibility: false,
          layerLocked: 4,
        }),
      ),
    ).toEqual(DEFAULT_MAP_SETTINGS);
  });

  it.each([null, [], {}, { style: "unknown" }])(
    "migrates invalid old label settings %j",
    (hexLabelConfig) => {
      expect(
        parseMapSettings(
          JSON.stringify({ hexLabelConfig, showHexCoordinates: true }),
        )?.hexLabelConfig,
      ).toEqual({ style: "numeric" });
      expect(
        parseMapSettings(JSON.stringify({ hexLabelConfig }))?.hexLabelConfig,
      ).toEqual({ style: "none" });
    },
  );

  it.each(["none", "off", "numeric", "alphanumeric", "axial"])(
    "preserves label style %s",
    (style) => {
      expect(
        parseMapSettings(JSON.stringify({ hexLabelConfig: { style } }))
          ?.hexLabelConfig,
      ).toEqual({ style });
    },
  );

  it("merges old layer flags over the complete layer defaults", () => {
    const layer = MAP_LAYER_ORDER[0];
    expect(
      parseMapSettings(
        JSON.stringify({
          layerVisibility: { [layer]: false },
          layerLocked: { [layer]: true },
        }),
      ),
    ).toMatchObject({
      layerVisibility: { ...layerRecord(true), [layer]: false },
      layerLocked: { ...layerRecord(false), [layer]: true },
    });
  });

  it("uses stored map geometry before device geometry, with legacy labels as fallback", () => {
    const device = {
      ...DEFAULT_MAP_SETTINGS,
      gridType: "hex-flat" as const,
      gridSize: 90,
      showHexCoordinates: true,
      hexLabelConfig: undefined,
    };
    expect(gridFieldsFor(null, device)).toMatchObject({
      gridType: "hex-flat",
      gridSize: 90,
      hexLabelConfig: { style: "numeric" },
    });
    expect(
      gridFieldsFor(
        { type: "square", size: 40, offsetX: 1, offsetY: 2 },
        device,
      ),
    ).toEqual({
      gridType: "square",
      gridSize: 40,
      gridOffsetX: 1,
      gridOffsetY: 2,
      hexLabelConfig: { style: "numeric" },
    });
    expect(
      gridFieldsFor(
        {
          type: "hex-pointy",
          size: 20,
          offsetX: 0,
          offsetY: 0,
          labels: { style: "axial" },
        },
        device,
      ).hexLabelConfig,
    ).toEqual({ style: "axial" });
  });
});
