// Health-ping history for one node (node_health).

import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/srijan/layout";
import { Banner, Card, EmptyState, InfoRow, LoadingBlock, MiniBars, SectionHeader } from "../../components/srijan/ui";
import { C } from "../../constants/colors";
import { useLoader } from "../../hooks/useLoader";
import { getNodeHealthHistory } from "../../services/api/deviceService";
import { fmt, formatDateTime, isNum, rowTime, timeAgo } from "../../utils/format";

function uptime(ms) {
  if (!isNum(ms)) return "—";
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export default function DeviceDetailsScreen({ route }) {
  const { nodeId } = route.params;
  const { data, error, loading, refreshing, reload } = useLoader(() => getNodeHealthHistory(nodeId), nodeId);
  const rows = data || [];
  const p = rows[0];
  const battery = rows
    .map((r) => r.battery_voltage)
    .filter(isNum)
    .slice(0, 40)
    .reverse()
    .map(Number);

  return (
    <Screen title={nodeId} subtitle={p ? `Last ping ${timeAgo(rowTime(p))}` : "Health history"} back refreshing={refreshing} onRefresh={reload}>
      {loading && !data ? (
        <LoadingBlock />
      ) : error && !data ? (
        <Banner message={error} action="Try again" onAction={reload} />
      ) : !p ? (
        <Card>
          <EmptyState icon="heart-off-outline" title="No health pings" message="This node hasn't sent a health report yet." />
        </Card>
      ) : (
        <>
          <Card>
            <InfoRow label="Role" value={p.role} icon="tag-outline" />
            <InfoRow label="Firmware" value={p.firmware_version} icon="chip" />
            <InfoRow label="MAC address" value={p.mac_address} icon="ethernet" />
            <InfoRow label="Uptime" value={uptime(p.uptime_ms)} icon="timer-outline" />
            <InfoRow label="Battery" value={isNum(p.battery_voltage) ? `${fmt(p.battery_voltage, 2)} V` : "—"} icon="battery-outline" />
            <InfoRow label="WiFi signal" value={isNum(p.wifi_rssi) ? `${p.wifi_rssi} dBm` : "—"} icon="wifi" />
            <InfoRow label="LoRa signal" value={isNum(p.lora_rssi) ? `${p.lora_rssi} dBm` : "—"} icon="radio-tower" />
            <InfoRow
              label="Free memory"
              value={isNum(p.free_heap_bytes) ? `${fmt(p.free_heap_bytes / 1024, 0)} KB` : "—"}
              icon="memory"
              last
            />
          </Card>

          {battery.length > 1 ? (
            <>
              <SectionHeader title="Battery trend" subtitle={`Last ${battery.length} pings`} style={{ marginTop: 20 }} />
              <Card>
                <MiniBars values={battery} color={C.primary} height={90} />
              </Card>
            </>
          ) : null}

          <SectionHeader title="Ping history" style={{ marginTop: 20 }} />
          <Card padded={false}>
            {rows.slice(0, 25).map((r, i) => (
              <View key={r.id} style={[s.row, i < Math.min(rows.length, 25) - 1 && s.border]}>
                <Text style={s.time}>{formatDateTime(rowTime(r))}</Text>
                <Text style={s.val}>{isNum(r.battery_voltage) ? `${fmt(r.battery_voltage, 2)} V` : "—"}</Text>
                <Text style={s.val}>{isNum(r.wifi_rssi) ? `${r.wifi_rssi} dBm` : "—"}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 11 },
  border: { borderBottomWidth: 1, borderBottomColor: C.divider },
  time: { flex: 1, fontSize: 13, color: C.text, fontWeight: "600" },
  val: { width: 80, textAlign: "right", fontSize: 13, color: C.textMuted, fontWeight: "700" },
});
