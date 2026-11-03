// Bottom navigation: four plain tabs with a raised "Srish" button in the
// middle. The active tab gets a soft green pill so it reads at a glance.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C, SHADOW } from "../../constants/colors";
import { Icon } from "./ui";

// route name → [label, active icon, inactive icon]
const TABS = {
  Home: ["Home", "home-variant", "home-variant-outline"],
  Sensors: ["Soil", "sprout", "sprout-outline"],
  Assistant: ["Ask Srish", "message-text", "message-text-outline"],
  Irrigation: ["Water", "water", "water-outline"],
  Profile: ["Account", "account-circle", "account-circle-outline"],
};

export default function SrijanTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[t.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const [label, iconOn, iconOff] = TABS[route.name] || [route.name, "circle", "circle-outline"];

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        if (route.name === "Assistant") {
          return (
            <Pressable key={route.key} onPress={onPress} style={t.item} accessibilityRole="button" accessibilityLabel={label}>
              <View style={[t.center, focused && t.centerOn]}>
                <Icon name={focused ? iconOn : iconOff} size={26} color={C.white} />
              </View>
              <Text style={[t.label, t.centerLabel, focused && t.labelOn]}>{label}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={t.item}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
          >
            <View style={[t.pill, focused && t.pillOn]}>
              <Icon name={focused ? iconOn : iconOff} size={23} color={focused ? C.primaryDark : C.textFaint} />
            </View>
            <Text style={[t.label, focused && t.labelOn]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const t = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingHorizontal: 6,
    shadowColor: C.deep,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -3 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  pill: { width: 56, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  pillOn: { backgroundColor: C.primarySoft },
  label: { fontSize: 11.5, fontWeight: "700", color: C.textFaint, marginTop: 3 },
  labelOn: { color: C.primaryDark, fontWeight: "800" },

  // Raised round button for Srish, lifted above the bar
  center: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: -28,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: C.white,
    ...SHADOW,
    shadowOpacity: 0.25,
    elevation: 8,
  },
  centerOn: { backgroundColor: C.primaryDark },
  centerLabel: { marginTop: 2 },
});
