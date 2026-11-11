import { describe, expect, it } from "vitest";
import {
  GNUMARUS_MODEL3D_DEFAULT_VIEW,
  parseModel3dView,
} from "../src/project/GnumarusProjectFormat";
import { GnumarusHistory } from "../src/history/GnumarusHistory";

describe("GnumarusModel3dView", () => {
  it("returns defaults for missing or invalid input", () => {
    expect(parseModel3dView(undefined)).toEqual(GNUMARUS_MODEL3D_DEFAULT_VIEW);
    expect(parseModel3dView(null)).toEqual(GNUMARUS_MODEL3D_DEFAULT_VIEW);
    expect(parseModel3dView("orbit")).toEqual(GNUMARUS_MODEL3D_DEFAULT_VIEW);
  });

  it("clamps out-of-range fields and keeps a valid azimuth as-is", () => {
    const view = parseModel3dView({
      azimuth: 720.5,
      elevation: 120,
      distance: 100,
      panX: -20,
      panY: 20,
    });
    expect(view.azimuth).toBeCloseTo(720.5, 5);
    expect(view.elevation).toBe(89);
    expect(view.distance).toBe(50);
    expect(view.panX).toBe(-10);
    expect(view.panY).toBe(10);
  });

  it("falls back per field when values are not finite", () => {
    const view = parseModel3dView({
      azimuth: Number.NaN,
      elevation: "high",
      distance: Number.POSITIVE_INFINITY,
      panX: 1,
      panY: 2,
    });
    expect(view.azimuth).toBe(GNUMARUS_MODEL3D_DEFAULT_VIEW.azimuth);
    expect(view.elevation).toBe(GNUMARUS_MODEL3D_DEFAULT_VIEW.elevation);
    expect(view.distance).toBe(GNUMARUS_MODEL3D_DEFAULT_VIEW.distance);
    expect(view.panX).toBe(1);
    expect(view.panY).toBe(2);
  });

  it("undoes and redoes a model view commit", () => {
    const history = new GnumarusHistory();
    const before = { ...GNUMARUS_MODEL3D_DEFAULT_VIEW };
    const after = { ...before, azimuth: 120, elevation: -10 };
    history.push({ type: "model3d-view", view: { modelId: "model1", before, after } });
    let stored = { ...before };
    const apply = (modelId: string, view: typeof before): boolean => {
      if (modelId !== "model1") {
        return false;
      }
      stored = { ...view };
      return true;
    };
    expect(
      history.undo(
        () => null,
        () => {},
        () => true,
        () => true,
        () => true,
        () => true,
        () => true,
        () => true,
        () => true,
        apply,
      ),
    ).toBe(true);
    expect(stored).toEqual(before);
    expect(
      history.redo(
        () => null,
        () => {},
        () => true,
        () => true,
        () => true,
        () => true,
        () => true,
        () => true,
        () => true,
        apply,
      ),
    ).toBe(true);
    expect(stored).toEqual(after);
  });
});
