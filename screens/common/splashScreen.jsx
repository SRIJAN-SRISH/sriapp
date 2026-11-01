import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Logo } from "../../components/srijan/layout";
import { C } from "../../constants/colors";

export default function SplashScreen() {
  return (
    <View style={s.wrap}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Logo size={76} light />
      <Text style={s.name}>Srijan</Text>
      <Text style={s.tag}>AgroSmart farm monitoring</Text>
      <ActivityIndicator color={C.white} style={{ marginTop: 34 }} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.deep, alignItems: "center", justifyContent: "center" },
  name: { color: C.white, fontSize: 32, fontWeight: "900", marginTop: 18, letterSpacing: -0.6 },
  tag: { color: C.onDeep, fontSize: 14, marginTop: 4 },
});
