// Farm + telemetry reads: farm_profiles, sensor_records.

import { supabase } from "../../config/supabase";

function check({ data, error }) {
  if (error) {
    const msg = error.message || "";
    if (msg.includes("Network request failed") || msg.includes("fetch")) {
      throw new Error("Can't reach the server. Check your internet connection.");
    }
    throw new Error(msg || "Could not load data.");
  }
  return data;
}

export async function getFarmProfile(farmId) {
  return check(
    await supabase.from("farm_profiles").select("*").eq("farm_id", farmId).maybeSingle(),
  );
}

// Newest first. Ordered by id (upload order), because timestamp_epoch is 0
// whenever Node B's RTC wasn't synced.
export async function getSensorRecords(farmId, limit = 50) {
  return check(
    await supabase
      .from("sensor_records")
      .select("*")
      .eq("farm_id", farmId)
      .order("id", { ascending: false })
      .limit(limit),
  );
}

export const SOIL_KEYS = ["vwc_percent", "soil_temp", "ec", "ph", "nitrogen", "phosphorus", "potassium"];
export const ENV_KEYS = ["air_temp", "humidity", "pressure", "rainfall"];

export function hasAny(row, keys) {
  return !!row && keys.some((k) => row[k] !== null && row[k] !== undefined);
}
