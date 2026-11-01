// Device — status of Node A (sensors), Node B (gateway), Node C (pump),
// latest hardware faults, and the system log stream.
// Sources: node_health, sensor_records, irrigation_events, system_logs.

import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import LogRow from "../../components/srijan/LogRow";
import { Screen } from "../../components/srijan/layout";
import { Badge, Banner, Card, Chip, EmptyState, Icon, IconBubble, LoadingBlock, SectionHeader } from "../../components/srijan/ui";
import { C } from "../../constants/colors";
import { HEALTH_BITS, healthFaults } from "../../constants/enums";
import { useAuth } from "../../context/AuthContext";
import { useLoader } from "../../hooks/useLoader";
import { getIrrigationEvents, getNodeHealth, getSystemLogs } from "../../services/api/deviceService";
import { getSensorRecords, SOIL_KEYS, hasAny } from "../../services/api/sensorService";
import { fmt, isRecent, rowTime, timeAgo } from "../../utils/format";

const NODES = [
  { prefix: "NODE_A", name: "Node A", role: "Soil sensors + GPS", icon: "access-point" },
  { prefix: "NODE_B", name: "Node B", role: "Gateway · weather · AI decisions", icon: "router-wireless" },
  { prefix: "NODE_C", name: "Node C", role: "Irrigation pump", icon: "water-pump" },
];

const LOG_FILTERS = [
  { min: 1, label: "All" },
  { min: 2, label: "Operational+" },
  { min: 3, label: "Critical+" },
];

async function load(farmId) {
  const [health, records, events] = await Promise.all([
    getNodeHealth(farmId),
    getSensorRecords(farmId, 60),
    getIrrigationEvents(farmId, 1),
  ]);
  return { health: health || [], records: records || [], events: events || [] };
}

export default function DeviceListScreen({ navigation }) {
  const { farmId } = useAuth();
  const [minSev, setMinSev] = useState(1);
  const { data, error, loading, refreshing, reload } = useLoader(() => load(farmId), farmId, { pollMs: 60000 });
  const logsState = useLoader(
    () => getSystemLogs(farmId, { minSeverity: minSev, limit: 60 }),
    `${farmId}|${minSev}`,
    { pollMs: 60000 },
  );
  const logs = logsState.data || [];
  const refreshAll = () => {
    reload();
    logsState.reload();
  };

  const records = data?.records || [];
  const latest = records[0];
  const lastSoil = records.find((r) => hasAny(r, SOIL_KEYS));

  // Activity seen in the data tables, used when node_health has no ping.
  const activity = {
    NODE_A: rowTime(lastSoil),
    NODE_B: rowTime(latest),
    NODE_C: rowTime(data?.events?.[0], "executed_at"),
  };

  const faults = healthFaults(latest?.health_flag);

  return (
    <Screen title="Devices" subtitle={`${farmId} · 3-node system`} refreshing={refreshing || logsState.refreshing} onRefresh={refreshAll}>
      {loading && !data ? (
        <LoadingBlock />
      ) : error && !data ? (
        <Banner title="Couldn't load device data" message={error} action="Try again" onAction={reload} />
      ) : (
        <>
          {NODES.map((n) => {
            const ping = data.health.find((h) => h.node_id?.startsWith(n.prefix));
            return (
              <NodeCard
                key={n.prefix}
                node={n}
                ping={ping}
                activity={activity[n.prefix]}
                onPress={ping ? () => navigation.navigate("NodeDetails", { nodeId: ping.node_id }) : undefined}
              />
            );
          })}

          <SectionHeader
            title="Hardware health"
            subtitle={latest ? `From latest reading · ${timeAgo(rowTime(latest))}` : "No readings yet"}
            style={{ marginTop: 18 }}
          />
          <Card>
            {HEALTH_BITS.map((h, i) => {
              const bad = faults.some((f) => f.bit === h.bit);
              return (
                <View key={h.bit} style={[s.hRow, i < HEALTH_BITS.length - 1 && s.hBorder]}>
                  <Icon
                    name={bad ? "close-circle" : "check-circle"}
                    size={20}
                    color={!latest ? C.textFaint : bad ? C.danger : C.primary}
                  />
                  <Text style={s.hLbl}>{h.label}</Text>
                  <Text style={s.hNode}>{h.node}</Text>
                </View>
              );
            })}
          </Card>

          <SectionHeader title="System logs" subtitle="Newest first" style={{ marginTop: 22 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {LOG_FILTERS.map((f) => (
              <Chip key={f.min} label={f.label} active={minSev === f.min} onPress={() => setMinSev(f.min)} />
            ))}
          </ScrollView>
          {logsState.loading ? (
            <LoadingBlock label="Loading logs…" />
          ) : logsState.error && !logsState.data ? (
            <Banner message={logsState.error} action="Try again" onAction={logsState.reload} />
          ) : logs.length === 0 ? (
            <Card>
              <EmptyState icon="text-box-check-outline" title="No logs" message="Nothing matches this filter." />
            </Card>
          ) : (
            <Card padded={false}>
              {logs.map((log, i) => (
                <LogRow key={log.id} log={log} last={i === logs.length - 1} />
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function NodeCard({ node, ping, activity, onPress }) {
  const seen = ping ? rowTime(ping) : activity;
  const online = isRecent(seen);
  return (
    <Card style={{ marginBottom: 10 }} onPress={onPress}>
      <View style={s.nodeRow}>
        <IconBubble name={node.icon} tone={online ? "primary" : seen ? "warn" : "muted"} size={46} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={s.nodeHead}>
            <Text style={s.nodeName}>{ping?.node_id || node.name}</Text>
            <Badge
              label={online ? "Online" : seen ? "Offline" : "No data"}
              tone={online ? "primary" : seen ? "warn" : "muted"}
            />
          </View>
          <Text style={s.nodeRole}>{node.role}</Text>
          <Text style={s.nodeSeen}>
            {seen ? `Last ${ping ? "health ping" : "data"} ${timeAgo(seen)}` : "Never reported"}
          </Text>
        </View>
      </View>
      {ping ? (
        <View style={s.pingGrid}>
          <PingCell icon="battery-outline" label="Battery" value={fmt(ping.battery_voltage, 2)} unit="V" />
          <PingCell icon="wifi" label="WiFi" value={fmt(ping.wifi_rssi, 0)} unit="dBm" />
          <PingCell icon="radio-tower" label="LoRa" value={fmt(ping.lora_rssi, 0)} unit="dBm" />
          <PingCell icon="memory" label="Free heap" value={fmt((ping.free_heap_bytes || 0) / 1024, 0)} unit="KB" />
        </View>
      ) : null}
    </Card>
  );
}

function PingCell({ icon, label, value, unit }) {
  return (
    <View style={s.pingCell}>
      <Icon name={icon} size={15} color={C.textFaint} />
      <Text style={s.pingVal}>
        {value}
        {value !== "—" ? <Text style={s.pingUnit}> {unit}</Text> : null}
      </Text>
      <Text style={s.pingLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  nodeRow: { flexDirection: "row", alignItems: "center" },
  nodeHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  nodeName: { fontSize: 16, fontWeight: "800", color: C.text, flexShrink: 1 },
  nodeRole: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  nodeSeen: { fontSize: 11.5, color: C.textFaint, marginTop: 3 },
  pingGrid: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  pingCell: { flex: 1, alignItems: "center" },
  pingVal: { fontSize: 14, fontWeight: "800", color: C.text, marginTop: 3 },
  pingUnit: { fontSize: 10, color: C.textFaint },
  pingLbl: { fontSize: 10.5, color: C.textFaint, fontWeight: "600" },
  hRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  hBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  hLbl: { flex: 1, fontSize: 14, color: C.text, fontWeight: "600" },
  hNode: { fontSize: 11.5, color: C.textFaint, fontWeight: "700" },
  chips: { gap: 8, paddingBottom: 12 },
});
