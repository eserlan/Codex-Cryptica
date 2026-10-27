import type { MapPin, Point, ViewportTransform } from "schema";
import { pointToHex, hexToPoint } from "map-engine";
import type { GridType } from "./map-settings";
import { vault as defaultVault } from "./vault.svelte";
import {
  systemIdGenerator,
  type IdGenerator,
} from "#lib/utils/runtime-deps.js";

type PinState = {
  activeMapId: string | null;
  pins: MapPin[];
  viewport: ViewportTransform;
  showGrid: boolean;
  gridType: GridType;
  gridSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
};

/** Pin mutations and image/hex coordinate handling. */
export class MapPins {
  constructor(
    private readonly state: PinState,
    private readonly idGenerator: IdGenerator = systemIdGenerator,
    private readonly vault: Pick<
      typeof defaultVault,
      "maps" | "entities" | "saveMaps"
    > = defaultVault,
  ) {}

  private computeHexPosition(coordinates: Point): {
    coordinates: Point;
    hexCoordinates?: { q: number; r: number };
  } {
    if (
      this.state.showGrid &&
      (this.state.gridType === "hex-pointy" ||
        this.state.gridType === "hex-flat")
    ) {
      const orientation =
        this.state.gridType === "hex-flat" ? "flat" : "pointy";
      const config = {
        orientation,
        size: this.state.gridSize || 50,
        offsetX: this.state.gridOffsetX || 0,
        offsetY: this.state.gridOffsetY || 0,
      } as const;
      const hexCoordinates = pointToHex(coordinates, config);
      return {
        coordinates: hexToPoint(hexCoordinates, config),
        hexCoordinates,
      };
    }
    return { coordinates };
  }

  // fallow-ignore-next-line complexity
  async addPin(entityId: string | undefined, coordinates: Point) {
    if (!this.state.activeMapId || !this.vault.maps[this.state.activeMapId])
      return;

    let visuals = {};
    if (entityId) {
      const entity = this.vault.entities[entityId];
      if (entity) {
        const { categories } = await import("./categories.svelte");
        visuals = {
          color: categories.getColor(entity.type),
          // For now we don't have icon mapping, but could add it later
        };
      }
    }

    const hexPosition = this.computeHexPosition(coordinates);

    const newPin: MapPin = {
      id: this.idGenerator.uuid(),
      mapId: this.state.activeMapId,
      entityId,
      coordinates: hexPosition.coordinates,
      hexCoordinates: hexPosition.hexCoordinates,
      visuals,
    };

    if (!this.vault.maps) return;
    const map = this.vault.maps[this.state.activeMapId];
    if (map) {
      map.pins = [...map.pins, newPin];
      await this.vault.saveMaps();
    }
  }

  // fallow-ignore-next-line complexity
  updatePinCoordinatesInMemory(pinId: string, coordinates: Point) {
    if (!this.state.activeMapId || !this.vault.maps?.[this.state.activeMapId])
      return;
    const map = this.vault.maps[this.state.activeMapId];
    if (map) {
      const { hexCoordinates } = this.computeHexPosition(coordinates);
      map.pins = map.pins.map((p: MapPin) =>
        p.id === pinId ? { ...p, coordinates, hexCoordinates } : p,
      );
    }
  }

  snapPinCoordinatesInMemory(pinId: string) {
    if (!this.state.activeMapId || !this.vault.maps?.[this.state.activeMapId])
      return;
    const map = this.vault.maps[this.state.activeMapId];
    const pin = map?.pins.find((candidate: MapPin) => candidate.id === pinId);
    if (!map || !pin) return;

    const hexPosition = this.computeHexPosition(pin.coordinates);
    map.pins = map.pins.map((candidate: MapPin) =>
      candidate.id === pinId
        ? {
            ...candidate,
            coordinates: hexPosition.coordinates,
            hexCoordinates: hexPosition.hexCoordinates,
          }
        : candidate,
    );
  }

  async removePin(pinId: string) {
    if (!this.state.activeMapId || !this.vault.maps?.[this.state.activeMapId]) {
      return;
    }

    const map = this.vault.maps[this.state.activeMapId];
    if (map) {
      map.pins = map.pins.filter((p: MapPin) => p.id !== pinId);
      await this.vault.saveMaps();
    }
  }

  /** Removes pins for a just-created entity from any map after a failed save. */
  async removePinsForEntity(entityId: string) {
    let changed = false;
    for (const map of Object.values(this.vault.maps ?? {})) {
      const pins = map.pins.filter((pin: MapPin) => pin.entityId !== entityId);
      if (pins.length === map.pins.length) continue;
      map.pins = pins;
      changed = true;
    }
    if (changed) await this.vault.saveMaps();
  }

  jumpToPin(pinId: string) {
    const pin = this.state.pins.find((p: MapPin) => p.id === pinId);
    if (pin) {
      // Use a balanced zoom level for inspection
      const zoom = Math.max(1.2, this.state.viewport.zoom);
      this.state.viewport = {
        pan: {
          x: -pin.coordinates.x * zoom,
          y: -pin.coordinates.y * zoom,
        },
        zoom,
      };
    }
  }
}
