// Shared UI building blocks for the Srijan app (green & white theme).

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { C, RADIUS, SHADOW } from "../../constants/colors";
import { useKeyboardAwareField } from "../../hooks/useKeyboardAware";

export const Icon = MaterialCommunityIcons;

// tone → [foreground, background]
export const TONES = {
  primary: [C.primary, C.primarySoft],
  water: [C.water, C.waterSoft],
  warn: [C.warn, C.warnSoft],
  danger: [C.danger, C.dangerSoft],
  info: [C.info, C.infoSoft],
  soil: [C.soil, C.soilSoft],
  muted: [C.textMuted, C.divider],
};

export function toneColors(tone) {
  return TONES[tone] || TONES.muted;
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress, padded = true }) {
  const content = <View style={[ui.card, padded && ui.cardPad, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>
      {content}
    </Pressable>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action, onAction, style }) {
  return (
    <View style={[ui.secRow, style]}>
      <View style={{ flex: 1 }}>
        <Text style={ui.secTitle}>{title}</Text>
        {subtitle ? <Text style={ui.secSub}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={ui.secAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Badge / pill ────────────────────────────────────────────────────────────
export function Badge({ label, tone = "primary", icon, style }) {
  const [fg, bg] = toneColors(tone);
  return (
    <View style={[ui.badge, { backgroundColor: bg }, style]}>
      {icon ? <Icon name={icon} size={13} color={fg} style={{ marginRight: 4 }} /> : null}
      <Text style={[ui.badgeTxt, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Icon bubble ─────────────────────────────────────────────────────────────
export function IconBubble({ name, tone = "primary", size = 40, iconSize }) {
  const [fg, bg] = toneColors(tone);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={name} size={iconSize || size * 0.52} color={fg} />
    </View>
  );
}

// ─── Metric tile ─────────────────────────────────────────────────────────────
export function MetricTile({ icon, label, value, unit, tone = "primary", style, hint }) {
  return (
    <View style={[ui.tile, style]}>
      <IconBubble name={icon} tone={tone} size={34} />
      <Text style={ui.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={ui.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit && value !== "—" ? <Text style={ui.tileUnit}> {unit}</Text> : null}
      </Text>
      {hint ? (
        <Text style={ui.tileHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Key / value row ─────────────────────────────────────────────────────────
export function InfoRow({ label, value, icon, last }) {
  return (
    <View style={[ui.infoRow, !last && ui.infoRowBorder]}>
      {icon ? <Icon name={icon} size={18} color={C.textFaint} style={{ marginRight: 10 }} /> : null}
      <Text style={ui.infoLabel}>{label}</Text>
      <Text style={ui.infoValue} numberOfLines={2}>
        {value ?? "—"}
      </Text>
    </View>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────
export function Button({ title, onPress, disabled, loading, variant = "primary", icon, style }) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const fg = isPrimary ? C.white : isDanger ? C.danger : C.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        ui.btn,
        isPrimary && ui.btnPrimary,
        variant === "outline" && ui.btnOutline,
        variant === "ghost" && ui.btnGhost,
        isDanger && ui.btnDanger,
        (disabled || loading) && (isPrimary ? ui.btnPrimaryDisabled : { opacity: 0.5 }),
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {icon ? <Icon name={icon} size={20} color={fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[ui.btnTxt, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Text input ──────────────────────────────────────────────────────────────
export function Field({ label, icon, error, hint, prefix, right, style, inputStyle, ...props }) {
  const [focused, setFocused] = useState(false);
  const keyboard = useKeyboardAwareField();
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={ui.fieldLabel}>{label}</Text> : null}
      <View
        style={[
          ui.inputWrap,
          focused && ui.inputFocused,
          error && ui.inputError,
          props.editable === false && { backgroundColor: C.divider },
        ]}
      >
        {icon ? <Icon name={icon} size={20} color={focused ? C.primary : C.textFaint} /> : null}
        {prefix ? (
          <View style={ui.prefix}>
            <Text style={ui.prefixTxt}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={C.textFaint}
          style={[ui.input, inputStyle]}
          onFocus={(e) => {
            setFocused(true);
            keyboard?.onFieldFocus();
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {right}
      </View>
      {error ? (
        <Text style={ui.errorTxt}>{error}</Text>
      ) : hint ? (
        <Text style={ui.hintTxt}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function PasswordField(props) {
  const [show, setShow] = useState(false);
  return (
    <Field
      icon="lock-outline"
      secureTextEntry={!show}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <Pressable onPress={() => setShow((s) => !s)} hitSlop={10}>
          <Icon name={show ? "eye-off-outline" : "eye-outline"} size={20} color={C.textFaint} />
        </Pressable>
      }
      {...props}
    />
  );
}

// ─── Banners & states ────────────────────────────────────────────────────────
export function Banner({ tone = "danger", icon = "alert-circle-outline", title, message, action, onAction, style }) {
  const [fg, bg] = toneColors(tone);
  return (
    <View style={[ui.banner, { backgroundColor: bg, borderColor: fg + "33" }, style]}>
      <Icon name={icon} size={20} color={fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        {title ? <Text style={[ui.bannerTitle, { color: fg }]}>{title}</Text> : null}
        {message ? <Text style={ui.bannerMsg}>{message}</Text> : null}
        {action ? (
          <Pressable onPress={onAction} hitSlop={8} style={{ marginTop: 6 }}>
            <Text style={[ui.bannerAction, { color: fg }]}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function EmptyState({ icon = "sprout-outline", title, message, children }) {
  return (
    <View style={ui.empty}>
      <View style={ui.emptyIcon}>
        <Icon name={icon} size={34} color={C.primary} />
      </View>
      <Text style={ui.emptyTitle}>{title}</Text>
      {message ? <Text style={ui.emptyMsg}>{message}</Text> : null}
      {children}
    </View>
  );
}

export function LoadingBlock({ label = "Loading…" }) {
  return (
    <View style={ui.loading}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={ui.loadingTxt}>{label}</Text>
    </View>
  );
}

// ─── Segmented control / chips ───────────────────────────────────────────────
export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[ui.seg, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[ui.segItem, active && ui.segItemActive]}>
            <Text style={[ui.segTxt, active && ui.segTxtActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, icon }) {
  return (
    <Pressable onPress={onPress} style={[ui.chip, active && ui.chipActive]}>
      {icon ? (
        <Icon name={icon} size={15} color={active ? C.white : C.textMuted} style={{ marginRight: 5 }} />
      ) : null}
      <Text style={[ui.chipTxt, active && ui.chipTxtActive]}>{label}</Text>
    </Pressable>
  );
}

// ─── Simple bar chart (no extra libraries) ───────────────────────────────────
// values: oldest → newest. Nulls are drawn as gaps.
export function MiniBars({ values, color = C.primary, height = 90, refLines = [] }) {
  const nums = values.filter((v) => v !== null && v !== undefined);
  if (nums.length === 0) return null;
  const allForScale = [...nums, ...refLines.map((r) => r.value)];
  const max = Math.max(...allForScale);
  const min = Math.min(0, ...allForScale);
  const span = max - min || 1;
  return (
    <View style={{ height, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
      {refLines.map((r) => (
        <View
          key={r.label}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: ((r.value - min) / span) * height,
            borderTopWidth: 1,
            borderStyle: "dashed",
            borderColor: r.color,
          }}
        />
      ))}
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        if (v === null || v === undefined) return <View key={i} style={{ flex: 1 }} />;
        const h = Math.max(3, ((v - min) / span) * height);
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: h,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
              backgroundColor: color,
              opacity: isLast ? 1 : 0.45,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Soil moisture gauge ─────────────────────────────────────────────────────
// Horizontal band showing wilting point, refill point (MAD) and field capacity.
export function MoistureGauge({ vwc, wp, refill, fc }) {
  const top = Math.max(fc * 1.25, (vwc || 0) * 1.05, 1);
  const pct = (v) => `${Math.min(100, Math.max(0, (v / top) * 100))}%`;
  return (
    <View style={{ marginTop: 6 }}>
      <View style={ui.gaugeTrack}>
        <View style={[ui.gaugeZone, { left: 0, width: pct(wp), backgroundColor: C.dangerSoft }]} />
        <View
          style={[ui.gaugeZone, { left: pct(wp), width: `${((refill - wp) / top) * 100}%`, backgroundColor: C.warnSoft }]}
        />
        <View
          style={[ui.gaugeZone, { left: pct(refill), width: `${((fc - refill) / top) * 100}%`, backgroundColor: C.primarySoft }]}
        />
        <View style={[ui.gaugeZone, { left: pct(fc), right: 0, backgroundColor: C.waterSoft }]} />
        {vwc !== null && vwc !== undefined ? (
          <View style={[ui.gaugeNeedle, { left: pct(vwc) }]}>
            <View style={ui.gaugeDot} />
          </View>
        ) : null}
      </View>
      <View style={{ height: 30 }}>
        {[
          { v: wp, label: "Wilting", color: C.danger },
          { v: refill, label: "Refill", color: C.warn },
          { v: fc, label: "Capacity", color: C.water },
        ].map((m) => (
          <View key={m.label} style={[ui.gaugeMark, { left: pct(m.v) }]}>
            <View style={[ui.gaugeTick, { backgroundColor: m.color }]} />
            <Text style={ui.gaugeMarkTxt}>
              {m.label} {Math.round(m.v)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const ui = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOW,
  },
  cardPad: { padding: 16 },

  secRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 10, marginTop: 6 },
  secTitle: { fontSize: 17, fontWeight: "800", color: C.text, letterSpacing: -0.2 },
  secSub: { fontSize: 12, color: C.textFaint, marginTop: 2 },
  secAction: { fontSize: 13, fontWeight: "700", color: C.primary },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    maxWidth: "100%",
  },
  badgeTxt: { fontSize: 11.5, fontWeight: "700" },

  tile: {
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    flex: 1,
    minWidth: 0,
  },
  tileLabel: { fontSize: 11.5, color: C.textMuted, fontWeight: "600", marginTop: 8 },
  tileValue: { fontSize: 19, fontWeight: "800", color: C.text, marginTop: 1 },
  tileUnit: { fontSize: 12, fontWeight: "600", color: C.textFaint },
  tileHint: { fontSize: 10.5, color: C.textFaint, marginTop: 2 },

  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  infoLabel: { flex: 1, fontSize: 14, color: C.textMuted },
  infoValue: { fontSize: 14, color: C.text, fontWeight: "700", maxWidth: "60%", textAlign: "right" },

  btn: {
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  btnPrimary: {
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnPrimaryDisabled: { backgroundColor: C.primaryMid, elevation: 0, shadowOpacity: 0 },
  btnOutline: { borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.white },
  btnGhost: { backgroundColor: C.primarySoft },
  btnDanger: { borderWidth: 1.5, borderColor: C.danger + "55", backgroundColor: C.dangerSoft },
  btnTxt: { fontSize: 15.5, fontWeight: "800", letterSpacing: 0.3 },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: C.textMuted, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#FAFCFB",
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    minHeight: 52,
    gap: 8,
  },
  inputFocused: { borderColor: C.primary, backgroundColor: C.white },
  inputError: { borderColor: C.danger, backgroundColor: "#FFF8F8" },
  input: { flex: 1, fontSize: 16, color: C.text, paddingVertical: 12 },
  prefix: { borderRightWidth: 1, borderRightColor: C.border, paddingRight: 10 },
  prefixTxt: { fontSize: 16, fontWeight: "700", color: C.primary },
  errorTxt: { fontSize: 12, color: C.danger, marginTop: 5, marginLeft: 2, fontWeight: "600" },
  hintTxt: { fontSize: 12, color: C.textFaint, marginTop: 5, marginLeft: 2 },

  banner: {
    flexDirection: "row",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
  },
  bannerTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  bannerMsg: { fontSize: 13, color: C.textMuted, lineHeight: 19 },
  bannerAction: { fontSize: 13, fontWeight: "800" },

  empty: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: C.text, textAlign: "center" },
  emptyMsg: { fontSize: 13.5, color: C.textMuted, textAlign: "center", marginTop: 6, lineHeight: 20 },

  loading: { alignItems: "center", paddingVertical: 60 },
  loadingTxt: { color: C.textFaint, marginTop: 12, fontSize: 14 },

  seg: {
    flexDirection: "row",
    backgroundColor: C.divider,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  segItemActive: { backgroundColor: C.white, ...SHADOW, elevation: 1 },
  segTxt: { fontSize: 13.5, fontWeight: "700", color: C.textMuted },
  segTxtActive: { color: C.primaryDark },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 13, fontWeight: "700", color: C.textMuted },
  chipTxtActive: { color: C.white },

  gaugeTrack: {
    height: 14,
    borderRadius: 7,
    overflow: "visible",
    backgroundColor: C.divider,
    position: "relative",
  },
  gaugeZone: { position: "absolute", top: 0, bottom: 0 },
  gaugeNeedle: { position: "absolute", top: -5, marginLeft: -12, width: 24, alignItems: "center" },
  gaugeDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primaryDark,
    borderWidth: 4,
    borderColor: C.white,
    ...SHADOW,
    elevation: 4,
  },
  gaugeMark: { position: "absolute", top: 4, alignItems: "center", width: 64, marginLeft: -32 },
  gaugeTick: { width: 2, height: 6, borderRadius: 1, marginBottom: 2 },
  gaugeMarkTxt: { fontSize: 9.5, color: C.textFaint, fontWeight: "700" },
});
