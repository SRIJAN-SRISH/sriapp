// Home dashboard — live view of the linked farm.
// Sources: farm_profiles, sensor_records, irrigation_decisions, system_logs.

import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Banner,
  Card,
  EmptyState,
  Icon,
  IconBubble,
  LoadingBlock,
  MetricTile,
  MiniBars,
  MoistureGauge,
  SectionHeader,
  toneColors,
} from "../../components/srijan/ui";
import { TopInset } from "../../components/srijan/layout";
import { C, RADIUS } from "../../constants/colors";
import { CROP, DECISION_REASON, GROWTH_STAGE, healthFaults, lookup } from "../../constants/enums";
import { useAuth } from "../../context/AuthContext";
import { useLoader } from "../../hooks/useLoader";
import { countRecentAlerts, getDecisions, grossLitres } from "../../services/api/deviceService";
import { ENV_KEYS, getFarmProfile, getSensorRecords, hasAny } from "../../services/api/sensorService";
import { moistureModel, moistureStatus } from "../../utils/agronomy";
import { fmt, isNum, isRecent, rowTime, timeAgo } from "../../utils/format";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function phHint(ph) {
  if (!isNum(ph)) return undefined;
  if (ph < 5.5) return "Acidic";
  if (ph > 7.8) return "Alkaline";
  return "Good range";
}

async function loadDashboard(farmId) {
  const [farm, records, decisions, alerts] = await Promise.all([
    getFarmProfile(farmId),
    getSensorRecords(farmId, 60),
    getDecisions(farmId, 1),
    countRecentAlerts(farmId),
  ]);
  return { farm, records: records || [], decision: decisions?.[0] || null, alerts };
}

export default function DashboardScreen({ navigation }) {
  const { user, farmId } = useAuth();
  const { data, error, loading, refreshing, reload } = useLoader(() => loadDashboard(farmId), farmId, {
    pollMs: 60000,
  });

  const firstName = (user?.full_name || "Farmer").split(" ")[0];
  const records = data?.records || [];
  const latest = records[0];
  // Skip readings the firmware itself flagged as a soil-sensor fault (bit 0x01).
  const soilRow = records.find((r) => isNum(r.vwc_percent) && !((Number(r.health_flag) || 0) & 0x01));
  const envRow = records.find((r) => hasAny(r, ENV_KEYS));
  const lastSeen = rowTime(latest);
  const online = isRecent(lastSeen);
  const model = moistureModel(data?.farm);
  const mStatus = moistureStatus(soilRow?.vwc_percent, model);
  const trend = records
    .filter((r) => isNum(r.vwc_percent))
    .slice(0, 20)
    .map((r) => Number(r.vwc_percent))
    .reverse();
  const faults = healthFaults(latest?.health_flag);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopInset />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={reload}
            tintColor={C.white}
            colors={[C.primary]}
            progressBackgroundColor={C.white}
          />
        }
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <View style={s.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.hello}>{greeting()},</Text>
                <Text style={s.name} numberOfLines={1}>
                  {firstName}
                </Text>
              </View>
              <Pressable style={s.bell} onPress={() => navigation.navigate("Alerts")} hitSlop={6}>
                <Icon name="bell-outline" size={22} color={C.white} />
                {data?.alerts ? (
                  <View style={s.bellBadge}>
                    <Text style={s.bellBadgeTxt}>{data.alerts > 9 ? "9+" : data.alerts}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            <View style={s.farmChipRow}>
              <View style={s.farmChip}>
                <Icon name="barn" size={15} color={C.onDeep} />
                <Text style={s.farmChipTxt}>
                  {farmId}
                  {data?.farm?.field_id ? ` · ${data.farm.field_id}` : ""}
                </Text>
              </View>
              <View style={s.farmChip}>
                <View style={[s.liveDot, { backgroundColor: online ? "#4ADE80" : C.warn }]} />
                <Text style={s.farmChipTxt}>
                  {latest ? `${online ? "Live" : "Offline"} · ${timeAgo(lastSeen)}` : "No data yet"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.body}>
          {loading && !data ? (
            <Card>
              <LoadingBlock label="Loading your farm…" />
            </Card>
          ) : error && !data ? (
            <Banner title="Couldn't load farm data" message={error} action="Try again" onAction={reload} />
          ) : !latest ? (
            <Card>
              <EmptyState
                icon="access-point-network-off"
                title="Waiting for your device"
                message={`Your Farm ID is ${farmId}. Set this ID on your Node B device — as soon as it uploads its first reading, your soil, weather and irrigation data will appear here.`}
              >
                <View style={s.farmIdBox}>
                  <Text style={s.farmIdLbl}>YOUR FARM ID</Text>
                  <Text style={s.farmIdVal}>{farmId}</Text>
                </View>
              </EmptyState>
            </Card>
          ) : (
            <>
              {error ? (
                <Banner tone="warn" message={`Showing last loaded data. ${error}`} style={{ marginBottom: 12 }} />
              ) : null}

              <AdviceCard decision={data.decision} onPress={() => navigation.navigate("Irrigation")} />

              {faults.length > 0 ? (
                <Banner
                  tone="warn"
                  icon="alert-outline"
                  title="Sensor issues in latest reading"
                  message={faults.map((f) => `${f.node}: ${f.label}`).join("\n")}
                  action="View device status"
                  onAction={() => navigation.navigate("Device")}
                  style={{ marginTop: 12 }}
                />
              ) : null}

              {/* Soil moisture */}
              <SectionHeader
                title="Soil moisture"
                subtitle={soilRow ? `Node A · ${timeAgo(rowTime(soilRow))}` : "Node A"}
                action="History"
                onAction={() => navigation.navigate("Sensors")}
                style={{ marginTop: 22 }}
              />
              <Card>
                {soilRow ? (
                  <>
                    <View style={s.moistTop}>
                      <View>
                        <Text style={s.moistValue}>
                          {fmt(soilRow.vwc_percent)}
                          <Text style={s.moistUnit}> % VWC</Text>
                        </Text>
                        {mStatus ? <Badge label={mStatus.label} tone={mStatus.tone} icon={mStatus.icon} /> : null}
                      </View>
                      <IconBubble name="water-percent" tone="water" size={48} />
                    </View>
                    {model ? <MoistureGauge vwc={Number(soilRow.vwc_percent)} {...model} /> : null}
                    {trend.length > 1 ? (
                      <View style={{ marginTop: 6 }}>
                        <Text style={s.trendLbl}>Last {trend.length} readings</Text>
                        <MiniBars
                          values={trend}
                          color={C.water}
                          height={56}
                          refLines={model ? [{ label: "refill", value: model.refill, color: C.warn }] : []}
                        />
                      </View>
                    ) : null}
                  </>
                ) : (
                  <EmptyState
                    icon="water-off-outline"
                    title="No soil moisture reading"
                    message="Node A's soil sensor hasn't reported a moisture value yet."
                  />
                )}
              </Card>

              {/* Soil health */}
              <SectionHeader title="Soil health" subtitle="7-in-1 soil sensor" style={{ marginTop: 22 }} />
              <View style={s.grid}>
                <MetricTile icon="thermometer" tone="soil" label="Soil temp" value={fmt(soilRow?.soil_temp)} unit="°C" />
                <MetricTile icon="flask-outline" tone="info" label="pH" value={fmt(soilRow?.ph, 2)} hint={phHint(soilRow?.ph)} />
                <MetricTile icon="flash-outline" tone="warn" label="EC" value={fmt(soilRow?.ec, 2)} unit="mS/cm" />
              </View>
              <View style={[s.grid, { marginTop: 10 }]}>
                <Nutrient label="Nitrogen" short="N" value={soilRow?.nitrogen} color={C.nitrogen} />
                <Nutrient label="Phosphorus" short="P" value={soilRow?.phosphorus} color={C.phosphorus} />
                <Nutrient label="Potassium" short="K" value={soilRow?.potassium} color={C.potassium} />
              </View>

              {/* Weather */}
              <SectionHeader
                title="Weather at the field"
                subtitle={envRow ? `Node B · ${timeAgo(rowTime(envRow))}` : "Node B"}
                style={{ marginTop: 22 }}
              />
              <View style={s.weather}>
                <WeatherCell icon="thermometer" label="Air temp" value={fmt(envRow?.air_temp)} unit="°C" />
                <WeatherCell icon="water-outline" label="Humidity" value={fmt(envRow?.humidity, 0)} unit="%" />
                <WeatherCell icon="gauge" label="Pressure" value={fmt(envRow?.pressure, 0)} unit="hPa" />
                <WeatherCell icon="weather-pouring" label="Rain" value={fmt(envRow?.rainfall)} unit="mm" last />
              </View>

              {/* Farm */}
              {data.farm ? (
                <>
                  <SectionHeader
                    title="Farm profile"
                    action="Details"
                    onAction={() => navigation.navigate("FarmOverview")}
                    style={{ marginTop: 22 }}
                  />
                  <Card onPress={() => navigation.navigate("FarmOverview")}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <IconBubble name="sprout" size={46} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.farmName}>
                          {CROP[data.farm.crop_id] || "Crop"} · {GROWTH_STAGE[data.farm.growth_stage] || "Stage"}
                        </Text>
                        <Text style={s.farmMeta}>
                          {fmt(data.farm.field_area_m2, 0)} m² · root depth {fmt(data.farm.root_depth_m, 2)} m · zone{" "}
                          {data.farm.default_zone_id}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={24} color={C.textFaint} />
                    </View>
                  </Card>
                </>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function AdviceCard({ decision, onPress }) {
  if (!decision) {
    return (
      <Card onPress={onPress}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <IconBubble name="robot-outline" tone="muted" size={46} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.advTitle}>No irrigation decision yet</Text>
            <Text style={s.advSub}>{"The decision engine hasn't run for this farm."}</Text>
          </View>
        </View>
      </Card>
    );
  }

  const reason = lookup(DECISION_REASON, decision.decision_reason);
  const needs = decision.irrigation_required;
  const tone = needs ? "water" : reason.tone === "muted" ? "primary" : reason.tone;
  const [fg, bg] = toneColors(tone);
  const litres = grossLitres(decision);
  const stats = [
    { label: "Deficit", value: fmt(decision.deficit_mm), unit: "mm" },
    { label: "Allowed (RAW)", value: fmt(decision.raw_mm), unit: "mm" },
    { label: "VPD", value: fmt(decision.vpd_kpa, 2), unit: "kPa" },
  ];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.adv, { borderColor: fg + "40" }, pressed && { opacity: 0.9 }]}>
      <View style={[s.advTop, { backgroundColor: bg }]}>
        <View style={[s.advIcon, { backgroundColor: fg }]}>
          <Icon name={needs ? "water-pump" : "robot-happy-outline"} size={26} color={C.white} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.advKicker, { color: fg }]}>AI IRRIGATION ADVICE</Text>
          <Text style={s.advTitle}>
            {needs ? `Irrigate ${isNum(litres) ? fmt(litres, 0) + " L" : "now"}` : reason.label}
          </Text>
          <Text style={s.advSub} numberOfLines={2}>
            {needs ? reason.label : reason.detail || "No irrigation needed right now."}
          </Text>
        </View>
      </View>
      <View style={s.advStats}>
        {stats.map((st, i) => (
          <View key={st.label} style={[s.advStat, i > 0 && s.advStatBorder]}>
            <Text style={s.advStatVal}>
              {st.value}
              {st.value !== "—" ? <Text style={s.advStatUnit}> {st.unit}</Text> : null}
            </Text>
            <Text style={s.advStatLbl}>{st.label}</Text>
          </View>
        ))}
      </View>
      <View style={s.advFoot}>
        <Text style={s.advTime}>Decided {timeAgo(rowTime(decision))}</Text>
        <Text style={[s.advLink, { color: fg }]}>See history ›</Text>
      </View>
    </Pressable>
  );
}

function Nutrient({ label, short, value, color }) {
  return (
    <View style={s.nutrient}>
      <View style={[s.nutrientBadge, { backgroundColor: color + "18" }]}>
        <Text style={[s.nutrientShort, { color }]}>{short}</Text>
      </View>
      <Text style={s.nutrientLbl}>{label}</Text>
      <Text style={s.nutrientVal}>
        {fmt(value, 0)}
        {isNum(value) ? <Text style={s.nutrientUnit}> mg/kg</Text> : null}
      </Text>
    </View>
  );
}

function WeatherCell({ icon, label, value, unit, last }) {
  return (
    <View style={[s.wCell, !last && s.wCellBorder]}>
      <Icon name={icon} size={22} color={C.onDeep} />
      <Text style={s.wVal}>
        {value}
        {value !== "—" ? <Text style={s.wUnit}>{unit}</Text> : null}
      </Text>
      <Text style={s.wLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.deep,
    paddingHorizontal: 18,
    paddingBottom: 50,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headRow: { flexDirection: "row", alignItems: "center", paddingTop: 10 },
  hello: { color: C.onDeep, fontSize: 14, fontWeight: "600" },
  name: { color: C.white, fontSize: 28, fontWeight: "900", letterSpacing: -0.6 },
  bell: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: C.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: C.deep,
  },
  bellBadgeTxt: { color: C.white, fontSize: 9.5, fontWeight: "900" },
  farmChipRow: { flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" },
  farmChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  farmChipTxt: { color: C.white, fontSize: 12.5, fontWeight: "700" },
  liveDot: { width: 8, height: 8, borderRadius: 4 },

  body: { paddingHorizontal: 16, marginTop: -34 },
  farmIdBox: {
    marginTop: 16,
    backgroundColor: C.primarySoft,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  farmIdLbl: { fontSize: 10.5, fontWeight: "900", color: C.primary, letterSpacing: 1 },
  farmIdVal: { fontSize: 24, fontWeight: "900", color: C.primaryDark, marginTop: 2, letterSpacing: 0.5 },

  adv: {
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: C.deep,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  advTop: { flexDirection: "row", alignItems: "center", padding: 16 },
  advIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  advKicker: { fontSize: 10.5, fontWeight: "900", letterSpacing: 1 },
  advTitle: { fontSize: 19, fontWeight: "900", color: C.text, marginTop: 2, letterSpacing: -0.3 },
  advSub: { fontSize: 13, color: C.textMuted, marginTop: 2, lineHeight: 18 },
  advStats: { flexDirection: "row", paddingVertical: 12 },
  advStat: { flex: 1, alignItems: "center" },
  advStatBorder: { borderLeftWidth: 1, borderLeftColor: C.divider },
  advStatVal: { fontSize: 16, fontWeight: "800", color: C.text },
  advStatUnit: { fontSize: 11, color: C.textFaint, fontWeight: "600" },
  advStatLbl: { fontSize: 11, color: C.textFaint, marginTop: 2, fontWeight: "600" },
  advFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  advTime: { fontSize: 12, color: C.textFaint },
  advLink: { fontSize: 12.5, fontWeight: "800" },

  moistTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  moistValue: { fontSize: 38, fontWeight: "900", color: C.text, letterSpacing: -1, marginBottom: 6 },
  moistUnit: { fontSize: 15, fontWeight: "700", color: C.textFaint, letterSpacing: 0 },
  trendLbl: { fontSize: 11.5, color: C.textFaint, fontWeight: "600", marginBottom: 6 },

  grid: { flexDirection: "row", gap: 10 },
  nutrient: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  nutrientBadge: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  nutrientShort: { fontSize: 17, fontWeight: "900" },
  nutrientLbl: { fontSize: 11.5, color: C.textMuted, fontWeight: "600", marginTop: 8 },
  nutrientVal: { fontSize: 19, fontWeight: "800", color: C.text, marginTop: 1 },
  nutrientUnit: { fontSize: 10.5, color: C.textFaint, fontWeight: "600" },

  weather: {
    flexDirection: "row",
    backgroundColor: C.primaryDark,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
  },
  wCell: { flex: 1, alignItems: "center" },
  wCellBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.12)" },
  wVal: { color: C.white, fontSize: 16, fontWeight: "800", marginTop: 6 },
  wUnit: { fontSize: 11, color: C.onDeep, fontWeight: "600" },
  wLbl: { color: C.onDeep, fontSize: 11, fontWeight: "600", marginTop: 2 },

  farmName: { fontSize: 16, fontWeight: "800", color: C.text },
  farmMeta: { fontSize: 12.5, color: C.textMuted, marginTop: 3 },
});
