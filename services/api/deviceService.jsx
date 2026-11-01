// Decision engine, pump, node and log reads:
// irrigation_decisions, irrigation_events, node_health, system_logs.

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

// The schema names this column gross_required_l; some deployed databases have
// it as gross_required_1. Read whichever exists.
export function grossLitres(decision) {
  if (!decision) return null;
  return decision.gross_required_l ?? decision.gross_required_1 ?? null;
}

export async function getDecisions(farmId, limit = 30) {
  return check(
    await supabase
      .from("irrigation_decisions")
      .select("*")
      .eq("farm_id", farmId)
      .order("id", { ascending: false })
      .limit(limit),
  );
}

export async function getIrrigationEvents(farmId, limit = 30) {
  return check(
    await supabase
      .from("irrigation_events")
      .select("*")
      .eq("farm_id", farmId)
      .order("id", { ascending: false })
      .limit(limit),
  );
}

// node_health has one row per ping; keep the newest row per node.
export async function getNodeHealth(farmId) {
  const rows = check(
    await supabase
      .from("node_health")
      .select("*")
      .or(`farm_id.eq.${farmId},farm_id.is.null`)
      .order("last_seen", { ascending: false })
      .limit(200),
  );
  const latest = new Map();
  for (const r of rows || []) if (!latest.has(r.node_id)) latest.set(r.node_id, r);
  return [...latest.values()].sort((a, b) => a.node_id.localeCompare(b.node_id));
}

export async function getNodeHealthHistory(nodeId, limit = 50) {
  return check(
    await supabase
      .from("node_health")
      .select("*")
      .eq("node_id", nodeId)
      .order("last_seen", { ascending: false })
      .limit(limit),
  );
}

export async function getSystemLogs(farmId, { minSeverity = 1, limit = 60 } = {}) {
  return check(
    await supabase
      .from("system_logs")
      .select("*")
      .eq("farm_id", farmId)
      .gte("severity", minSeverity)
      .order("id", { ascending: false })
      .limit(limit),
  );
}

// Count of critical+ logs uploaded in the last `hours` hours (for the alert badge).
export async function countRecentAlerts(farmId, hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const { count, error } = await supabase
    .from("system_logs")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .gte("severity", 3)
    .gte("uploaded_at", since);
  if (error) return 0;
  return count || 0;
}
