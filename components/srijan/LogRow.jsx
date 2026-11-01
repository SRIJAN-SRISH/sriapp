import { StyleSheet, Text, View } from "react-native";

import { C } from "../../constants/colors";
import { SEVERITY, lookup } from "../../constants/enums";
import { formatDateTime, rowTime } from "../../utils/format";
import { Badge, Icon, toneColors } from "./ui";

const SOURCE_ICON = {
  UART_TASK: "swap-horizontal",
  SD_TASK: "sd",
  ENV_TASK: "weather-partly-cloudy",
  HEALTH_TASK: "heart-pulse",
  DECISION_TASK: "robot-outline",
  LED_TASK: "led-on",
  CLOUD_TASK: "cloud-upload-outline",
};

export default function LogRow({ log, last }) {
  const sev = lookup(SEVERITY, log.severity);
  const [fg, bg] = toneColors(sev.tone);
  return (
    <View style={[s.row, !last && s.border]}>
      <View style={[s.icon, { backgroundColor: bg }]}>
        <Icon name={SOURCE_ICON[log.source] || "console"} size={17} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.head}>
          <Text style={s.source} numberOfLines={1}>
            {log.source}
          </Text>
          <Badge label={sev.label} tone={sev.tone} />
        </View>
        <Text style={s.msg}>{log.message}</Text>
        <Text style={s.meta}>
          {formatDateTime(rowTime(log, "logged_at"))} · {log.node_id}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: C.divider },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  source: { flex: 1, fontSize: 12.5, fontWeight: "800", color: C.textMuted, letterSpacing: 0.3 },
  msg: { fontSize: 13.5, color: C.text, marginTop: 4, lineHeight: 19 },
  meta: { fontSize: 11, color: C.textFaint, marginTop: 4 },
});
