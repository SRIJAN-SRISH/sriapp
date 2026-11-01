// Sensor history — trends and raw readings from sensor_records.

import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/srijan/layout";
import { Badge, Banner, Card, Chip, EmptyState, Icon, LoadingBlock, MiniBars, SectionHeader } from "../../components/srijan/ui";
import { C } from "../../constants/colors";
import { healthFaults } from "../../constants/enums";
import { useAuth } from "../../context/AuthContext";
import { useLoader } from "../../hooks/useLoader";
import { getFarmProfile, getSensorRecords } from "../../services/api/sensorService";
import { moistureModel } from "../../utils/agronomy";
import { fmt, formatDateTime, isNum, rowTime, timeAgo } from "../../utils/format";

const METRICS = [
  { key: "vwc_percent", label: "Moisture", unit: "%", icon: "water-percent", color: C.water, digits: 1 },
  { key: "soil_temp", label: "Soil temp", unit: "°C", icon: "thermometer", color: C.soil, digits: 1 },
  { key: "ph", label: "pH", unit: "", icon: "flask-outline", color: C.info, digits: 2 },
  { key: "ec", label: "EC", unit: "mS/cm", icon: "flash-outline", color: C.warn, digits: 2 },
  { key: "nitrogen", label: "Nitrogen", unit: "mg/kg", icon: "alpha-n-circle-outline", color: C.nitrogen, digits: 0 },
  { key: "phosphorus", label: "Phosphorus", unit: "mg/kg", icon: "alpha-p-circle-outline", color: C.phosphorus, digits: 0 },
  { key: "potassium", label: "Potassium", unit: "mg/kg", icon: "alpha-k-circle-outline", color: C.potassium, digits: 0 },
  { key: "air_temp", label: "Air temp", unit: "°C", icon: "thermometer-lines", color: C.primary, digits: 1 },
  { key: "humidity", label: "Humidity", unit: "%", icon: "water-outline", color: C.water, digits: 0 },
  { key: "pressure", label: "Pressure", unit: "hPa", icon: "gauge", color: C.info, digits: 0 },
  { key: "rainfall", label: "Rainfall", unit: "mm", icon: "weather-pouring", color: C.water, digits: 1 },
];

async function load(farmId) {
  const [records, farm] = await Promise.all([getSensorRecords(farmId, 100), getFarmProfile(farmId)]);
  return { records: records || [], farm };
}

export default function SensorDataScreen() {
  const { farmId } = useAuth();
  const [metricKey, setMetricKey] = useState("vwc_percent");
  const { data, error, loading, refreshing, reload } = useLoader(() => load(farmId), farmId, { pollMs: 60000 });

  const metric = METRICS.find((m) => m.key === metricKey);
  const records = data?.records || [];
  const series = records
    .filter((r) => isNum(r[metricKey]))
    .slice(0, 40)
    .reverse();
  const values = series.map((r) => Number(r[metricKey]));
  const stats = values.length
    ? {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        last: values[values.length - 1],
      }
    : null;
  const model = metricKey === "vwc_percent" ? moistureModel(data?.farm) : null;

  return (
    <Screen
      title="Sensors"
      subtitle={`${farmId} · ${records.length} recent readings`}
      refreshing={refreshing}
      onRefresh={reload}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {METRICS.map((m) => (
          <Chip key={m.key} label={m.label} icon={m.icon} active={m.key === metricKey} onPress={() => setMetricKey(m.key)} />
        ))}
      </ScrollView>

      {loading && !data ? (
        <LoadingBlock label="Loading readings…" />
      ) : error && !data ? (
        <Banner title="Couldn't load readings" message={error} action="Try again" onAction={reload} />
      ) : (
        <>
          <Card>
            <View style={s.chartHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.chartLabel}>{metric.label}</Text>
                <Text style={s.chartValue}>
                  {stats ? fmt(stats.last, metric.digits) : "—"}
                  {stats && metric.unit ? <Text style={s.chartUnit}> {metric.unit}</Text> : null}
                </Text>
                <Text style={s.chartTime}>
                  {series.length ? `Latest ${timeAgo(rowTime(series[series.length - 1]))}` : "No values recorded"}
                </Text>
              </View>
              <View style={[s.chartIcon, { backgroundColor: metric.color + "1A" }]}>
                <Icon name={metric.icon} size={26} color={metric.color} />
              </View>
            </View>

            {values.length > 0 ? (
              <>
                <MiniBars
                  values={values}
                  color={metric.color}
                  height={120}
                  refLines={
                    model
                      ? [
                          { label: "fc", value: model.fc, color: C.water },
                          { label: "refill", value: model.refill, color: C.warn },
                        ]
                      : []
                  }
                />
                <View style={s.axis}>
                  <Text style={s.axisTxt}>Older</Text>
                  {model ? (
                    <Text style={s.axisTxt}>
                      <Text style={{ color: C.water }}>– – capacity</Text>
                      {"   "}
                      <Text style={{ color: C.warn }}>– – refill point</Text>
                    </Text>
                  ) : null}
                  <Text style={s.axisTxt}>Latest</Text>
                </View>
                <View style={s.statRow}>
                  {[
                    ["Min", stats.min],
                    ["Average", stats.avg],
                    ["Max", stats.max],
                  ].map(([lbl, v]) => (
                    <View key={lbl} style={s.stat}>
                      <Text style={s.statVal}>{fmt(v, metric.digits)}</Text>
                      <Text style={s.statLbl}>{lbl}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <EmptyState
                icon="chart-bar"
                title={`No ${metric.label.toLowerCase()} data`}
                message="This sensor hasn't reported a value in the recent readings."
              />
            )}
          </Card>

          <SectionHeader title="Recent readings" subtitle="Newest first" style={{ marginTop: 22 }} />
          {records.length === 0 ? (
            <Card>
              <EmptyState icon="access-point-network-off" title="No readings yet" message="Node B hasn't uploaded any records." />
            </Card>
          ) : (
            <Card padded={false}>
              {records.slice(0, 30).map((r, i) => (
                <ReadingRow key={r.id} r={r} last={i === Math.min(records.length, 30) - 1} />
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function ReadingRow({ r, last }) {
  const faults = healthFaults(r.health_flag);
  const t = rowTime(r);
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <View style={s.rowHead}>
        <Text style={s.rowTime}>{formatDateTime(t)}</Text>
        {faults.length ? (
          <Badge label={`${faults.length} fault${faults.length > 1 ? "s" : ""}`} tone="warn" icon="alert-outline" />
        ) : (
          <Badge label="Healthy" tone="primary" icon="check" />
        )}
      </View>
      <View style={s.rowVals}>
        <Val icon="water-percent" v={fmt(r.vwc_percent)} u="%" />
        <Val icon="thermometer" v={fmt(r.soil_temp)} u="°C" />
        <Val icon="flask-outline" v={fmt(r.ph, 1)} u="pH" />
        <Val icon="thermometer-lines" v={fmt(r.air_temp)} u="°C" />
        <Val icon="weather-pouring" v={fmt(r.rainfall)} u="mm" />
      </View>
      {r.timestamp_valid ? null : <Text style={s.rowNote}>Clock not synced · time is upload time</Text>}
    </View>
  );
}

function Val({ icon, v, u }) {
  return (
    <View style={s.val}>
      <Icon name={icon} size={14} color={C.textFaint} />
      <Text style={s.valTxt}>
        {v}
        {v !== "—" ? <Text style={s.valUnit}> {u}</Text> : null}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  chips: { gap: 8, paddingBottom: 14, paddingRight: 16 },
  chartHead: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  chartLabel: { fontSize: 13, color: C.textMuted, fontWeight: "700" },
  chartValue: { fontSize: 34, fontWeight: "900", color: C.text, letterSpacing: -1 },
  chartUnit: { fontSize: 14, color: C.textFaint, fontWeight: "700", letterSpacing: 0 },
  chartTime: { fontSize: 12, color: C.textFaint },
  chartIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  axisTxt: { fontSize: 10.5, color: C.textFaint, fontWeight: "600" },
  statRow: { flexDirection: "row", marginTop: 14, borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 12 },
  stat: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 16, fontWeight: "800", color: C.text },
  statLbl: { fontSize: 11, color: C.textFaint, fontWeight: "600", marginTop: 2 },
  row: { paddingHorizontal: 16, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  rowTime: { fontSize: 13.5, fontWeight: "700", color: C.text },
  rowVals: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  val: { flexDirection: "row", alignItems: "center", gap: 3 },
  valTxt: { fontSize: 13, color: C.text, fontWeight: "700" },
  valUnit: { fontSize: 10.5, color: C.textFaint, fontWeight: "600" },
  rowNote: { fontSize: 10.5, color: C.textFaint, marginTop: 6 },
});
