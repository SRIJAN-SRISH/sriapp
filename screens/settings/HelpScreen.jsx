import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/srijan/layout";
import { Card, IconBubble, SectionHeader } from "../../components/srijan/ui";
import { C } from "../../constants/colors";

const NODES = [
  {
    icon: "access-point",
    title: "Node A — in the field",
    body: "Reads the 7-in-1 soil sensor (moisture, temperature, EC, pH, N, P, K) and GPS, then sends it to Node B.",
  },
  {
    icon: "router-wireless",
    title: "Node B — the gateway",
    body: "Adds rainfall, air temperature and pressure, saves everything to its SD card and screen, runs the irrigation decision engine, and uploads to the cloud.",
  },
  {
    icon: "water-pump",
    title: "Node C — the pump",
    body: "Runs the irrigation pump when told to, and reports back how much water was actually delivered.",
  },
];

const TERMS = [
  ["Moisture (VWC)", "How much of the soil volume is water, in %."],
  ["Field capacity", "The wettest the soil stays after draining — above this, water is wasted."],
  ["Wilting point", "Below this the crop can't pull water from the soil."],
  ["Refill point", "When moisture drops here, it's time to irrigate (set by MAD %)."],
  ["Deficit", "Water (in mm) needed to bring the root zone back to field capacity."],
  ["VPD", "How strongly the air pulls water from leaves. Higher = crop gets thirsty faster."],
];

export default function HelpScreen() {
  return (
    <Screen title="Help & about" back>
      <SectionHeader title="How your system works" />
      {NODES.map((n) => (
        <Card key={n.title} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: "row" }}>
            <IconBubble name={n.icon} size={42} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.title}>{n.title}</Text>
              <Text style={s.body}>{n.body}</Text>
            </View>
          </View>
        </Card>
      ))}

      <SectionHeader title="Words you'll see" style={{ marginTop: 14 }} />
      <Card>
        {TERMS.map(([t, d], i) => (
          <View key={t} style={[s.term, i < TERMS.length - 1 && s.border]}>
            <Text style={s.title}>{t}</Text>
            <Text style={s.body}>{d}</Text>
          </View>
        ))}
      </Card>

      <Text style={s.foot}>Srijan · AgroSmart V1 precision irrigation</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 15, fontWeight: "800", color: C.text },
  body: { fontSize: 13.5, color: C.textMuted, marginTop: 3, lineHeight: 19 },
  term: { paddingVertical: 10 },
  border: { borderBottomWidth: 1, borderBottomColor: C.divider },
  foot: { textAlign: "center", fontSize: 12, color: C.textFaint, marginTop: 18 },
});
