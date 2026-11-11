import { describe, expect, it } from "vitest";
import { GNUMARUS_COLOR_MODELS } from "../src/color/GnumarusColorModels";
import { COLOR_AXIS_KEYS } from "../src/color/GnumarusColorPicker";
import { PT_BR_STRINGS } from "../src/i18n/GnumarusI18n";

describe("color picker labels", () => {
  it("maps every model axis label to a catalog key", () => {
    const labels = new Set<string>();
    for (const model of GNUMARUS_COLOR_MODELS) {
      for (const axis of model.axes) {
        labels.add(axis.label);
      }
    }
    expect(labels.size).toBeGreaterThan(0);
    for (const label of labels) {
      const key = COLOR_AXIS_KEYS[label];
      expect(key, `axis label "${label}"`).toBeDefined();
      if (key !== undefined) {
        expect(PT_BR_STRINGS[key].trim().length).toBeGreaterThan(0);
      }
    }
  });
});
