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

// ─── Plain-language readings for farmers ─────────────────────────────────────
// Each helper turns a sensor number into { word, say, tone } that someone with
// no sensor knowledge can act on. Thresholds are general guidance for tomato
// (the crop Srijan currently supports); they are deliberately broad.

// Water in the soil, against this farm's own wilting / refill / capacity points.
export function soilWaterSay(vwc, model) {
  if (!isNum(vwc) || !model) return null;
  const v = Number(vwc);
  if (v < model.wp)
    return { key: "dry", word: "Very dry", hi: "Bahut sukha", say: "Plants can't pull water. Water now.", tone: "danger", icon: "water-alert" };
  if (v < model.refill)
    return { key: "low", word: "Getting dry", hi: "Sukh raha hai", say: "Plan to water soon.", tone: "warn", icon: "water-minus" };
  if (v <= model.fc)
    return { key: "good", word: "Just right", hi: "Theek hai", say: "Soil has enough water. No need to water.", tone: "primary", icon: "water-check" };
  return { key: "wet", word: "Too wet", hi: "Zyada geela", say: "Don't water. Extra water can rot the roots.", tone: "water", icon: "water" };
}

// Is moisture going up or down? values: oldest → newest.
export function trendSay(values) {
  if (!values || values.length < 3) return null;
  const n = Math.min(5, Math.floor(values.length / 2));
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const diff = avg(values.slice(-n)) - avg(values.slice(0, n));
  if (diff > 1.5) return { word: "Getting wetter", icon: "trending-up" };
  if (diff < -1.5) return { word: "Drying out", icon: "trending-down" };
  return { word: "Steady", icon: "trending-neutral" };
}

export function phSay(ph) {
  if (!isNum(ph)) return null;
  const v = Number(ph);
  if (v < 3.5 || v > 9.5) return { word: "Check sensor", say: "This reading looks wrong.", tone: "muted" };
  if (v < 5.5) return { word: "Too sour", say: "Soil is acidic. Tomato likes 6 to 7.", tone: "warn" };
  if (v > 7.5) return { word: "Too alkaline", say: "Soil is alkaline. Tomato likes 6 to 7.", tone: "warn" };
  return { word: "Good", say: "Right for tomato.", tone: "primary" };
}

// EC ≈ how much dissolved salt / fertiliser is in the soil water.
export function ecSay(ec) {
  if (!isNum(ec)) return null;
  const v = Number(ec);
  if (v < 0.2) return { word: "Low food", say: "Little fertiliser in the soil.", tone: "warn" };
  if (v > 2.5) return { word: "Too salty", say: "Too much salt or fertiliser.", tone: "danger" };
  return { word: "Good", say: "Fertiliser level is fine.", tone: "primary" };
}

export function soilTempSay(t) {
  if (!isNum(t)) return null;
  const v = Number(t);
  if (v < 12) return { word: "Too cold", say: "Roots grow slowly.", tone: "info" };
  if (v > 32) return { word: "Too hot", say: "Roots get stressed.", tone: "danger" };
  return { word: "Good", say: "Comfortable for roots.", tone: "primary" };
}

// N / P / K in mg/kg from the 7-in-1 sensor.
const NUTRIENT_RANGE = { n: [50, 200], p: [15, 60], k: [80, 250] };
export function nutrientSay(kind, value) {
  if (!isNum(value)) return null;
  const v = Number(value);
  const [lo, hi] = NUTRIENT_RANGE[kind];
  // Position on a 0–1 bar where the "good" band sits in the middle third.
  const pos = v < lo ? (v / lo) / 3 : v > hi ? Math.min(1, 2 / 3 + ((v - hi) / hi) / 3) : 1 / 3 + ((v - lo) / (hi - lo)) / 3;
  if (v < lo) return { word: "Low", tone: "warn", pos };
  if (v > hi) return { word: "High", tone: "info", pos };
  return { word: "Good", tone: "primary", pos };
}

export function airTempSay(t) {
  if (!isNum(t)) return null;
  const v = Number(t);
  if (v < 10) return { word: "Cold", tone: "info" };
  if (v > 35) return { word: "Very hot", tone: "danger" };
  if (v > 30) return { word: "Hot", tone: "warn" };
  return { word: "Pleasant", tone: "primary" };
}

// High humidity is the big one for tomato: blight and other fungus spread.
export function humiditySay(h) {
  if (!isNum(h)) return null;
  const v = Number(h);
  if (v >= 85) return { word: "Fungus risk", tone: "danger" };
  if (v < 30) return { word: "Very dry air", tone: "warn" };
  return { word: "Normal", tone: "primary" };
}

export function rainSay(mm) {
  if (!isNum(mm)) return null;
  const v = Number(mm);
  if (v >= 10) return { word: "Heavy rain", tone: "water" };
  if (v > 0) return { word: "Some rain", tone: "water" };
  return { word: "No rain", tone: "muted" };
}
