// Two-step registration:
//   1. Account   — name, mobile, password
//   2. Your farm — Farm ID (checked against farm_profiles) + optional location
// On success the user is logged in and AuthGate opens the main app.

import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AuthShell } from "../../components/srijan/layout";
import { Banner, Button, Field, Icon, PasswordField } from "../../components/srijan/ui";
import { C, RADIUS } from "../../constants/colors";
import { CROP } from "../../constants/enums";
import { useAuth } from "../../context/AuthContext";
import { getFarmProfile } from "../../services/api/sensorService";
import { isPhoneRegistered } from "../../services/api/userService";
import { fmt, onlyDigits, toE164India } from "../../utils/format";

function Steps({ step }) {
  return (
    <View style={s.steps}>
      {["Account", "Your farm"].map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <View key={label} style={s.stepItem}>
            <View style={[s.stepDot, (active || done) && s.stepDotOn]}>
              {done ? (
                <Icon name="check" size={14} color={C.white} />
              ) : (
                <Text style={[s.stepNum, active && { color: C.white }]}>{n}</Text>
              )}
            </View>
            <Text style={[s.stepLabel, active && { color: C.text }]}>{label}</Text>
            {i === 0 ? <View style={[s.stepLine, done && { backgroundColor: C.primary }]} /> : null}
          </View>
        );
      })}
    </View>
  );
}

// Looks up the typed Farm ID in farm_profiles (debounced).
// The result is keyed by ID, so a stale result reads as "checking".
function useFarmLookup(farmId) {
  const id = farmId.trim().toUpperCase();
  const [result, setResult] = useState({ id: null, status: "idle", farm: null });
  useEffect(() => {
    if (id.length < 3) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const farm = await getFarmProfile(id);
        if (!cancelled) setResult({ id, status: farm ? "found" : "missing", farm });
      } catch {
        if (!cancelled) setResult({ id, status: "error", farm: null });
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [id]);
  if (id.length < 3) return { status: "idle", farm: null };
  if (result.id !== id) return { status: "checking", farm: null };
  return result;
}

function ChoiceCard({ selected, icon, title, body, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.choice, selected && s.choiceOn]}>
      <View style={[s.choiceIcon, selected && { backgroundColor: C.primary }]}>
        <Icon name={icon} size={22} color={selected ? C.white : C.primary} />
      </View>
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <Text style={s.choiceTitle}>{title}</Text>
        <Text style={s.choiceBody}>{body}</Text>
      </View>
      <Icon
        name={selected ? "radiobox-marked" : "radiobox-blank"}
        size={22}
        color={selected ? C.primary : C.textFaint}
      />
    </Pressable>
  );
}

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // false → a new farm (FARM_002, FARM_003, …) is created on the server
  const [hasDevice, setHasDevice] = useState(false);
  const [farmId, setFarmId] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");

  const lookup = useFarmLookup(hasDevice ? farmId : "");

  const phoneError = phone.length > 0 && phone.length < 10 ? "Enter a 10-digit mobile number" : null;
  const passError = password.length > 0 && password.length < 6 ? "At least 6 characters" : null;
  const confirmError = confirm.length > 0 && confirm !== password ? "Passwords don't match" : null;
  const emailError = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email) ? "Enter a valid email" : null;
  const step1Ready = name.trim().length >= 2 && phone.length === 10 && password.length >= 6 && confirm === password;
  const step2Ready =
    (!hasDevice || lookup.status === "found") && !emailError && (pin.length === 0 || pin.length === 6);

  const goStep2 = async () => {
    if (!step1Ready) return;
    setLoading(true);
    setError(null);
    try {
      if (await isPhoneRegistered(toE164India(phone))) {
        setError("This mobile number is already registered. Please log in instead.");
        return;
      }
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async () => {
    if (!step2Ready) return;
    setLoading(true);
    setError(null);
    try {
      await register({
        phone: toE164India(phone),
        password,
        fullName: name.trim(),
        farmId: hasDevice ? farmId.trim().toUpperCase() : null,
        email: email.trim(),
        village,
        district,
        state: stateName,
        pinCode: pin,
      });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const footer =
    step === 1 ? (
      <Button title="Continue" icon="arrow-right" onPress={goStep2} disabled={!step1Ready} loading={loading} />
    ) : (
      <Button
        title="Create account"
        icon="check-circle-outline"
        onPress={createAccount}
        disabled={!step2Ready}
        loading={loading}
      />
    );

  return (
    <AuthShell
      title={step === 1 ? "Create your account" : "Your farm"}
      subtitle={
        step === 1
          ? "Takes less than a minute."
          : "We'll set up your farm automatically. Add where it is so we can help you better."
      }
      onBack={() => {
        setError(null);
        if (step === 2) setStep(1);
        else navigation.goBack();
      }}
      footer={footer}
    >
      <Steps step={step} />
      {error ? (
        <Banner
          message={error}
          style={{ marginBottom: 16 }}
          action={error.includes("already registered") ? "Go to login" : undefined}
          onAction={() => navigation.navigate("Login")}
        />
      ) : null}

      {step === 1 ? (
        <>
          <Field
            label="Full name"
            icon="account-outline"
            placeholder="e.g. Ramesh Kumar"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Field
            label="Mobile number"
            prefix="+91"
            placeholder="10-digit number"
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={(v) => setPhone(onlyDigits(v, 10))}
            error={phoneError}
            hint="You'll use this number to log in."
          />
          <PasswordField
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            error={passError}
          />
          <PasswordField
            label="Confirm password"
            placeholder="Re-enter password"
            value={confirm}
            onChangeText={setConfirm}
            error={confirmError}
          />
        </>
      ) : (
        <>
          <ChoiceCard
            selected={!hasDevice}
            icon="sprout"
            title="Set up a new farm for me"
            body="We'll create your Farm ID automatically (like FARM_002). You'll see it on your dashboard."
            onPress={() => setHasDevice(false)}
          />
          <ChoiceCard
            selected={hasDevice}
            icon="router-wireless"
            title="I already have a Farm ID"
            body="Your device was already set up with an ID, e.g. FARM_001."
            onPress={() => setHasDevice(true)}
          />

          {hasDevice ? (
            <Field
              label="Farm ID"
              icon="barn"
              placeholder="e.g. FARM_001"
              autoCapitalize="characters"
              autoCorrect={false}
              value={farmId}
              onChangeText={setFarmId}
              style={{ marginTop: 6 }}
              right={
                lookup.status === "checking" ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : lookup.status === "found" ? (
                  <Icon name="check-circle" size={22} color={C.primary} />
                ) : lookup.status === "missing" ? (
                  <Icon name="close-circle" size={22} color={C.danger} />
                ) : null
              }
              error={
                lookup.status === "missing"
                  ? "No farm with this ID. Check the farm_id set in your Node B firmware."
                  : lookup.status === "error"
                    ? "Couldn't check the Farm ID. Check your internet."
                    : null
              }
            />
          ) : null}

          {hasDevice && lookup.status === "found" && lookup.farm ? (
            <View style={s.farmCard}>
              <View style={s.farmHead}>
                <Icon name="sprout" size={20} color={C.primary} />
                <Text style={s.farmTitle}>
                  {lookup.farm.farm_id} · {lookup.farm.field_id}
                </Text>
              </View>
              <Text style={s.farmLine}>
                {CROP[lookup.farm.crop_id] || "Crop"} · {fmt(lookup.farm.field_area_m2, 0)} m² field · Node{" "}
                {lookup.farm.node_id}
              </Text>
            </View>
          ) : null}

          <Text style={s.optional}>Location (optional)</Text>
          <Field label="Village / Town" icon="home-outline" value={village} onChangeText={setVillage} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Field label="District" value={district} onChangeText={setDistrict} style={{ flex: 1 }} />
            <Field label="State" value={stateName} onChangeText={setStateName} style={{ flex: 1 }} />
          </View>
          <Field
            label="PIN code"
            keyboardType="number-pad"
            maxLength={6}
            value={pin}
            onChangeText={(v) => setPin(onlyDigits(v, 6))}
            error={pin.length > 0 && pin.length < 6 ? "PIN code has 6 digits" : null}
          />
          <Field
            label="Email"
            icon="email-outline"
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            error={emailError}
          />
        </>
      )}
    </AuthShell>
  );
}

const s = StyleSheet.create({
  steps: { flexDirection: "row", marginBottom: 22 },
  stepItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotOn: { backgroundColor: C.primary },
  stepNum: { fontSize: 12.5, fontWeight: "800", color: C.textFaint },
  stepLabel: { marginLeft: 8, fontSize: 13, fontWeight: "700", color: C.textFaint },
  stepLine: { flex: 1, height: 2, backgroundColor: C.divider, marginHorizontal: 10, borderRadius: 1 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
  },
  choiceOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  choiceIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  choiceBody: { fontSize: 12.5, color: C.textMuted, marginTop: 2, lineHeight: 17 },
  farmCard: {
    backgroundColor: C.primarySoft,
    borderRadius: RADIUS.md,
    padding: 14,
    marginTop: -4,
    marginBottom: 18,
  },
  farmHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  farmTitle: { fontSize: 15, fontWeight: "800", color: C.primaryDark },
  farmLine: { fontSize: 13, color: C.textMuted },
  optional: {
    fontSize: 12,
    fontWeight: "800",
    color: C.textFaint,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
});
