// Home dashboard — live view of the linked farm, written for farmers who don't
// know the sensors: every number comes with a plain word ("Just right",
// "Too sour") and a colour, and the top of the screen says what to do today.
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
  MiniBars,
  SectionHeader,
  toneColors,
} from "../../components/srijan/ui";
import { TopInset } from "../../components/srijan/layout";
import { C, RADIUS, SHADOW } from "../../constants/colors";
import { CROP, DECISION_REASON, GROWTH_STAGE, healthFaults, lookup } from "../../constants/enums";
import { useAuth } from "../../context/AuthContext";
import { useLoader } from "../../hooks/useLoader";
import { countRecentAlerts, getDecisions, grossLitres } from "../../services/api/deviceService";
import { ENV_KEYS, getFarmProfile, getSensorRecords, hasAny } from "../../services/api/sensorService";
import {
  airTempSay,
  ecSay,
  humiditySay,
  moistureModel,
  nutrientSay,
  phSay,
  rainSay,
  soilTempSay,
  soilWaterSay,
  trendSay,
} from "../../utils/agronomy";
import { fmt, isNum, isRecent, rowTime, timeAgo } from "../../utils/format";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Why the system decided what it did, in everyday words.
const PLAIN_REASON = {
  0x00: "Soil has enough water.",
  0x01: "The soil has dried out — time to water.",
  0x10: "It rained recently, so watering is paused.",
  0x11: "The pump's battery is low.",
  0x12: "A sensor isn't working, so the system is waiting.",
  0x13: "The devices can't talk to each other properly.",
  0x15: "Watering was controlled by hand.",
  0x17: "Today's water limit is already used.",
  0x18: "Waiting for the last watering to soak in.",
  0x19: "Only a tiny amount is needed — not worth running the pump.",
};

async function loadDashboard(farmId) {
  const [farm, records, decisions, alerts] = await Promise.all([
    getFarmProfile(farmId),
    getSensorRecords(farmId, 60),
    getDecisions(farmId, 1),
    countRecentAlerts(farmId),
  ]);
  return { farm, records: records || [], decision: decisions?.[0] || null, alerts };
}

// One headline for the whole field, most urgent first.
function overallStatus({ online, lastSeen, water, decision, faults, soilIssues, humid }) {
  if (!online)
    return {
      tone: "warn",
      icon: "access-point-network-off",
      title: "No new readings",
      say: `Device last sent data ${timeAgo(lastSeen)}. Check its power and signal.`,
    };
  if (water?.key === "dry")
    return { tone: "danger", icon: "water-alert", title: "Your field needs water now", say: "The soil is very dry." };
  if (decision?.irrigation_required)
    return { tone: "water", icon: "water-pump", title: "Water your field today", say: "The system recommends watering." };
  if (water?.key === "low")
    return { tone: "warn", icon: "water-minus", title: "Field is getting dry", say: "Plan to water soon." };
  if (faults.length)
    return { tone: "warn", icon: "tools", title: "A sensor needs checking", say: "Some readings may be wrong." };
  if (humid?.word === "Fungus risk")
    return { tone: "warn", icon: "mushroom-outline", title: "High fungus risk today", say: "Air is very humid. Check leaves for spots." };
  if (soilIssues.length)
    return {
      tone: "warn",
      icon: "sprout-outline",
      title: "Field is okay",
      say: `${soilIssues.length} thing${soilIssues.length > 1 ? "s" : ""} to look at in the soil.`,
    };
  return { tone: "primary", icon: "check-decagram", title: "Your field is healthy", say: "Nothing to do right now." };
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
  const water = soilWaterSay(soilRow?.vwc_percent, model);
  const trendValues = records
    .filter((r) => isNum(r.vwc_percent))
    .slice(0, 20)
    .map((r) => Number(r.vwc_percent))
    .reverse();
  const trend = trendSay(trendValues);
  const faults = healthFaults(latest?.health_flag);

  const ph = phSay(soilRow?.ph);
  const ec = ecSay(soilRow?.ec);
  const sTemp = soilTempSay(soilRow?.soil_temp);
  const n = nutrientSay("n", soilRow?.nitrogen);
  const p = nutrientSay("p", soilRow?.phosphorus);
  const k = nutrientSay("k", soilRow?.potassium);
  const soilIssues = [
    ph && ph.tone !== "primary" && ph.tone !== "muted" ? `Soil ${ph.word.toLowerCase()}` : null,
    ec && ec.tone !== "primary" ? ec.word : null,
    sTemp && sTemp.tone !== "primary" ? `Soil ${sTemp.word.toLowerCase()}` : null,
    n && n.word !== "Good" ? `${n.word} nitrogen` : null,
    p && p.word !== "Good" ? `${p.word} phosphorus` : null,
    k && k.word !== "Good" ? `${k.word} potassium` : null,
  ].filter(Boolean);

  const air = airTempSay(envRow?.air_temp);
  const humid = humiditySay(envRow?.humidity);
  const rain = rainSay(envRow?.rainfall);
  const weatherNote =
    humid?.word === "Fungus risk" ? humid : air && air.tone !== "primary" ? air : rain?.tone === "water" ? rain : null;

  const status = latest
    ? overallStatus({ online, lastSeen, water, decision: data?.decision, faults, soilIssues, humid })
    : null;

  const askSrish = (q) => navigation.navigate("Assistant", { prefill: q, nonce: Date.now() });

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
                message={`Your Farm ID is ${farmId}. Set this ID on your Node B device — as soon as it uploads its first reading, your soil, weather and watering advice will appear here.`}
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

              {/* ── Field status in one line ── */}
              <StatusCard status={status} />

              {/* ── What to do today ── */}
              <TodayCard
                decision={data.decision}
                water={water}
                onHistory={() => navigation.navigate("Irrigation")}
                onAsk={() => askSrish("Aaj mere khet mein kya karna chahiye?")}
              />

              {/* ── Quick field check ── */}
              <SectionHeader title="Field check" subtitle="Tap any row to see more" style={{ marginTop: 22 }} />
              <Card padded={false}>
                <CheckRow
                  icon="water-outline"
                  label="Water in soil"
                  word={water?.word || "No reading"}
                  tone={water?.tone || "muted"}
                  onPress={() => navigation.navigate("Sensors")}
                />
                <CheckRow
                  icon="sprout-outline"
                  label="Soil health"
                  word={!soilRow ? "No reading" : soilIssues.length ? `${soilIssues.length} to check` : "All good"}
                  tone={!soilRow ? "muted" : soilIssues.length ? "warn" : "primary"}
                  detail={soilIssues.length ? soilIssues.join(" · ") : null}
                  onPress={() => navigation.navigate("Sensors")}
                />
                <CheckRow
                  icon="weather-partly-cloudy"
                  label="Weather"
                  word={!envRow ? "No reading" : weatherNote?.word || "Normal"}
                  tone={!envRow ? "muted" : weatherNote?.tone || "primary"}
                />
                <CheckRow
                  icon="router-wireless"
                  label="Devices"
                  word={faults.length ? `${faults.length} problem${faults.length > 1 ? "s" : ""}` : online ? "Working" : "Not sending"}
                  tone={faults.length || !online ? "warn" : "primary"}
                  detail={faults.length ? faults.map((f) => f.label).join(" · ") : null}
                  onPress={() => navigation.navigate("Device")}
                  last
                />
              </Card>

              {/* ── Water in the soil ── */}
              <SectionHeader
                title="Water in the soil"
                subtitle={soilRow ? `Measured ${timeAgo(rowTime(soilRow))}` : undefined}
                action="History"
                onAction={() => navigation.navigate("Sensors")}
                style={{ marginTop: 22 }}
              />
              <Card>
                {soilRow ? (
                  <>
                    <View style={s.waterTop}>
                      <IconBubble name={water?.icon || "water-percent"} tone={water?.tone || "water"} size={52} />
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[s.waterWord, { color: toneColors(water?.tone || "muted")[0] }]}>
                          {water?.word || `${fmt(soilRow.vwc_percent)}%`}
                        </Text>
                        {water ? <Text style={s.waterHi}>{water.hi}</Text> : null}
                        <Text style={s.waterSay}>{water?.say || "Farm profile is missing soil limits."}</Text>
                      </View>
                    </View>
                    {model ? <WaterMeter vwc={Number(soilRow.vwc_percent)} model={model} /> : null}
                    <View style={s.waterFoot}>
                      <Text style={s.waterNum}>
                        {fmt(soilRow.vwc_percent)}% water in soil
                      </Text>
                      {trend ? (
                        <View style={s.trend}>
                          <Icon name={trend.icon} size={16} color={C.textMuted} />
                          <Text style={s.trendTxt}>{trend.word}</Text>
                        </View>
                      ) : null}
                    </View>
                    {trendValues.length > 1 ? (
                      <View style={{ marginTop: 10 }}>
                        <MiniBars
                          values={trendValues}
                          color={C.water}
                          height={44}
                          refLines={model ? [{ label: "refill", value: model.refill, color: C.warn }] : []}
                        />
                        <Text style={s.trendLbl}>Last {trendValues.length} readings · dotted line = time to water</Text>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <EmptyState
                    icon="water-off-outline"
                    title="No soil water reading"
                    message="The field sensor hasn't sent a moisture reading yet."
                  />
                )}
              </Card>

              {/* ── Soil health ── */}
              <SectionHeader title="Soil health" subtitle="Is the soil good for tomato?" style={{ marginTop: 22 }} />
              <View style={s.grid}>
                <SoilTile icon="flask-outline" label="Sourness (pH)" say={ph} value={fmt(soilRow?.ph, 1)} />
                <SoilTile icon="shaker-outline" label="Fertiliser (EC)" say={ec} value={fmt(soilRow?.ec, 2)} unit="mS/cm" />
                <SoilTile icon="thermometer" label="Soil warmth" say={sTemp} value={fmt(soilRow?.soil_temp)} unit="°C" />
              </View>
              <Card style={{ marginTop: 10 }}>
                <Text style={s.nutHead}>Plant food (N · P · K)</Text>
                <NutrientRow short="N" name="Nitrogen" job="Green leaves & growth" value={soilRow?.nitrogen} say={n} color={C.nitrogen} />
                <NutrientRow short="P" name="Phosphorus" job="Roots & flowers" value={soilRow?.phosphorus} say={p} color={C.phosphorus} />
                <NutrientRow short="K" name="Potassium" job="Fruit size & taste" value={soilRow?.potassium} say={k} color={C.potassium} last />
                {soilIssues.length ? (
                  <Pressable
                    onPress={() => askSrish(`Mere khet mein ${soilIssues.join(", ")} hai. Tomato ke liye kya karun?`)}
                    style={({ pressed }) => [s.askBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Icon name="message-text-outline" size={18} color={C.primaryDark} />
                    <Text style={s.askTxt}>Ask Srish what to do</Text>
                  </Pressable>
                ) : null}
              </Card>

              {/* ── Weather ── */}
              <SectionHeader
                title="Weather at your field"
                subtitle={envRow ? `Measured ${timeAgo(rowTime(envRow))}` : undefined}
                style={{ marginTop: 22 }}
              />
              <View style={s.weather}>
                <WeatherCell icon="thermometer" label="Air" value={fmt(envRow?.air_temp)} unit="°C" say={air} />
                <WeatherCell icon="water-outline" label="Humidity" value={fmt(envRow?.humidity, 0)} unit="%" say={humid} />
                <WeatherCell icon="weather-pouring" label="Rain" value={fmt(envRow?.rainfall)} unit="mm" say={rain} last />
              </View>
              {humid?.word === "Fungus risk" ? (
                <Banner
                  tone="warn"
                  icon="mushroom-outline"
                  title="Watch for leaf spots"
                  message="Damp air helps blight and other fungus spread on tomato. Check the lower leaves today."
                  action="Ask Srish how to protect plants"
                  onAction={() => askSrish("Hawa mein bahut nami hai. Tomato ko fungus se kaise bachayein?")}
                  style={{ marginTop: 10 }}
                />
              ) : null}

              {/* ── Farm ── */}
              {data.farm ? (
                <>
                  <SectionHeader title="Your farm" style={{ marginTop: 22 }} />
                  <Card onPress={() => navigation.navigate("FarmOverview")}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <IconBubble name="sprout" size={46} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.farmName}>
                          {CROP[data.farm.crop_id] || "Crop"} · {GROWTH_STAGE[data.farm.growth_stage] || "Stage"} stage
                        </Text>
                        <Text style={s.farmMeta}>
                          {fmt(data.farm.field_area_m2, 0)} m² field · roots about {fmt(Number(data.farm.root_depth_m) * 100, 0)} cm deep
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={24} color={C.textFaint} />
                    </View>
                  </Card>
                </>
              ) : null}

              <Pressable onPress={() => navigation.navigate("Help")} style={s.helpLink} hitSlop={8}>
                <Icon name="help-circle-outline" size={18} color={C.primary} />
                <Text style={s.helpTxt}>What do these words mean?</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatusCard({ status }) {
  if (!status) return null;
  const [fg, bg] = toneColors(status.tone);
  return (
    <View style={[s.status, { borderColor: fg + "40" }]}>
      <View style={[s.statusIcon, { backgroundColor: bg }]}>
        <Icon name={status.icon} size={28} color={fg} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.statusTitle}>{status.title}</Text>
        <Text style={s.statusSay}>{status.say}</Text>
      </View>
    </View>
  );
}

function TodayCard({ decision, water, onHistory, onAsk }) {
  const needs = !!decision?.irrigation_required || water?.key === "dry";
  const litres = decision ? grossLitres(decision) : null;
  const reason = decision
    ? PLAIN_REASON[decision.decision_reason] || lookup(DECISION_REASON, decision.decision_reason).detail
    : water?.say || "The system hasn't checked your field yet.";
  const tone = needs ? "water" : "primary";
  const [fg, bg] = toneColors(tone);

  return (
    <View style={s.today}>
      <View style={[s.todayTop, { backgroundColor: bg }]}>
        <Text style={[s.todayKicker, { color: fg }]}>WHAT TO DO TODAY</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
          <View style={[s.todayIcon, { backgroundColor: fg }]}>
            <Icon name={needs ? "watering-can" : "check-bold"} size={26} color={C.white} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.todayTitle}>{needs ? "Water the field" : "No watering needed"}</Text>
            {needs && isNum(litres) ? (
              <Text style={[s.todayAmount, { color: fg }]}>About {fmt(litres, 0)} litres</Text>
            ) : null}
          </View>
        </View>
        <Text style={s.todayWhy}>{reason}</Text>
        {decision ? <Text style={s.todayTime}>Checked {timeAgo(rowTime(decision))}</Text> : null}
      </View>
      <View style={s.todayActions}>
        <Pressable onPress={onHistory} style={({ pressed }) => [s.todayBtn, pressed && { opacity: 0.7 }]}>
          <Icon name="history" size={18} color={C.textMuted} />
          <Text style={s.todayBtnTxt}>Watering history</Text>
        </Pressable>
        <View style={s.todayDivider} />
        <Pressable onPress={onAsk} style={({ pressed }) => [s.todayBtn, pressed && { opacity: 0.7 }]}>
          <Icon name="message-text-outline" size={18} color={C.primary} />
          <Text style={[s.todayBtnTxt, { color: C.primary }]}>Ask Srish</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CheckRow({ icon, label, word, tone, detail, onPress, last }) {
  const [fg, bg] = toneColors(tone);
  const body = (
    <View style={[s.check, !last && s.checkBorder]}>
      <View style={[s.checkDot, { backgroundColor: fg }]} />
      <Icon name={icon} size={21} color={C.textMuted} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={s.checkLbl}>{label}</Text>
        {detail ? (
          <Text style={s.checkDetail} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
      <View style={[s.checkPill, { backgroundColor: bg }]}>
        <Text style={[s.checkWord, { color: fg }]}>{word}</Text>
      </View>
      {onPress ? <Icon name="chevron-right" size={20} color={C.textFaint} style={{ marginLeft: 4 }} /> : <View style={{ width: 24 }} />}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: C.bg }}>
      {body}
    </Pressable>
  );
}

// Four equal zones so the words are readable, with the marker placed by where
// the reading falls inside its zone.
const ZONES = [
  { label: "Very dry", color: C.danger },
  { label: "Getting dry", color: C.warn },
  { label: "Just right", color: C.primary },
  { label: "Too wet", color: C.water },
];
function WaterMeter({ vwc, model }) {
  const edges = [0, model.wp, model.refill, model.fc, Math.max(model.fc * 1.3, vwc)];
  let zone = 3;
  for (let i = 0; i < 4; i++) {
    if (vwc < edges[i + 1]) {
      zone = i;
      break;
    }
  }
  const span = edges[zone + 1] - edges[zone] || 1;
  const frac = Math.min(1, Math.max(0, (vwc - edges[zone]) / span));
  const left = `${(zone + frac) * 25}%`;

  return (
    <View style={{ marginTop: 16 }}>
      <View style={s.meter}>
        {ZONES.map((z, i) => (
          <View key={z.label} style={[s.meterZone, { backgroundColor: z.color, opacity: i === zone ? 1 : 0.25 }]} />
        ))}
        <View style={[s.meterMark, { left }]}>
          <View style={s.meterDot} />
        </View>
      </View>
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {ZONES.map((z, i) => (
          <Text key={z.label} style={[s.meterLbl, i === zone && { color: z.color, fontWeight: "900" }]}>
            {z.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SoilTile({ icon, label, say, value, unit }) {
  const [fg, bg] = toneColors(say?.tone || "muted");
  return (
    <View style={s.tile}>
      <View style={[s.tileIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={18} color={fg} />
      </View>
      <Text style={s.tileLbl} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[s.tileWord, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {say?.word || "—"}
      </Text>
      <Text style={s.tileVal} numberOfLines={1}>
        {value}
        {value !== "—" && unit ? ` ${unit}` : ""}
      </Text>
    </View>
  );
}

function NutrientRow({ short, name, job, value, say, color, last }) {
  const [fg] = toneColors(say?.tone || "muted");
  return (
    <View style={[s.nut, !last && s.nutBorder]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={[s.nutBadge, { backgroundColor: color + "18" }]}>
          <Text style={[s.nutShort, { color }]}>{short}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.nutName}>{name}</Text>
          <Text style={s.nutJob}>{job}</Text>
        </View>
        {say ? <Badge label={say.word} tone={say.tone} /> : <Text style={s.nutJob}>No reading</Text>}
      </View>
      {say ? (
        <View style={{ marginTop: 8 }}>
          <View style={s.nutBar}>
            <View style={[s.nutBand, { backgroundColor: C.warnSoft }]} />
            <View style={[s.nutBand, { backgroundColor: C.primarySoft }]} />
            <View style={[s.nutBand, { backgroundColor: C.infoSoft }]} />
            <View style={[s.nutMark, { left: `${say.pos * 100}%`, backgroundColor: fg }]} />
          </View>
          <View style={{ flexDirection: "row", marginTop: 3 }}>
            <Text style={s.nutBandLbl}>Low</Text>
            <Text style={[s.nutBandLbl, { textAlign: "center" }]}>Good</Text>
            <Text style={[s.nutBandLbl, { textAlign: "right" }]}>{fmt(value, 0)} mg/kg</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function WeatherCell({ icon, label, value, unit, say, last }) {
  const warn = say && say.tone !== "primary" && say.tone !== "muted";
  return (
    <View style={[s.wCell, !last && s.wCellBorder]}>
      <Icon name={icon} size={22} color={C.onDeep} />
      <Text style={s.wVal}>
        {value}
        {value !== "—" ? <Text style={s.wUnit}>{unit}</Text> : null}
      </Text>
      <Text style={s.wLbl}>{label}</Text>
      {say ? (
        <View style={[s.wPill, warn && { backgroundColor: "#FDE68A" }]}>
          <Text style={[s.wPillTxt, warn && { color: "#7C4A03" }]} numberOfLines={1}>
            {say.word}
          </Text>
        </View>
      ) : null}
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

  status: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    shadowColor: C.deep,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  statusIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  statusTitle: { fontSize: 18, fontWeight: "900", color: C.text, letterSpacing: -0.3 },
  statusSay: { fontSize: 13.5, color: C.textMuted, marginTop: 2, lineHeight: 19 },

  today: {
    marginTop: 12,
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    ...SHADOW,
  },
  todayTop: { padding: 16 },
  todayKicker: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  todayIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  todayTitle: { fontSize: 21, fontWeight: "900", color: C.text, letterSpacing: -0.4 },
  todayAmount: { fontSize: 15, fontWeight: "800", marginTop: 1 },
  todayWhy: { fontSize: 14, color: C.text, marginTop: 12, lineHeight: 20 },
  todayTime: { fontSize: 12, color: C.textFaint, marginTop: 4 },
  todayActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.divider },
  todayBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13 },
  todayBtnTxt: { fontSize: 13.5, fontWeight: "800", color: C.textMuted },
  todayDivider: { width: 1, backgroundColor: C.divider },

  check: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingLeft: 14, paddingRight: 10 },
  checkBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  checkDot: { width: 4, height: 30, borderRadius: 2, marginRight: 10 },
  checkLbl: { fontSize: 15, fontWeight: "700", color: C.text },
  checkDetail: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  checkPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill, marginLeft: 8 },
  checkWord: { fontSize: 12.5, fontWeight: "800" },

  waterTop: { flexDirection: "row", alignItems: "center" },
  waterWord: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  waterHi: { fontSize: 13, color: C.textFaint, fontWeight: "700" },
  waterSay: { fontSize: 14, color: C.text, marginTop: 4, lineHeight: 19 },
  waterFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  waterNum: { fontSize: 13, color: C.textMuted, fontWeight: "700" },
  trend: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendTxt: { fontSize: 13, color: C.textMuted, fontWeight: "700" },
  trendLbl: { fontSize: 11, color: C.textFaint, marginTop: 6 },

  meter: { flexDirection: "row", height: 14, gap: 3 },
  meterZone: { flex: 1, borderRadius: 7 },
  meterMark: { position: "absolute", top: -5, marginLeft: -12, width: 24, alignItems: "center" },
  meterDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.text,
    borderWidth: 4,
    borderColor: C.white,
    ...SHADOW,
    elevation: 4,
  },
  meterLbl: { flex: 1, textAlign: "center", fontSize: 11, color: C.textFaint, fontWeight: "700" },

  grid: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  tileIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tileLbl: { fontSize: 11.5, color: C.textMuted, fontWeight: "600", marginTop: 8 },
  tileWord: { fontSize: 17, fontWeight: "900", marginTop: 1 },
  tileVal: { fontSize: 11.5, color: C.textFaint, fontWeight: "600", marginTop: 1 },

  nutHead: { fontSize: 14, fontWeight: "800", color: C.text, marginBottom: 4 },
  nut: { paddingVertical: 11 },
  nutBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  nutBadge: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  nutShort: { fontSize: 16, fontWeight: "900" },
  nutName: { fontSize: 14.5, fontWeight: "800", color: C.text },
  nutJob: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  nutBar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "visible" },
  nutBand: { flex: 1, height: 8 },
  nutMark: {
    position: "absolute",
    top: -3,
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.white,
  },
  nutBandLbl: { flex: 1, fontSize: 10.5, color: C.textFaint, fontWeight: "700" },
  askBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    backgroundColor: C.primarySoft,
  },
  askTxt: { fontSize: 14, fontWeight: "800", color: C.primaryDark },

  weather: {
    flexDirection: "row",
    backgroundColor: C.primaryDark,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
  },
  wCell: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  wCellBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.12)" },
  wVal: { color: C.white, fontSize: 18, fontWeight: "800", marginTop: 6 },
  wUnit: { fontSize: 11, color: C.onDeep, fontWeight: "600" },
  wLbl: { color: C.onDeep, fontSize: 11.5, fontWeight: "600", marginTop: 2 },
  wPill: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    maxWidth: "100%",
  },
  wPillTxt: { color: C.white, fontSize: 11, fontWeight: "800" },

  farmName: { fontSize: 16, fontWeight: "800", color: C.text },
  farmMeta: { fontSize: 12.5, color: C.textMuted, marginTop: 3 },

  helpLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 22 },
  helpTxt: { fontSize: 13.5, fontWeight: "700", color: C.primary },
});
