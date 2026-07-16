import type { Point, ViewportTransform } from "schema";
import {
  getKeyboardViewportUpdate,
  getZoomViewportUpdate,
  shouldIgnoreMapKeyboardEvent,
} from "$lib/components/map/map-view-helpers";

export interface PanZoomBounds {
  width: number;
  height: number;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

/**
 * Pan/zoom viewport state for the lineage canvas: pointer drag-pan, wheel
 * zoom (cursor-anchored, via the map's pure zoom math), two-finger pinch, and
 * keyboard pan/zoom (FR-007). A thin, DI-friendly class (Constitution VIII) —
 * no store coupling, unlike the map's full interaction manager.
 */
export class PanZoomState {
  viewport = $state<ViewportTransform>({ pan: { x: 0, y: 0 }, zoom: 1 });

  private isPanning = false;
  private lastPoint: Point = { x: 0, y: 0 };
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;
  private pinchStartMidpoint: Point = { x: 0, y: 0 };
  private pinchStartPan: Point = { x: 0, y: 0 };
  private activePointers = new Map<number, Point>();

  getContainerSize: () => PanZoomBounds;

  constructor(
    getContainerSize: () => PanZoomBounds = () => ({ width: 0, height: 0 }),
  ) {
    this.getContainerSize = getContainerSize;
  }

  onPointerDown(event: PointerEvent) {
    this.activePointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (this.activePointers.size === 1) {
      this.isPanning = true;
      this.lastPoint = { x: event.clientX, y: event.clientY };
    } else if (this.activePointers.size === 2) {
      this.isPanning = false;
      const [a, b] = [...this.activePointers.values()];
      this.pinchStartDistance = distance(a, b);
      this.pinchStartZoom = this.viewport.zoom;
      this.pinchStartMidpoint = midpoint(a, b);
      this.pinchStartPan = { ...this.viewport.pan };
    }
  }

  onPointerMove(event: PointerEvent) {
    if (!this.activePointers.has(event.pointerId)) return;
    this.activePointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (this.activePointers.size === 2) {
      const [a, b] = [...this.activePointers.values()];
      const dist = distance(a, b);
      if (this.pinchStartDistance > 0) {
        const nextZoom = clamp(
          this.pinchStartZoom * (dist / this.pinchStartDistance),
          MIN_ZOOM,
          MAX_ZOOM,
        );
        const nextMidpoint = midpoint(a, b);
        const contentX =
          (this.pinchStartMidpoint.x - this.pinchStartPan.x) /
          this.pinchStartZoom;
        const contentY =
          (this.pinchStartMidpoint.y - this.pinchStartPan.y) /
          this.pinchStartZoom;
        this.viewport = {
          pan: {
            x: nextMidpoint.x - contentX * nextZoom,
            y: nextMidpoint.y - contentY * nextZoom,
          },
          zoom: nextZoom,
        };
      }
      return;
    }

    if (this.isPanning) {
      const dx = event.clientX - this.lastPoint.x;
      const dy = event.clientY - this.lastPoint.y;
      this.lastPoint = { x: event.clientX, y: event.clientY };
      this.viewport = {
        ...this.viewport,
        pan: { x: this.viewport.pan.x + dx, y: this.viewport.pan.y + dy },
      };
    }
  }

  onPointerUp(event: PointerEvent) {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) this.pinchStartDistance = 0;
    if (this.activePointers.size === 1) {
      const [remaining] = this.activePointers.values();
      this.lastPoint = remaining;
      this.isPanning = true;
    } else if (this.activePointers.size === 0) {
      this.isPanning = false;
    }
  }

  onWheel(event: WheelEvent, container: HTMLElement) {
    event.preventDefault();
    const rect = container.getBoundingClientRect();
    const mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const update = getZoomViewportUpdate({
      mouse,
      canvasSize: this.getContainerSize(),
      viewport: this.viewport,
      deltaY: event.deltaY,
      altHeld: event.altKey,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
    this.viewport = { pan: update.pan, zoom: update.zoom };
  }

  onKeyDown(event: KeyboardEvent) {
    if (shouldIgnoreMapKeyboardEvent(event.target)) return;
    const update = getKeyboardViewportUpdate(event.key, this.viewport, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
    if (!update) return;
    event.preventDefault();
    this.viewport = { pan: update.pan, zoom: update.zoom };
  }

  /** Centres and scales the viewport so `bounds` fits the current container. */
  fitTo(bounds: PanZoomBounds) {
    const container = this.getContainerSize();
    if (bounds.width === 0 || bounds.height === 0 || container.width === 0) {
      this.viewport = { pan: { x: 0, y: 0 }, zoom: 1 };
      return;
    }
    const zoom = clamp(
      Math.min(
        container.width / bounds.width,
        container.height / bounds.height,
        1,
      ),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    this.viewport = { pan: { x: 0, y: 0 }, zoom };
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
