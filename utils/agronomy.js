import { isNum } from "./format";

// Soil water thresholds from a farm_profiles row (all in % VWC).
// refill = the point where Management Allowed Depletion (MAD) is used up.
export function moistureModel(farm) {
  if (!farm) return null;
  const fc = Number(farm.field_capacity_vwc);
  const wp = Number(farm.wilting_point_vwc);
  const mad = Number(farm.mad_percent) / 100;
  if (!isNum(farm.field_capacity_vwc) || !isNum(farm.wilting_point_vwc) || fc <= wp) return null;
  return { fc, wp, refill: fc - (fc - wp) * (isNum(farm.mad_percent) ? mad : 0.5) };
}

export function moistureStatus(vwc, model) {
  if (!isNum(vwc) || !model) return null;
  if (vwc < model.wp) return { label: "Critically dry", tone: "danger", icon: "alert-octagon-outline" };
  if (vwc < model.refill) return { label: "Needs water", tone: "warn", icon: "water-alert-outline" };
  if (vwc <= model.fc) return { label: "Optimal", tone: "primary", icon: "check-circle-outline" };
  return { label: "Saturated", tone: "water", icon: "water" };
}
