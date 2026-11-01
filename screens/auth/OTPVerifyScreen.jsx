/**
 * OTPVerifyScreen.jsx — AgroSmart
 * ─────────────────────────────────────────────────────────────
 * Flow:
 *  1. User enters 6-digit OTP received on their phone
 *  2. Verify OTP using Firebase confirmation object
 *  3. On success → navigate to SetPasswordScreen
 *  4. Resend OTP option after 30 seconds
 * ─────────────────────────────────────────────────────────────
 */

import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { signInWithPhoneNumber } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, firebaseConfig } from "../../config/firebase";

const GREEN = "#3AAA6B";
const GREEN_LIGHT = "#e8f5ee";
const AMBER = "#FFF9C4";
const RED = "#e53935";

// ─── OTP Illustration ─────────────────────────────────────────────────────────
function OTPIllustration({ phone }) {
  const masked = phone
    ? phone.slice(0, 5) + "XXXXX" + phone.slice(-2)
    : "XXXXXXXXXXX";
  return (
    <View style={ill.wrap}>
      <View style={ill.glow} />
      <View style={ill.card}>
        <Text style={ill.smsIcon}>💬</Text>
        <Text style={ill.otp}>_ _ _ _ _ _</Text>
        <Text style={ill.sentTo}>Sent to {masked}</Text>
      </View>
    </View>
  );
}
const ill = StyleSheet.create({
  wrap: {
    alignItems: "center",
    height: 160,
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
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    minWidth: 180,
  },
  smsIcon: { fontSize: 32, marginBottom: 8 },
  otp: {
    fontSize: 20,
    fontWeight: "900",
    color: GREEN,
    letterSpacing: 8,
    marginBottom: 6,
  },
  sentTo: { fontSize: 11, color: "#888", fontWeight: "500" },
});

// ─── OTP Box — 6 individual digit boxes ──────────────────────────────────────
function OTPBoxes({ value, onChange }) {
  const inputRef = useRef(null);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={ob.row}
    >
      {[...Array(6)].map((_, i) => {
        const digit = value[i] || "";
        const active = value.length === i || (value.length === 6 && i === 5);
        return (
          <View
            key={i}
            style={[ob.box, active && ob.boxActive, digit && ob.boxFilled]}
          >
            <Text style={ob.digit}>{digit}</Text>
          </View>
        );
      })}
      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/[^0-9]/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={ob.hidden}
        autoFocus
      />
    </TouchableOpacity>
  );
}
const ob = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 8,
  },
  box: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  boxFilled: { borderColor: GREEN },
  digit: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OTPVerifyScreen({ navigation, route }) {
  const { phone } = route.params;
  let { confirmation } = route.params;

  const recaptchaVerifier = useRef(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // ── Countdown timer ────────────────────────────────────────────
  useEffect(() => {
    if (timer === 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  // ── Verify OTP ─────────────────────────────────────────────────
  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      await confirmation.confirm(otp);
      // OTP verified ✅ — go to set password
      navigation.navigate("SetPassword", { phone });
    } catch (err) {
      console.error("OTP error:", err);
      Alert.alert(
        "Invalid OTP",
        "The OTP you entered is incorrect. Please try again.",
      );
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      const newConfirmation = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaVerifier.current,
      );
      confirmation = newConfirmation;
      setOtp("");
      setTimer(30);
      setCanResend(false);
      Alert.alert("OTP Sent", "A new OTP has been sent to your number.");
    } catch (err) {
      Alert.alert("Error", "Could not resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
      />

      <View style={s.topBar} />

      <View style={s.container}>
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <OTPIllustration phone={phone} />

        <Text style={s.heading}>Verify OTP 🔐</Text>
        <Text style={s.subheading}>
          Enter the 6-digit code sent to{"\n"}
          <Text style={s.phoneHighlight}>{phone}</Text>
        </Text>

        {/* OTP boxes */}
        <OTPBoxes value={otp} onChange={setOtp} />

        {/* Timer / Resend */}
        <View style={s.resendRow}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={s.resendActive}>Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.resendTimer}>
              Resend OTP in{" "}
              <Text style={s.timerNum}>0:{String(timer).padStart(2, "0")}</Text>
            </Text>
          )}
        </View>

        {/* Verify button */}
        <TouchableOpacity
          style={[s.btn, otp.length !== 6 && s.btnDisabled]}
          onPress={handleVerify}
          disabled={otp.length !== 6 || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>VERIFY OTP</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  topBar: { height: 8, backgroundColor: "#a5d6a7" },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  backBtn: { marginBottom: 8 },
  backText: { color: GREEN, fontSize: 14, fontWeight: "700" },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  phoneHighlight: { color: GREEN, fontWeight: "700" },
  resendRow: { alignItems: "center", marginBottom: 28, marginTop: 12 },
  resendActive: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  resendTimer: { fontSize: 13, color: "#999" },
  timerNum: { color: GREEN, fontWeight: "700" },
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
