// Forgot password — 3 steps:
//   1. Mobile number → SMS OTP sent via Firebase Phone Auth
//   2. Enter the 6-digit OTP → Firebase returns an ID token for that number
//   3. New password → Supabase verifies the token with Google, then updates
//      the password of the account with that verified number.

import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthShell } from "../../components/srijan/layout";
import { useRecaptchaVerifier } from "../../components/srijan/RecaptchaModal";
import { Banner, Button, Field, Icon, PasswordField } from "../../components/srijan/ui";
import { C, RADIUS } from "../../constants/colors";
import { isPhoneRegistered, resetPasswordWithOtp } from "../../services/api/userService";
import { otpErrorMessage, sendOtp, signOutFirebase, verifyOtp } from "../../services/auth/firebaseAuthServices";
import { onlyDigits, toE164India } from "../../utils/format";

const RESEND_SECONDS = 30;

function OtpBoxes({ value, onChange }) {
  const ref = useRef(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} style={o.row}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const digit = value[i] || "";
        const active = value.length === i || (value.length === 6 && i === 5);
        return (
          <View key={i} style={[o.box, digit && o.boxFilled, active && o.boxActive]}>
            <Text style={o.digit}>{digit}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(onlyDigits(v, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        style={o.hidden}
      />
    </Pressable>
  );
}

export default function ForgotPasswordScreen({ navigation, route }) {
  const { verifier, modal } = useRecaptchaVerifier();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState(onlyDigits(route.params?.phone || "", 10));
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const confirmation = useRef(null);
  const idToken = useRef(null);

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const t = setTimeout(() => setSecondsLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // Leave no Firebase session behind
  useEffect(() => () => signOutFirebase(), []);

  const e164 = toE164India(phone);

  const requestOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!(await isPhoneRegistered(e164))) {
        setError("No account is registered with this mobile number.");
        return;
      }
      confirmation.current = await sendOtp(e164, verifier);
      setOtp("");
      setSecondsLeft(RESEND_SECONDS);
      setStep(2);
    } catch (e) {
      setError(e.code ? otpErrorMessage(e) : e.message);
    } finally {
      setLoading(false);
    }
  };

  const checkOtp = async (code = otp) => {
    if (code.length !== 6 || !confirmation.current || loading) return;
    setLoading(true);
    setError(null);
    try {
      idToken.current = await verifyOtp(confirmation.current, code);
      setStep(3);
    } catch (e) {
      setError(otpErrorMessage(e));
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when all 6 digits are typed
  const onOtpChange = (v) => {
    setOtp(v);
    if (error) setError(null);
    if (v.length === 6) checkOtp(v);
  };

  const savePassword = async () => {
    setLoading(true);
    setError(null);
    try {
      await resetPasswordWithOtp(idToken.current, password);
      await signOutFirebase();
      Alert.alert("Password updated", "You can now log in with your new password.", [
        { text: "Log in", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (e) {
      if (e.code === "OTP_INVALID") {
        // Firebase tokens last 1 hour — start again from the phone step.
        setStep(1);
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError(null);
    if (step === 1) navigation.goBack();
    else setStep(1); // a new OTP is needed either way
  };

  const titles = {
    1: ["Forgot password", "Enter your registered mobile number. We'll send you a 6-digit OTP."],
    2: ["Enter OTP", `We sent a 6-digit code to +91 ${phone}.`],
    3: ["Create new password", "Choose a new password for your account."],
  };

  const footer =
    step === 1 ? (
      <Button title="Send OTP" icon="message-text-outline" onPress={requestOtp} disabled={phone.length !== 10} loading={loading} />
    ) : step === 2 ? (
      <Button title="Verify OTP" icon="shield-check-outline" onPress={() => checkOtp()} disabled={otp.length !== 6} loading={loading} />
    ) : (
      <Button
        title="Save new password"
        icon="lock-check-outline"
        onPress={savePassword}
        disabled={password.length < 6 || confirm !== password}
        loading={loading}
      />
    );

  return (
    <AuthShell title={titles[step][0]} subtitle={titles[step][1]} onBack={goBack} footer={footer}>
      {modal}

      <View style={st.steps}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[st.bar, n <= step && st.barOn]} />
        ))}
      </View>

      {error ? <Banner message={error} style={{ marginBottom: 16 }} /> : null}

      {step === 1 ? (
        <Field
          label="Mobile number"
          prefix="+91"
          placeholder="10-digit number"
          keyboardType="number-pad"
          maxLength={10}
          value={phone}
          onChangeText={(v) => setPhone(onlyDigits(v, 10))}
          error={phone.length > 0 && phone.length < 10 ? "Enter a 10-digit mobile number" : null}
          hint="You may be asked to tick “I'm not a robot” before the OTP is sent."
        />
      ) : null}

      {step === 2 ? (
        <>
          <OtpBoxes value={otp} onChange={onOtpChange} />
          <View style={st.resendRow}>
            {secondsLeft > 0 ? (
              <Text style={st.resendWait}>
                Resend OTP in <Text style={{ color: C.primary, fontWeight: "800" }}>0:{String(secondsLeft).padStart(2, "0")}</Text>
              </Text>
            ) : (
              <Pressable onPress={requestOtp} disabled={loading} hitSlop={8}>
                <Text style={st.resend}>Resend OTP</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setStep(1)} hitSlop={8}>
              <Text style={st.change}>Change number</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <View style={st.verified}>
            <Icon name="check-decagram" size={20} color={C.primary} />
            <Text style={st.verifiedTxt}>+91 {phone} verified</Text>
          </View>
          <PasswordField
            label="New password"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            error={password.length > 0 && password.length < 6 ? "At least 6 characters" : null}
          />
          <PasswordField
            label="Confirm new password"
            placeholder="Re-enter password"
            value={confirm}
            onChangeText={setConfirm}
            returnKeyType="done"
            onSubmitEditing={savePassword}
            error={confirm.length > 0 && confirm !== password ? "Passwords don't match" : null}
          />
        </>
      ) : null}
    </AuthShell>
  );
}

const o = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  box: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#FAFCFB",
    alignItems: "center",
    justifyContent: "center",
  },
  boxFilled: { borderColor: C.primaryMid, backgroundColor: C.white },
  boxActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  digit: { fontSize: 22, fontWeight: "900", color: C.text },
  hidden: { position: "absolute", width: 1, height: 1, opacity: 0 },
});

const st = StyleSheet.create({
  steps: { flexDirection: "row", gap: 6, marginBottom: 20 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.divider },
  barOn: { backgroundColor: C.primary },
  resendRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  resendWait: { fontSize: 13.5, color: C.textMuted },
  resend: { fontSize: 13.5, fontWeight: "800", color: C.primary },
  change: { fontSize: 13.5, fontWeight: "700", color: C.textMuted },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primarySoft,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 18,
  },
  verifiedTxt: { fontSize: 14, fontWeight: "800", color: C.primaryDark },
});
