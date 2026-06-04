import type { MapPin, Point } from "schema";
import { findClickedPin, isClickGesture } from "../map-view-helpers";

export interface PinInteractionDependencies {
  getPins: () => MapPin[];
  project: (point: Point) => Point;
  unproject: (point: Point) => Point;
  canEditPins: () => boolean;
  updatePinCoordinates: (pinId: string, point: Point) => void;
  saveMaps: () => Promise<void>;
  selectEntity: (entityId: string) => void;
}

export interface PinDragState {
  pinId: string;
  originalCoordinates?: Point;
  hasMoved?: boolean;
  offset: Point;
}

export type PinEndResult =
  | { type: "none" }
  | { type: "selected"; pinId: string }
  | { type: "dragged"; pinId: string };

export class PinInteractionHandler {
  dragState: PinDragState | null = null;

  constructor(private deps: PinInteractionDependencies) {}

  begin(viewportPoint: Point) {
    const clickedPin = findClickedPin(
      this.deps.getPins(),
      this.deps.project,
      viewportPoint.x,
      viewportPoint.y,
    );

    if (!clickedPin) return null;

    const imgPoint = this.deps.unproject(viewportPoint);
    this.dragState = {
      pinId: clickedPin.id,
      originalCoordinates: { ...clickedPin.coordinates },
      hasMoved: false,
      offset: {
        x: imgPoint.x - clickedPin.coordinates.x,
        y: imgPoint.y - clickedPin.coordinates.y,
      },
    };

    return clickedPin;
  }

  selectAt(viewportPoint: Point) {
    const clickedPin = findClickedPin(
      this.deps.getPins(),
      this.deps.project,
      viewportPoint.x,
      viewportPoint.y,
    );

    if (clickedPin?.entityId) {
      this.deps.selectEntity(clickedPin.entityId);
    }

    return clickedPin;
  }

  move(viewportPoint: Point, mouseDownPoint: Point) {
    if (!this.dragState) return false;

    if (this.deps.canEditPins()) {
      const dist = Math.hypot(
        viewportPoint.x - mouseDownPoint.x,
        viewportPoint.y - mouseDownPoint.y,
      );
      if (dist >= 5) {
        this.dragState.hasMoved = true;
      }

      if (this.dragState.hasMoved) {
        const imgPoint = this.deps.unproject(viewportPoint);
        this.deps.updatePinCoordinates(this.dragState.pinId, {
          x: imgPoint.x - this.dragState.offset.x,
          y: imgPoint.y - this.dragState.offset.y,
        });
      }
    }

    return true;
  }

  async end(mouseDownPoint: Point, mouseUpPoint: Point): Promise<PinEndResult> {
    if (!this.dragState) return { type: "none" };

    const { pinId, originalCoordinates, hasMoved } = this.dragState;
    this.dragState = null;

    if (isClickGesture(mouseDownPoint, mouseUpPoint)) {
      if (originalCoordinates && this.deps.canEditPins()) {
        this.deps.updatePinCoordinates(pinId, originalCoordinates);
      }

      const pin = this.deps
        .getPins()
        .find((candidate) => candidate.id === pinId);
      if (pin?.entityId) {
        this.deps.selectEntity(pin.entityId);
      }
      return { type: "selected", pinId };
    }

    if (hasMoved && this.deps.canEditPins()) {
      await this.deps.saveMaps();
    }
    return { type: "dragged", pinId };
  }
}
