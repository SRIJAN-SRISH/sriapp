// Irrigation — decision engine audit trail (irrigation_decisions) and
// pump execution records (irrigation_events).

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/srijan/layout";
import {
  Badge,
  Banner,
  Card,
  EmptyState,
  Icon,
  LoadingBlock,
  Segmented,
  toneColors,
} from "../../components/srijan/ui";
import { C, RADIUS } from "../../constants/colors";
import { DECISION_REASON, IRRIGATION_STATUS, lookup } from "../../constants/enums";
import { useAuth } from "../../context/AuthContext";
import { useLoader } from "../../hooks/useLoader";
import { getDecisions, getIrrigationEvents, grossLitres } from "../../services/api/deviceService";
import { fmt, formatDateTime, isNum, rowTime, timeAgo } from "../../utils/format";

async function load(farmId) {
  const [decisions, events] = await Promise.all([getDecisions(farmId, 40), getIrrigationEvents(farmId, 40)]);
  return { decisions: decisions || [], events: events || [] };
}

export default function IrrigationScreen() {
  const { farmId } = useAuth();
  const [tab, setTab] = useState("decisions");
  const { data, error, loading, refreshing, reload } = useLoader(() => load(farmId), farmId, { pollMs: 60000 });

  const decisions = data?.decisions || [];
  const events = data?.events || [];
  const triggered = decisions.filter((d) => d.irrigation_required).length;
  const delivered = events.reduce((a, e) => a + (Number(e.delivered_volume_l) || 0), 0);

  return (
    <Screen title="Watering" subtitle="When water was needed and given" refreshing={refreshing} onRefresh={reload}>
      <View style={s.summary}>
        <Summary icon="robot-outline" tone="primary" value={decisions.length} label="Decisions" />
        <Summary icon="water-pump" tone="water" value={triggered} label="Irrigate calls" />
        <Summary icon="water" tone="water" value={`${fmt(delivered, 0)} L`} label="Water delivered" />
      </View>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "decisions", label: `Decisions (${decisions.length})` },
          { value: "events", label: `Pump runs (${events.length})` },
        ]}
        style={{ marginBottom: 14 }}
      />

      {loading && !data ? (
        <LoadingBlock />
      ) : error && !data ? (
        <Banner title="Couldn't load irrigation data" message={error} action="Try again" onAction={reload} />
      ) : tab === "decisions" ? (
        decisions.length === 0 ? (
          <Card>
            <EmptyState icon="robot-outline" title="No decisions yet" message="Node B's decision engine hasn't uploaded any results." />
          </Card>
        ) : (
          decisions.map((d) => <DecisionCard key={d.id} d={d} />)
        )
      ) : events.length === 0 ? (
        <Card>
          <EmptyState
            icon="water-pump-off"
            title="No pump runs recorded"
            message="When Node C runs the pump, the ordered vs. delivered water will show here."
          />
        </Card>
      ) : (
        events.map((e) => <EventCard key={e.id} e={e} />)
      )}
    </Screen>
  );
}

function Summary({ icon, tone, value, label }) {
  const [fg, bg] = toneColors(tone);
  return (
    <View style={[s.sumCard, { backgroundColor: bg }]}>
      <Icon name={icon} size={20} color={fg} />
      <Text style={[s.sumVal, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={s.sumLbl}>{label}</Text>
    </View>
  );
}

function DecisionCard({ d }) {
  const reason = lookup(DECISION_REASON, d.decision_reason);
  const status = lookup(IRRIGATION_STATUS, d.status_flag);
  const needs = d.irrigation_required;
  const tone = needs ? "water" : reason.tone === "muted" ? "primary" : reason.tone;
  const [fg] = toneColors(tone);
  const litres = grossLitres(d);
  const t = rowTime(d);

  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={s.cardHead}>
        <View style={[s.dot, { backgroundColor: fg }]} />
        <Text style={s.cardTime}>
          {formatDateTime(t)} · {timeAgo(t)}
        </Text>
      </View>
      <Text style={s.cardTitle}>{needs ? `Irrigate ${isNum(litres) ? fmt(litres, 0) + " L" : ""}` : reason.label}</Text>
      {reason.detail ? <Text style={s.cardDetail}>{needs ? reason.label : reason.detail}</Text> : null}
      <View style={s.badges}>
        <Badge label={needs ? "Irrigation required" : "No irrigation"} tone={needs ? "water" : "muted"} />
        <Badge label={status.label} tone={status.tone} />
      </View>
      <View style={s.grid}>
        <Cell label="Total available" value={fmt(d.taw_mm)} unit="mm" />
        <Cell label="Readily available" value={fmt(d.raw_mm)} unit="mm" />
        <Cell label="Deficit" value={fmt(d.deficit_mm)} unit="mm" />
        <Cell label="Net needed" value={fmt(d.net_required_mm)} unit="mm" />
        <Cell label="Gross volume" value={fmt(litres, 0)} unit="L" />
        <Cell label="VPD" value={fmt(d.vpd_kpa, 2)} unit="kPa" />
      </View>
      <Text style={s.idTxt}>
        {d.decision_id} · from {d.record_id}
      </Text>
    </Card>
  );
}

function EventCard({ e }) {
  const status = lookup(IRRIGATION_STATUS, e.status_flag);
  const target = Number(e.target_volume_l) || 0;
  const delivered = Number(e.delivered_volume_l);
  const pct = target > 0 && isNum(e.delivered_volume_l) ? Math.min(100, (delivered / target) * 100) : null;
  const t = rowTime(e, "executed_at");

  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={s.cardHead}>
        <Icon name="water-pump" size={16} color={C.water} />
        <Text style={[s.cardTime, { marginLeft: 6 }]}>
          {formatDateTime(t)} · Zone {e.zone_id}
        </Text>
      </View>
      <View style={s.volRow}>
        <Text style={s.cardTitle}>
          {fmt(e.delivered_volume_l, 0)}
          <Text style={s.volOf}> / {fmt(e.target_volume_l, 0)} L delivered</Text>
        </Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {pct !== null ? (
        <View style={s.bar}>
          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: pct >= 90 ? C.primary : C.warn }]} />
        </View>
      ) : null}
      <View style={s.grid}>
        <Cell label="Flow rate" value={fmt(e.flow_rate_lpm)} unit="L/min" />
        <Cell label="Run time" value={isNum(e.runtime_sec) ? fmt(e.runtime_sec / 60) : "—"} unit="min" />
        <Cell label="Max run time" value={isNum(e.max_runtime_sec) ? fmt(e.max_runtime_sec / 60) : "—"} unit="min" />
        <Cell label="Moisture before" value={fmt(e.moisture_before)} unit="%" />
        <Cell label="Moisture after" value={fmt(e.moisture_after)} unit="%" />
        <Cell label="Node C battery" value={fmt(e.battery_voltage, 2)} unit="V" />
      </View>
      <Text style={s.idTxt}>
        {e.event_id} · cmd {e.command_id}
      </Text>
    </Card>
  );
}

function Cell({ label, value, unit }) {
  return (
    <View style={s.cell}>
      <Text style={s.cellVal}>
        {value}
        {value !== "—" ? <Text style={s.cellUnit}> {unit}</Text> : null}
      </Text>
      <Text style={s.cellLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  summary: { flexDirection: "row", gap: 10, marginBottom: 14 },
  sumCard: { flex: 1, borderRadius: RADIUS.md, padding: 12 },
  sumVal: { fontSize: 19, fontWeight: "900", marginTop: 6 },
  sumLbl: { fontSize: 11, color: C.textMuted, fontWeight: "600", marginTop: 1 },
  cardHead: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  cardTime: { fontSize: 12, color: C.textFaint, fontWeight: "600" },
  cardTitle: { fontSize: 18, fontWeight: "900", color: C.text, letterSpacing: -0.3 },
  cardDetail: { fontSize: 13, color: C.textMuted, marginTop: 3, lineHeight: 18 },
  badges: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    backgroundColor: C.bg,
    borderRadius: RADIUS.sm,
    paddingVertical: 4,
  },
  cell: { width: "33.33%", paddingVertical: 8, paddingHorizontal: 10 },
  cellVal: { fontSize: 14.5, fontWeight: "800", color: C.text },
  cellUnit: { fontSize: 10.5, color: C.textFaint, fontWeight: "600" },
  cellLbl: { fontSize: 10.5, color: C.textFaint, fontWeight: "600", marginTop: 1 },
  idTxt: { fontSize: 10.5, color: C.textFaint, marginTop: 10 },
  volRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  volOf: { fontSize: 13, fontWeight: "600", color: C.textMuted, letterSpacing: 0 },
  bar: { height: 8, borderRadius: 4, backgroundColor: C.divider, marginTop: 10, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
});
