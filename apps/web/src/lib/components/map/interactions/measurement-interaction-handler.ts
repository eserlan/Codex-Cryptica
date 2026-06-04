import type { Point } from "schema";
import type { MeasurementState } from "../../../../types/vtt";

export interface MeasurementInteractionDependencies {
  getMeasurement: () => MeasurementState;
  unproject: (point: Point) => Point;
  setMeasurementStart: (start: Point | null) => void;
  setMeasurementEnd: (end: Point | null, silent?: boolean) => void;
  setMeasurementLocked: (locked: boolean) => void;
}

export class MeasurementInteractionHandler {
  constructor(private deps: MeasurementInteractionDependencies) {}

  updateLiveEnd(viewportPoint: Point) {
    const measurement = this.deps.getMeasurement();
    if (!measurement.active || !measurement.start || measurement.locked) {
      return false;
    }

    this.deps.setMeasurementEnd(this.deps.unproject(viewportPoint), true);
    return true;
  }

  handleClick(viewportPoint: Point) {
    const measurement = this.deps.getMeasurement();
    if (!measurement.active) return false;

    const imgCoords = this.deps.unproject(viewportPoint);
    if (!measurement.start) {
      this.deps.setMeasurementStart(imgCoords);
    } else if (!measurement.locked) {
      this.deps.setMeasurementEnd(imgCoords);
      this.deps.setMeasurementLocked(true);
    } else {
      this.deps.setMeasurementStart(imgCoords);
    }

    return true;
  }
}
