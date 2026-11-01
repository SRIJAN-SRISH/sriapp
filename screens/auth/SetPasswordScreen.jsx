/**
 * SetPasswordScreen.jsx — AgroSmart
 * ─────────────────────────────────────────────────────────────
 * Flow:
 *  1. User creates a new password (min 6 chars, confirmed twice)
 *  2. Save phone + password to Supabase `users` table
 *  3. Navigate to Onboarding flow
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../config/supabase";

const GREEN = "#3AAA6B";
const GREEN_LIGHT = "#e8f5ee";
const AMBER = "#FFF9C4";
const RED = "#e53935";
const ORANGE = "#ff9800";

// ── Password strength checker ─────────────────────────────────────────────────
function getStrength(pass) {
  if (pass.length === 0) return { level: 0, label: "", color: "#ddd" };
  if (pass.length < 6) return { level: 1, label: "Too short", color: RED };
  if (pass.length < 8) return { level: 2, label: "Weak", color: ORANGE };
  const hasUpper = /[A-Z]/.test(pass);
  const hasNum = /[0-9]/.test(pass);
  const hasSymbol = /[^A-Za-z0-9]/.test(pass);
  const extras = [hasUpper, hasNum, hasSymbol].filter(Boolean).length;
  if (extras === 0) return { level: 2, label: "Weak", color: ORANGE };
  if (extras === 1) return { level: 3, label: "Medium", color: "#fbc02d" };
  return { level: 4, label: "Strong", color: GREEN };
}

function StrengthBar({ password }) {
  const { level, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <View style={sb.wrap}>
      <View style={sb.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              sb.bar,
              { backgroundColor: i <= level ? color : "#e0e0e0" },
            ]}
          />
        ))}
      </View>
      <Text style={[sb.label, { color }]}>{label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  bars: { flexDirection: "row", gap: 4, flex: 1 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: 12, fontWeight: "700", width: 52, textAlign: "right" },
});

// ─── Lock Illustration ────────────────────────────────────────────────────────
function LockIllustration() {
  return (
    <View style={ill.wrap}>
      <View style={ill.glow} />
      <View style={ill.card}>
        <View style={ill.lockTop} />
        <View style={ill.lockBody}>
          <View style={ill.keyhole} />
        </View>
        <View style={ill.dots}>
          {[...Array(3)].map((_, i) => (
            <View key={i} style={ill.dot} />
          ))}
        </View>
      </View>
    </View>
  );
}
const ill = StyleSheet.create({
  wrap: {
    alignItems: "center",
    height: 170,
    justifyContent: "center",
    marginBottom: 8,
  },
  glow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: AMBER,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  lockTop: {
    width: 32,
    height: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 4,
    borderColor: GREEN,
    borderBottomWidth: 0,
    marginBottom: -2,
  },
  lockBody: {
    width: 52,
    height: 40,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  keyhole: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    marginTop: 2,
  },
  dots: { flexDirection: "row", gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#c8e6c9" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SetPasswordScreen({ navigation, route }) {
  const { phone } = route.params;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);
  const passMatch = confirm.length > 0 && password === confirm;
  const passMismatch = confirm.length > 0 && password !== confirm;
  const isReady = strength.level >= 2 && passMatch;

  const handleSave = async () => {
    if (!isReady) return;
    setLoading(true);

    try {
      // ── Insert new user into Supabase ──
      const { error } = await supabase.from("users").insert({
        phone,
        password, // ⚠️ hash in production using Edge Function
        onboarding_complete: false,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // ── Go to onboarding ──
      navigation.replace("Onboarding", { phone });
    } catch (err) {
      console.error("SetPassword error:", err);
      Alert.alert("Error", "Could not save your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.topBar} />

      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <LockIllustration />

        <Text style={s.heading}>Create Password 🔒</Text>
        <Text style={s.subheading}>
          Set a strong password for{"\n"}
          <Text style={s.phoneHighlight}>{phone}</Text>
        </Text>

        {/* ── Password ── */}
        <Text style={s.label}>New Password</Text>
        <View
          style={[
            s.inputRow,
            password.length > 0 && strength.level < 2 ? s.inputError : null,
            password.length > 0 && strength.level >= 2 ? s.inputSuccess : null,
          ]}
        >
          <TextInput
            style={[s.textInput, { flex: 1 }]}
            placeholder="Minimum 6 characters"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
            returnKeyType="next"
          />
          <TouchableOpacity
            onPress={() => setShowPass(!showPass)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.eye}>{showPass ? "👁️" : "👁️‍🗨️"}</Text>
          </TouchableOpacity>
        </View>
        <StrengthBar password={password} />

        {/* ── Confirm Password ── */}
        <Text style={s.label}>Confirm Password</Text>
        <View
          style={[
            s.inputRow,
            passMismatch ? s.inputError : null,
            passMatch ? s.inputSuccess : null,
          ]}
        >
          <TextInput
            style={[s.textInput, { flex: 1 }]}
            placeholder="Re-enter password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={setConfirm}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <TouchableOpacity
            onPress={() => setShowConfirm(!showConfirm)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.eye}>{showConfirm ? "👁️" : "👁️‍🗨️"}</Text>
          </TouchableOpacity>
        </View>
        {passMismatch && (
          <Text style={s.errorText}>Passwords do not match</Text>
        )}
        {passMatch && <Text style={s.successText}>✓ Passwords match</Text>}

        {/* Tips */}
        <View style={s.tipsBox}>
          <Text style={s.tipsTitle}>Password tips:</Text>
          <Text style={s.tip}>• At least 6 characters</Text>
          <Text style={s.tip}>
            • Mix uppercase, numbers & symbols for a stronger password
          </Text>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[s.btn, !isReady && s.btnDisabled]}
          onPress={handleSave}
          disabled={!isReady || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>SET PASSWORD</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  topBar: { height: 8, backgroundColor: "#a5d6a7" },
  kav: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  phoneHighlight: { color: GREEN, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 54,
    marginBottom: 6,
    backgroundColor: "#fafafa",
    gap: 8,
  },
  inputSuccess: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  inputError: { borderColor: RED, backgroundColor: "#fff5f5" },
  textInput: { flex: 1, fontSize: 16, color: "#1a1a1a" },
  eye: { fontSize: 20 },
  errorText: {
    fontSize: 12,
    color: RED,
    marginBottom: 10,
    marginLeft: 4,
    fontWeight: "500",
  },
  successText: {
    fontSize: 12,
    color: GREEN,
    marginBottom: 10,
    marginLeft: 4,
    fontWeight: "600",
  },
  tipsBox: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  tipsTitle: { fontSize: 12, fontWeight: "700", color: GREEN, marginBottom: 4 },
  tip: { fontSize: 12, color: "#555", lineHeight: 20 },
  btn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: GREEN,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  btnDisabled: { backgroundColor: "#b2d8c4", elevation: 0, shadowOpacity: 0 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 2 },
});
