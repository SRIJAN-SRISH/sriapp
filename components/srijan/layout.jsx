import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import {
  KeyboardAvoidingView,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "../../constants/colors";
import { KeyboardAwareContext, useKeyboardAware } from "../../hooks/useKeyboardAware";
import { Icon } from "./ui";

// Brand mark: white sprout on green tile
export function Logo({ size = 44, light }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: light ? "rgba(255,255,255,0.16)" : C.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name="sprout" size={size * 0.6} color={C.white} />
    </View>
  );
}

// Dark-green strip behind the system status bar (time, battery, network)
// with light icons. Painted by the app itself so it looks the same whether
// or not the phone draws the app edge-to-edge under the status bar.
export function TopInset({ color = C.deep }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={{ height: insets.top, backgroundColor: color }} />
    </>
  );
}

// Standard in-app screen: title bar + scrollable body with pull-to-refresh.
// KeyboardAvoidingView uses "padding" on Android too: with edge-to-edge the
// window no longer resizes for the keyboard.
export function Screen({ title, subtitle, back, right, children, refreshing, onRefresh, contentStyle }) {
  const navigation = useNavigation();
  const { scrollRef, onScroll, fieldContext } = useKeyboardAware();
  return (
    <KeyboardAwareContext.Provider value={fieldContext}>
      <SafeAreaView style={l.safe} edges={["left", "right"]}>
        <TopInset />
        <View style={l.bar}>
          {back ? (
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={l.backBtn}>
              <Icon name="arrow-left" size={24} color={C.text} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={l.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={l.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
            contentContainerStyle={[l.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={!!refreshing}
                  onRefresh={onRefresh}
                  tintColor={C.primary}
                  colors={[C.primary]}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </KeyboardAwareContext.Provider>
  );
}

// Auth screens: deep green brand header with a white sheet below.
// While the keyboard is open the header collapses to a single row, leaving
// most of the screen for the form.
export function AuthShell({ title, subtitle, onBack, children, footer }) {
  const { scrollRef, onScroll, keyboardVisible: compact, fieldContext } = useKeyboardAware();
  return (
    <KeyboardAwareContext.Provider value={fieldContext}>
      <View style={{ flex: 1, backgroundColor: C.deep }}>
        <TopInset />
        <View style={[a.header, compact && a.headerCompact]}>
          {compact ? (
            <View style={[a.topRow, a.topRowCompact]}>
              {onBack ? (
                <Pressable onPress={onBack} hitSlop={10} style={a.back}>
                  <Icon name="arrow-left" size={22} color={C.white} />
                </Pressable>
              ) : (
                <Logo size={34} light />
              )}
              <Text style={a.titleCompact} numberOfLines={1}>
                {title}
              </Text>
            </View>
          ) : (
            <>
              {/* Back button sits in the same row as the Srijan brand */}
              <View style={a.brandRow}>
                {onBack ? (
                  <Pressable onPress={onBack} hitSlop={10} style={[a.back, { marginRight: 12 }]}>
                    <Icon name="arrow-left" size={22} color={C.white} />
                  </Pressable>
                ) : null}
                <Logo size={46} light />
                <View style={{ marginLeft: 12 }}>
                  <Text style={a.brand}>Srijan</Text>
                  <Text style={a.brandSub}>AgroSmart farm monitoring</Text>
                </View>
              </View>
              <Text style={a.title}>{title}</Text>
              {subtitle ? <Text style={a.subtitle}>{subtitle}</Text> : null}
            </>
          )}
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={a.sheet}>
            <ScrollView
              ref={scrollRef}
              onScroll={onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={a.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer ? (
              <SafeAreaView edges={compact ? [] : ["bottom"]} style={a.footer}>
                {footer}
              </SafeAreaView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </KeyboardAwareContext.Provider>
  );
}

const l = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: { fontSize: 24, fontWeight: "900", color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
});

const a = StyleSheet.create({
  header: { paddingHorizontal: 22, paddingBottom: 26 },
  headerCompact: { paddingBottom: 14 },
  topRow: { height: 40, flexDirection: "row", alignItems: "center" },
  topRowCompact: { marginTop: 4 },
  titleCompact: { flex: 1, marginLeft: 12, fontSize: 19, fontWeight: "900", color: C.white, letterSpacing: -0.3 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 22 },
  brand: { fontSize: 22, fontWeight: "900", color: C.white, letterSpacing: -0.3 },
  brandSub: { fontSize: 12, color: C.onDeep, marginTop: 1 },
  title: { fontSize: 27, fontWeight: "900", color: C.white, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: C.onDeep, marginTop: 6, lineHeight: 20 },
  sheet: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  sheetContent: { padding: 22, paddingTop: 26, paddingBottom: 30 },
  footer: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.divider },
});
