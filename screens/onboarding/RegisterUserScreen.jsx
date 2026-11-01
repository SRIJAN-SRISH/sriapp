/**
 * OnboardingScreen.jsx — AgroSmart
 * ─────────────────────────────────────────────────────────────
 * 9 Steps total:
 *  1. UserProfileScreen   — Name, Email, Country, State, District, PIN, Land Size
 *  2. FarmDetailsScreen   — Farm Name, Farm Size, Farm Address
 *  3. PlotDetailsScreen   — Plot Name, Plot Size, Field Type
 *  4. SoilTypeScreen      — 9-option soil grid
 *  5. PlotLocationScreen  — GPS location
 *  6. CropSelectionScreen — Crop picker
 *  7. CropDateScreen      — Sowing date + transplantation
 *  8. DeviceScreen        — Device confirmation
 *  9. SetPasswordScreen   — Password + Confirm (saves everything to user_profiles)
 *
 * Supabase tables:
 *   user_profiles  — phone, password, name, email, country, state,
 *                    district, pin_code, total_land_size, has_device,
 *                    onboarding_complete
 *   farms          — id, user_phone, name, size_acres, address_line1, address_line2
 *   plots          — id, farm_id, name, size_value, size_unit, field_type,
 *                    soil_type, latitude, longitude, current_crop
 *   crop_seasons   — id, plot_id, crop_name, sowing_date, transplantation_done
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../config/supabase"; // ← adjust path

// ─── Theme ────────────────────────────────────────────────────────────────────
const G = "#3AAA6B";
const G_LIGHT = "#e8f5ee";
const G_DARK = "#2d8a56";
const G_DEEP = "#0F4D2C";
const AMBER = "#FFF9C4";
const RED = "#e53935";
const ORANGE = "#ff9800";

const TOTAL_STEPS = 9;

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Avatar (Rajesh)
// ──────────────────────────────────────────────────────────────────────────────
function Avatar() {
  return (
    <View style={av.wrap}>
      <View style={av.circle}>
        <View style={av.head} />
        <View style={av.mustache} />
        <View style={av.body} />
      </View>
    </View>
  );
}
const av = StyleSheet.create({
  wrap: { alignItems: "center", marginVertical: 10 },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: G_LIGHT,
    borderWidth: 1,
    borderColor: "#c8e6c9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  head: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#d4956a",
    marginBottom: -4,
  },
  mustache: {
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3d2b1f",
    marginBottom: 2,
  },
  body: { width: 36, height: 20, borderRadius: 8, backgroundColor: "#2e7d32" },
});

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Layout wrapper
// ──────────────────────────────────────────────────────────────────────────────
function OnboardingLayout({ step, onBack, children, scrollable = false }) {
  const pct = `${(step / TOTAL_STEPS) * 100}%`;
  const Inner = scrollable ? ScrollView : View;

  return (
    <SafeAreaView style={l.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top accent */}
      <View style={l.topBar} />

      {/* Progress bar */}
      <View style={l.track}>
        <View style={[l.fill, { width: pct }]} />
      </View>

      {/* Step counter + back + lang */}
      <View style={l.nav}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={l.back}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
        <Text style={l.stepLabel}>
          Step {step} of {TOTAL_STEPS}
        </Text>
        <Text style={l.lang}>English</Text>
      </View>

      <View style={l.divider} />
      <Avatar />

      <Inner
        style={{ flex: 1 }}
        contentContainerStyle={scrollable ? l.scrollContent : undefined}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Inner>
    </SafeAreaView>
  );
}
const l = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  topBar: { height: 8, backgroundColor: "#a5d6a7" },
  track: { height: 4, backgroundColor: "#e0e0e0" },
  fill: { height: 4, backgroundColor: G },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  back: { fontSize: 22, color: G, fontWeight: "700" },
  stepLabel: { fontSize: 12, color: "#999", fontWeight: "600" },
  lang: { fontSize: 14, color: G, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginHorizontal: 20 },
  scrollContent: { paddingBottom: 110 },
});

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Field label
// ──────────────────────────────────────────────────────────────────────────────
function Label({ text, required }) {
  return (
    <Text style={f.label}>
      {text}
      {required && <Text style={{ color: RED }}> *</Text>}
    </Text>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Text input field
// ──────────────────────────────────────────────────────────────────────────────
function Field({ label, required, success, error, ...props }) {
  return (
    <View style={f.wrap}>
      {label ? <Label text={label} required={required} /> : null}
      <TextInput
        style={[f.input, success && f.inputSuccess, error && f.inputError]}
        placeholderTextColor="#aaa"
        {...props}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Dropdown
// ──────────────────────────────────────────────────────────────────────────────
function Dropdown({ label, required, value, options, onSelect, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={f.wrap}>
      <Label text={label} required={required} />
      <TouchableOpacity
        style={[f.input, f.ddRow]}
        onPress={() => setOpen(!open)}
      >
        <Text style={value ? f.ddVal : f.ddPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={f.ddArrow}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={f.ddMenu}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={f.ddItem}
              onPress={() => {
                onSelect(opt);
                setOpen(false);
              }}
            >
              <Text style={f.ddItemText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Radio button
// ──────────────────────────────────────────────────────────────────────────────
function Radio({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={rb.row} onPress={onPress}>
      <View style={[rb.outer, selected && rb.outerSel]}>
        {selected && <View style={rb.inner} />}
      </View>
      <Text style={[rb.label, selected && rb.labelSel]}>{label}</Text>
    </TouchableOpacity>
  );
}
const rb = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  outer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#bbb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  outerSel: { borderColor: G },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: G },
  label: { fontSize: 15, color: "#555", fontWeight: "500" },
  labelSel: { color: "#1a1a1a", fontWeight: "700" },
});

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Continue button (sticky bottom)
// ──────────────────────────────────────────────────────────────────────────────
function ContinueBtn({ onPress, disabled, loading, label = "CONTINUE" }) {
  return (
    <View style={btn.wrap}>
      <TouchableOpacity
        style={[btn.btn, disabled && btn.disabled]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={btn.text}>{label}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
const btn = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  btn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: G,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: G,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  disabled: { backgroundColor: "#b2d8c4", elevation: 0, shadowOpacity: 0 },
  text: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 1.5 },
});

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Greeting text style
// ──────────────────────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  greeting: {
    fontSize: 16,
    color: "#1a1a1a",
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: "500",
  },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: "#1a1a1a",
  },
  inputSuccess: { borderColor: G, backgroundColor: G_LIGHT },
  inputError: { borderColor: RED, backgroundColor: "#fff5f5" },
  ddRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ddVal: { fontSize: 15, color: "#1a1a1a" },
  ddPlaceholder: { fontSize: 15, color: "#aaa" },
  ddArrow: { color: "#888", fontSize: 12 },
  ddMenu: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fff",
    maxHeight: 180,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  ddItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  ddItemText: { fontSize: 14, color: "#333" },
});

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — User Profile
// ══════════════════════════════════════════════════════════════════════════════
function UserProfileScreen({ onNext, data, setData }) {
  const [loading, setLoading] = useState(false);
  const isValid =
    data.name.trim() &&
    data.country &&
    data.state &&
    data.district &&
    data.pin.trim() &&
    data.landSize.trim();

  const handleContinue = async () => {
    setLoading(true);
    try {
      // Check if row exists (created at OTP step) then update it
      const { error } = await supabase.from("user_profiles").upsert(
        {
          phone: data.phone,
          name: data.name.trim(),
          email: data.email.trim() || null,
          country: data.country,
          state: data.state,
          district: data.district,
          pin_code: data.pin.trim(),
          total_land_size: parseFloat(data.landSize),
        },
        { onConflict: "phone" },
      );

      if (error) throw error;
      onNext();
    } catch (e) {
      Alert.alert("Error", e.message || "Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step={1} scrollable>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={sc.greeting}>
          Hello! I am Rajesh. I will be helping you to integrate your farm with
          AgroSmart. Ready to go?
        </Text>
        <Field
          label="Name"
          required
          placeholder="Enter your full name"
          value={data.name}
          onChangeText={(v) => setData({ ...data, name: v })}
        />
        <Field
          label="Email address"
          placeholder="Enter email (optional)"
          keyboardType="email-address"
          autoCapitalize="none"
          value={data.email}
          onChangeText={(v) => setData({ ...data, email: v })}
        />
        <Dropdown
          label="Country"
          required
          placeholder="Select a country"
          value={data.country}
          options={["India", "Nepal", "Bangladesh", "Sri Lanka"]}
          onSelect={(v) => setData({ ...data, country: v })}
        />
        <Dropdown
          label="State / Province"
          required
          placeholder="Select a State"
          value={data.state}
          options={[
            "Uttar Pradesh",
            "Maharashtra",
            "Punjab",
            "Rajasthan",
            "Gujarat",
            "Madhya Pradesh",
            "Karnataka",
            "Tamil Nadu",
            "Bihar",
            "Haryana",
          ]}
          onSelect={(v) => setData({ ...data, state: v })}
        />
        <Dropdown
          label="District and City/Town"
          required
          placeholder="Select a District"
          value={data.district}
          options={[
            "Agra",
            "Lucknow",
            "Varanasi",
            "Kanpur",
            "Pune",
            "Nashik",
            "Amritsar",
            "Jaipur",
            "Patna",
            "Hisar",
          ]}
          onSelect={(v) => setData({ ...data, district: v })}
        />
        <Field
          label="PIN/ZIP Code"
          required
          placeholder="Enter PIN / ZIP"
          keyboardType="number-pad"
          maxLength={6}
          value={data.pin}
          onChangeText={(v) => setData({ ...data, pin: v })}
        />
        <Field
          label="Total Land Size (in acres)"
          required
          placeholder="e.g. 5"
          keyboardType="decimal-pad"
          value={data.landSize}
          onChangeText={(v) => setData({ ...data, landSize: v })}
        />
      </View>
      <View style={{ height: 80 }} />
      <ContinueBtn
        onPress={handleContinue}
        disabled={!isValid}
        loading={loading}
      />
    </OnboardingLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Farm Details
// ══════════════════════════════════════════════════════════════════════════════
function FarmDetailsScreen({ onNext, onBack, data, setData, userName }) {
  const [loading, setLoading] = useState(false);
  const isValid = data.farmName.trim() && data.farmSize.trim();

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { data: farm, error } = await supabase
        .from("farms")
        .insert({
          user_phone: data.phone,
          name: data.farmName.trim(),
          size_acres: parseFloat(data.farmSize),
          address_line1: data.farmAddress.trim(),
          address_line2: data.farmAddress2.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      setData({ ...data, farmId: farm.id });
      onNext();
    } catch (e) {
      Alert.alert("Error", e.message || "Could not save farm.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step={2} onBack={onBack} scrollable>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={sc.greeting}>
          Nice to meet you {userName}! Tell us a little bit about your farm!
        </Text>
        <Field
          label="Farm Name"
          placeholder="e.g. Road wala khet"
          value={data.farmName}
          onChangeText={(v) => setData({ ...data, farmName: v })}
        />
        <Field
          label="Farm Size (in acres)"
          placeholder="e.g. 2"
          keyboardType="decimal-pad"
          value={data.farmSize}
          onChangeText={(v) => setData({ ...data, farmSize: v })}
        />
        <Label text="Farm Address" />
        <TextInput
          style={[f.input, { marginBottom: 10 }]}
          placeholder="Address line 1"
          placeholderTextColor="#aaa"
          value={data.farmAddress}
          onChangeText={(v) => setData({ ...data, farmAddress: v })}
        />
        <TextInput
          style={[f.input, { marginBottom: 16 }]}
          placeholder="Address line 2 (Optional)"
          placeholderTextColor="#aaa"
          value={data.farmAddress2}
          onChangeText={(v) => setData({ ...data, farmAddress2: v })}
        />
      </View>
      <View style={{ height: 80 }} />
      <ContinueBtn
        onPress={handleContinue}
        disabled={!isValid}
        loading={loading}
      />
    </OnboardingLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Plot Details
// ══════════════════════════════════════════════════════════════════════════════
function PlotDetailsScreen({ onNext, onBack, data, setData }) {
  const [loading, setLoading] = useState(false);
  const isValid = data.plotName.trim() && data.plotSize.trim();

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { data: plot, error } = await supabase
        .from("plots")
        .insert({
          farm_id: data.farmId,
          name: data.plotName.trim(),
          size_value: parseFloat(data.plotSize),
          size_unit: data.plotUnit,
          field_type: data.fieldType,
        })
        .select()
        .single();

      if (error) throw error;
      setData({ ...data, plotId: plot.id });
      onNext();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step={3} onBack={onBack}>
      <KeyboardAvoidingView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 4 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={sc.greeting}>
          Now that we know about your farm, let's create plots on your farm
        </Text>
        <Field
          label="Plot Name"
          placeholder="e.g. North Plot"
          value={data.plotName}
          onChangeText={(v) => setData({ ...data, plotName: v })}
        />
        <Text style={f.label}>Total Plot Size</Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <TextInput
            style={[f.input, { flex: 1, borderColor: G }]}
            placeholder="e.g. 2"
            placeholderTextColor="#aaa"
            keyboardType="decimal-pad"
            value={data.plotSize}
            onChangeText={(v) => setData({ ...data, plotSize: v })}
          />
          <View style={[f.input, { width: 110, justifyContent: "center" }]}>
            <Text style={{ fontSize: 14, color: "#333" }}>{data.plotUnit}</Text>
          </View>
        </View>
        <Text style={[f.label, { marginBottom: 10 }]}>
          Please select the field type
        </Text>
        <Radio
          label="Open Field"
          selected={data.fieldType === "Open Field"}
          onPress={() => setData({ ...data, fieldType: "Open Field" })}
        />
        <Radio
          label="Protected Cultivation"
          selected={data.fieldType === "Protected Cultivation"}
          onPress={() =>
            setData({ ...data, fieldType: "Protected Cultivation" })
          }
        />
      </KeyboardAvoidingView>
      <ContinueBtn
        onPress={handleContinue}
        disabled={!isValid}
        loading={loading}
      />
    </OnboardingLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Soil Type
// ══════════════════════════════════════════════════════════════════════════════
const SOIL_TYPES = [
  { name: "Sandy", color: "#d4a76a" },
  { name: "Sandy Loam", color: "#b8896a" },
  { name: "Sandy Clay", color: "#c9b07a" },
  { name: "Sandy Clay Loam", color: "#a06040" },
  { name: "Silt", color: "#8a8a78" },
  { name: "Silt Loam", color: "#7a7a68" },
  { name: "Silt Clay", color: "#787060" },
  { name: "Silt Clay Loam", color: "#5a5a50" },
  { name: "Heavy Clay", color: "#8a6a50" },
];

function SoilTypeScreen({ onNext, onBack, data, setData }) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("plots")
        .update({ soil_type: data.soilType })
        .eq("id", data.plotId);
      if (error) throw error;
      onNext();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step={4} onBack={onBack} scrollable>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={sc.greeting}>
          What is the soil type of your plot "{data.plotName}"?
        </Text>
        <View style={soil.grid}>
          {SOIL_TYPES.map((s) => {
            const selected = data.soilType === s.name;
            return (
              <TouchableOpacity
                key={s.name}
                style={soil.card}
                onPress={() => setData({ ...data, soilType: s.name })}
              >
                <View style={[soil.texture, { backgroundColor: s.color }]}>
                  <View style={soil.radioOnCard}>
                    <View
                      style={[soil.radioOuter, selected && soil.radioOuterSel]}
                    >
                      {selected && <View style={soil.radioInner} />}
                    </View>
                  </View>
                </View>
                <Text style={[soil.name, selected && soil.nameSel]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={{ height: 80 }} />
      <ContinueBtn
        onPress={handleContinue}
        disabled={!data.soilType}
        loading={loading}
      />
    </OnboardingLayout>
  );
}
const soil = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  card: { width: "30%", alignItems: "center" },
  texture: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 6,
    position: "relative",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  radioOnCard: { position: "absolute", top: 6, right: 6 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSel: { borderColor: G, backgroundColor: "#fff" },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: G },
  name: { fontSize: 11, color: "#555", fontWeight: "600", textAlign: "center" },
  nameSel: { color: G },
});

// ══════════════════════════════════════════════════════════════════════════════
// STEP 5 — Plot Location
// ══════════════════════════════════════════════════════════════════════════════
function PlotLocationScreen({ onNext, onBack, data, setData }) {
  const [loading, setLoading] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);

  const handleProvideLocation = async () => {
    setLoading(true);
    try {
      // 🔁 Replace with: const loc = await Location.getCurrentPositionAsync({});
      const mockLat = 28.6139,
        mockLng = 77.209;
      const { error } = await supabase
        .from("plots")
        .update({ latitude: mockLat, longitude: mockLng })
        .eq("id", data.plotId);
      if (error) throw error;
      setData({ ...data, latitude: mockLat, longitude: mockLng });
      setHasLocation(true);
      Alert.alert("Location Saved ✅", "Plot location has been recorded.", [
        { text: "Continue", onPress: onNext },
      ]);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step={5} onBack={onBack}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, flex: 1 }}>
        <Text style={sc.greeting}>
          Please provide exact location of your plot.
        </Text>

        {/* Map illustration */}
        <View style={loc.illWrap}>
          <View style={loc.glow} />
          <View style={loc.phone}>
            <View style={loc.mapBg}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[loc.gridH, { top: 18 + i * 22 }]} />
              ))}
              {[0, 1, 2].map((i) => (
                <View key={i} style={[loc.gridV, { left: 18 + i * 28 }]} />
              ))}
              <View style={loc.greenBlock} />
              <View style={loc.pin}>
                <View style={loc.pinHead} />
                <View style={loc.pinTail} />
              </View>
            </View>
            <View style={loc.topIcons}>
              <Text style={{ fontSize: 18 }}>🌱</Text>
              <Text style={{ fontSize: 18 }}>🍎</Text>
            </View>
          </View>
        </View>

        <Text style={loc.desc}>
          Accurate location of your plot is required to send you precise
          microclimatic forecast.
        </Text>

        {!hasLocation && (
          <View style={loc.warningBox}>
            <Text style={loc.warnIcon}>⚠️</Text>
            <Text style={loc.warnText}>
              You can only proceed further after providing the plot location.
            </Text>
          </View>
        )}
      </View>
      <ContinueBtn
        onPress={handleProvideLocation}
        loading={loading}
        label="PROVIDE PLOT LOCATION  ◎"
      />
    </OnboardingLayout>
  );
}
const loc = StyleSheet.create({
  illWrap: { alignItems: "center", marginVertical: 20 },
  glow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: AMBER,
    top: 20,
  },
  phone: {
    width: 114,
    height: 170,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#555",
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 4,
  },
  mapBg: { flex: 1, backgroundColor: "#f5f5f0", position: "relative" },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#e0e0d8",
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#e0e0d8",
  },
  greenBlock: {
    position: "absolute",
    width: 36,
    height: 22,
    backgroundColor: "#c8e6c9",
    top: 36,
    left: 8,
    borderRadius: 4,
  },
  pin: { position: "absolute", bottom: 28, left: 44, alignItems: "center" },
  pinHead: { width: 14, height: 14, borderRadius: 7, backgroundColor: RED },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: RED,
  },
  topIcons: {
    position: "absolute",
    top: -18,
    right: 8,
    flexDirection: "row",
    gap: 4,
  },
  desc: { fontSize: 14, color: "#444", lineHeight: 22, marginBottom: 12 },
  warningBox: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  warnIcon: { fontSize: 16, marginTop: 1 },
  warnText: {
    flex: 1,
    fontSize: 13,
    color: RED,
    lineHeight: 20,
    fontWeight: "500",
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// STEP 6 — Crop Selection
// ══════════════════════════════════════════════════════════════════════════════
const CROPS = [
  { name: "Tomato", emoji: "🍅" },
  { name: "Apple", emoji: "🍎" },
  { name: "Potato", emoji: "🥔" },
  { name: "Rice", emoji: "🌾" },
  { name: "Wheat", emoji: "🌾" },
  { name: "Avocado", emoji: "🥑" },
  { name: "Banana", emoji: "🍌" },
  { name: "Black Pepper", emoji: "🌿" },
  { name: "Bottle Gourd", emoji: "🥒" },
  { name: "Carrot", emoji: "🥕" },
  { name: "Cauliflower", emoji: "🥦" },
  { name: "Chilli", emoji: "🌶️" },
  { name: "Grapes", emoji: "🍇" },
  { name: "Maize", emoji: "🌽" },
  { name: "Mango", emoji: "🥭" },
  { name: "Potato", emoji: "🥔" },
  { name: "Rice", emoji: "🌾" },
  { name: "Wheat", emoji: "🌾" },
];

function CropSelectionScreen({ onNext, onBack, data, setData }) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("plots")
        .update({ current_crop: data.selectedCrop })
        .eq("id", data.plotId);
      if (error) throw error;
      onNext();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step={6} onBack={onBack} scrollable>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text style={sc.greeting}>
          Which crop are you currently growing on plot "{data.plotName}"?
        </Text>
        <View style={{ marginTop: 8 }}>
          {CROPS.map((crop) => {
            const selected = data.selectedCrop === crop.name;
            return (
              <TouchableOpacity
                key={crop.name}
                style={[cr.row, selected && cr.rowSel]}
                onPress={() => setData({ ...data, selectedCrop: crop.name })}
              >
                <View style={[rb.outer, selected && rb.outerSel]}>
                  {selected && <View style={rb.inner} />}
                </View>
                <Text style={cr.emoji}>{crop.emoji}</Text>
                <Text style={[cr.name, selected && cr.nameSel]}>
                  {crop.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={{ height: 80 }} />
      <ContinueBtn
        onPress={handleContinue}
        disabled={!data.selectedCrop}
        loading={loading}
      />
    </OnboardingLayout>
  );
}
const cr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  rowSel: { borderColor: G, backgroundColor: G_LIGHT },
  emoji: { fontSize: 22, marginHorizontal: 10 },
  name: { fontSize: 15, color: "#444", fontWeight: "500" },
  nameSel: { color: G, fontWeight: "700" },
});

// ══════════════════════════════════════════════════════════════════════════════
// STEP 7 — Crop Date + Transplantation
// ══════════════════════════════════════════════════════════════════════════════
function CropDateScreen({ onNext, onBack, data, setData }) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("crop_seasons").insert({
        plot_id: data.plotId,
        crop_name: data.selectedCrop,
        sowing_date: data.sowingDate,
        transplantation_done: data.transplantationDone,
      });
      if (error) throw error;
      onNext();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step={7} onBack={onBack}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, flex: 1 }}>
        <Text style={sc.greeting}>
          When did you start growing "{data.selectedCrop}" on plot "
          {data.plotName}"?
        </Text>
        <Text style={[f.label, { marginBottom: 6 }]}>
          Sowing / planting date
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <TextInput
            style={[f.input, { flex: 1 }]}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#aaa"
            value={data.sowingDate}
            onChangeText={(v) => setData({ ...data, sowingDate: v })}
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={{ fontSize: 22 }}>📅</Text>
        </View>
        <Text style={[f.label, { marginBottom: 10 }]}>
          Have you completed transplantation / pruning on this plot?
        </Text>
        <Radio
          label="Yes"
          selected={data.transplantationDone === true}
          onPress={() => setData({ ...data, transplantationDone: true })}
        />
        <Radio
          label="No"
          selected={data.transplantationDone === false}
          onPress={() => setData({ ...data, transplantationDone: false })}
        />
      </View>
      <ContinueBtn
        onPress={handleContinue}
        disabled={!data.sowingDate || data.transplantationDone === undefined}
        loading={loading}
      />
    </OnboardingLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 8 — Device Confirmation
// ══════════════════════════════════════════════════════════════════════════════
function DeviceScreen({ onNext, onBack, data, setData }) {
  return (
    <OnboardingLayout step={8} onBack={onBack}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, flex: 1 }}>
        <Text style={sc.greeting}>
          Please confirm whether you have already bought a device or you want to
          use the application without the device.
        </Text>
        <Text style={[f.label, { marginBottom: 12, marginTop: 8 }]}>
          Have you bought the AgroSmart device?
        </Text>
        <Radio
          label="Yes, I bought the device"
          selected={data.hasDevice === true}
          onPress={() => setData({ ...data, hasDevice: true })}
        />
        <Radio
          label="No, I want to check out the application"
          selected={data.hasDevice === false}
          onPress={() => setData({ ...data, hasDevice: false })}
        />
      </View>
      {/* No Supabase call here — saved together in final step */}
      <ContinueBtn onPress={onNext} disabled={data.hasDevice === undefined} />
    </OnboardingLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 9 — Set Password (FINAL STEP — saves everything to user_profiles)
// ══════════════════════════════════════════════════════════════════════════════

// Password strength helper
function getStrength(pass) {
  if (!pass) return { level: 0, label: "", color: "#ddd" };
  if (pass.length < 6) return { level: 1, label: "Too short", color: RED };
  if (pass.length < 8) return { level: 2, label: "Weak", color: ORANGE };
  const extras = [
    /[A-Z]/.test(pass),
    /[0-9]/.test(pass),
    /[^A-Za-z0-9]/.test(pass),
  ].filter(Boolean).length;
  if (extras === 0) return { level: 2, label: "Weak", color: ORANGE };
  if (extras === 1) return { level: 3, label: "Medium", color: "#fbc02d" };
  return { level: 4, label: "Strong", color: G };
}

function StrengthBar({ password }) {
  const { level, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <View style={pw.strengthWrap}>
      <View style={pw.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              pw.bar,
              { backgroundColor: i <= level ? color : "#e0e0e0" },
            ]}
          />
        ))}
      </View>
      <Text style={[pw.strengthLbl, { color }]}>{label}</Text>
    </View>
  );
}

function SetPasswordScreen({ onFinish, onBack, data, setData }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);
  const passMatch = confirm.length > 0 && password === confirm;
  const passMismatch = confirm.length > 0 && password !== confirm;
  const isReady = strength.level >= 2 && passMatch;

  const handleFinish = async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      // ── Final save: update user_profiles with password + has_device + onboarding_complete ──
      const { error } = await supabase
        .from("user_profiles")
        .update({
          password: password, // ⚠️ hash via Edge Function in production
          has_device: data.hasDevice,
          onboarding_complete: true,
        })
        .eq("phone", data.phone);

      if (error) throw error;

      Alert.alert(
        "All Set! 🎉",
        "Your account and farm are ready. Welcome to AgroSmart!",
        [{ text: "Go to Dashboard", onPress: onFinish }],
      );
    } catch (e) {
      Alert.alert("Error", e.message || "Could not complete setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step={9} onBack={onBack} scrollable>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        {/* Lock illustration */}
        <View style={pw.illWrap}>
          <View style={pw.glow} />
          <View style={pw.lockCard}>
            <View style={pw.lockTop} />
            <View style={pw.lockBody}>
              <View style={pw.keyhole} />
            </View>
            <View style={pw.lockDots}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={pw.lockDot} />
              ))}
            </View>
          </View>
        </View>

        <Text style={sc.greeting}>
          Almost done! Create a secure password to protect your AgroSmart
          account.
        </Text>

        {/* Password field */}
        <Text style={f.label}>
          Password <Text style={{ color: RED }}>*</Text>
        </Text>
        <View
          style={[
            pw.passRow,
            password.length > 0 && strength.level >= 2
              ? { borderColor: G }
              : password.length > 0
                ? { borderColor: RED }
                : {},
          ]}
        >
          <TextInput
            style={[pw.passInput]}
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
            <Text style={{ fontSize: 20 }}>{showPass ? "👁️" : "👁️‍🗨️"}</Text>
          </TouchableOpacity>
        </View>
        <StrengthBar password={password} />

        {/* Confirm password field */}
        <Text style={f.label}>
          Confirm Password <Text style={{ color: RED }}>*</Text>
        </Text>
        <View
          style={[
            pw.passRow,
            passMismatch
              ? { borderColor: RED }
              : passMatch
                ? { borderColor: G }
                : {},
          ]}
        >
          <TextInput
            style={pw.passInput}
            placeholder="Re-enter your password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={setConfirm}
            returnKeyType="done"
            onSubmitEditing={handleFinish}
          />
          <TouchableOpacity
            onPress={() => setShowConfirm(!showConfirm)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 20 }}>{showConfirm ? "👁️" : "👁️‍🗨️"}</Text>
          </TouchableOpacity>
        </View>
        {passMismatch && <Text style={pw.errTxt}>Passwords do not match</Text>}
        {passMatch && <Text style={pw.okTxt}>✓ Passwords match</Text>}

        {/* Tips box */}
        <View style={pw.tipsBox}>
          <Text style={pw.tipsTitle}>Tips for a strong password:</Text>
          <Text style={pw.tip}>• At least 6 characters long</Text>
          <Text style={pw.tip}>
            • Mix uppercase letters, numbers &amp; symbols
          </Text>
          <Text style={pw.tip}>• Avoid using your phone number</Text>
        </View>

        {/* Summary of what will be saved */}
        <View style={pw.summaryBox}>
          <Text style={pw.summaryTitle}>✅ Everything ready to save:</Text>
          <Text style={pw.summaryItem}>👤 Profile — {data.name}</Text>
          <Text style={pw.summaryItem}>🌾 Farm — {data.farmName}</Text>
          <Text style={pw.summaryItem}>
            🌱 Plot — {data.plotName} · {data.selectedCrop}
          </Text>
          <Text style={pw.summaryItem}>
            📡 Device — {data.hasDevice ? "Yes" : "No"}
          </Text>
        </View>
      </View>
      <View style={{ height: 80 }} />
      <ContinueBtn
        onPress={handleFinish}
        disabled={!isReady}
        loading={loading}
        label="COMPLETE SETUP 🎉"
      />
    </OnboardingLayout>
  );
}

const pw = StyleSheet.create({
  illWrap: {
    alignItems: "center",
    height: 140,
    justifyContent: "center",
    marginBottom: 16,
  },
  glow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: AMBER,
  },
  lockCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  lockTop: {
    width: 30,
    height: 18,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderWidth: 4,
    borderColor: G,
    borderBottomWidth: 0,
    marginBottom: -2,
  },
  lockBody: {
    width: 50,
    height: 38,
    borderRadius: 10,
    backgroundColor: G,
    alignItems: "center",
    justifyContent: "center",
  },
  keyhole: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#fff",
    marginTop: 2,
  },
  lockDots: { flexDirection: "row", gap: 6, marginTop: 10 },
  lockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#c8e6c9" },
  passRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 6,
    gap: 8,
  },
  passInput: { flex: 1, fontSize: 16, color: "#1a1a1a" },
  strengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  bars: { flexDirection: "row", gap: 4, flex: 1 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLbl: {
    fontSize: 12,
    fontWeight: "700",
    width: 56,
    textAlign: "right",
  },
  errTxt: {
    fontSize: 12,
    color: RED,
    marginBottom: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  okTxt: {
    fontSize: 12,
    color: G,
    marginBottom: 12,
    marginLeft: 4,
    fontWeight: "600",
  },
  tipsBox: {
    backgroundColor: G_LIGHT,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: G_DARK,
    marginBottom: 6,
  },
  tip: { fontSize: 12, color: "#555", lineHeight: 22 },
  summaryBox: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  summaryItem: { fontSize: 13, color: "#555", lineHeight: 24 },
});

export default function OnboardingScreen({ navigation, route }) {
  const phone = route?.params?.phone || "";

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    phone,
    // Step 1 — Profile
    name: "",
    email: "",
    country: "",
    state: "",
    district: "",
    pin: "",
    landSize: "",
    // Step 2 — Farm
    farmId: null,
    farmName: "",
    farmSize: "",
    farmAddress: "",
    farmAddress2: "",
    // Step 3 — Plot
    plotId: null,
    plotName: "",
    plotSize: "",
    plotUnit: "Acres",
    fieldType: "Open Field",
    // Step 4 — Soil
    soilType: "",
    // Step 5 — Location
    latitude: null,
    longitude: null,
    // Step 6 — Crop
    selectedCrop: "",
    // Step 7 — Crop date
    sowingDate: "",
    transplantationDone: undefined,
    // Step 8 — Device
    hasDevice: undefined,
    // Step 9 — Password (kept local in SetPasswordScreen, not in formData)
  });

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);
  const finish = () =>
    navigation?.replace("dashboardScreen", {
      user: { phone, name: formData.name },
    });

  const screens = {
    1: (
      <UserProfileScreen onNext={next} data={formData} setData={setFormData} />
    ),
    2: (
      <FarmDetailsScreen
        onNext={next}
        onBack={back}
        data={formData}
        setData={setFormData}
        userName={formData.name.split(" ")[0]}
      />
    ),
    3: (
      <PlotDetailsScreen
        onNext={next}
        onBack={back}
        data={formData}
        setData={setFormData}
      />
    ),
    4: (
      <SoilTypeScreen
        onNext={next}
        onBack={back}
        data={formData}
        setData={setFormData}
      />
    ),
    5: (
      <PlotLocationScreen
        onNext={next}
        onBack={back}
        data={formData}
        setData={setFormData}
      />
    ),
    6: (
      <CropSelectionScreen
        onNext={next}
        onBack={back}
        data={formData}
        setData={setFormData}
      />
    ),
    7: (
      <CropDateScreen
        onNext={next}
        onBack={back}
        data={formData}
        setData={setFormData}
      />
    ),
    8: (
      <DeviceScreen
        onNext={next}
        onBack={back}
        data={formData}
        setData={setFormData}
      />
    ),
    9: (
      <SetPasswordScreen
        onFinish={finish}
        onBack={back}
        data={formData}
        setData={setFormData}
      />
    ),
  };

  return screens[step] || null;
}

/**
 * ═══════════════════════════════════════════════════════
 * SUPABASE TABLES NEEDED
 * ═══════════════════════════════════════════════════════
 *
 * -- 1. user_profiles (single table for login + profile)
 * CREATE TABLE user_profiles (
 *   id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   phone               text UNIQUE NOT NULL,
 *   password            text,
 *   name                text,
 *   email               text,
 *   country             text,
 *   state               text,
 *   district            text,
 *   pin_code            text,
 *   total_land_size     numeric,
 *   has_device          boolean DEFAULT false,
 *   onboarding_complete boolean DEFAULT false,
 *   created_at          timestamptz DEFAULT now()
 * );
 *
 * -- 2. farms
 * CREATE TABLE farms (
 *   id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_phone    text REFERENCES user_profiles(phone),
 *   name          text NOT NULL,
 *   size_acres    numeric,
 *   address_line1 text,
 *   address_line2 text,
 *   created_at    timestamptz DEFAULT now()
 * );
 *
 * -- 3. plots
 * CREATE TABLE plots (
 *   id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   farm_id      uuid REFERENCES farms(id),
 *   name         text NOT NULL,
 *   size_value   numeric,
 *   size_unit    text DEFAULT 'Acres',
 *   field_type   text,
 *   soil_type    text,
 *   latitude     numeric,
 *   longitude    numeric,
 *   current_crop text,
 *   created_at   timestamptz DEFAULT now()
 * );
 *
 * -- 4. crop_seasons
 * CREATE TABLE crop_seasons (
 *   id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   plot_id              uuid REFERENCES plots(id),
 *   crop_name            text NOT NULL,
 *   sowing_date          text,
 *   transplantation_done boolean DEFAULT false,
 *   created_at           timestamptz DEFAULT now()
 * );
 *
 * LOGIN QUERY (in LoginScreen.jsx):
 *   supabase.from("user_profiles")
 *     .select("*")
 *     .eq("phone", "+91XXXXXXXXXX")
 *     .eq("password", "userpassword")
 *     .maybeSingle()
 */
