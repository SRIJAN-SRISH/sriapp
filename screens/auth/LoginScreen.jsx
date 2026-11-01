import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthShell } from "../../components/srijan/layout";
import { Banner, Button, Field, PasswordField } from "../../components/srijan/ui";
import { C } from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";
import { onlyDigits, toE164India } from "../../utils/format";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const passwordRef = useRef(null);

  const phoneError = phone.length > 0 && phone.length < 10 ? "Enter a 10-digit mobile number" : null;
  const ready = phone.length === 10 && password.length >= 6;

  const handleLogin = async () => {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    try {
      await login(toE164India(phone), password);
      // AuthGate switches to the main app automatically.
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to see your farm's live soil, weather and irrigation data.">
      {error ? <Banner title="Couldn't log in" message={error} style={{ marginBottom: 16 }} /> : null}

      <Field
        label="Mobile number"
        prefix="+91"
        placeholder="10-digit number"
        keyboardType="number-pad"
        maxLength={10}
        value={phone}
        onChangeText={(v) => setPhone(onlyDigits(v, 10))}
        error={phoneError}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        autoComplete="tel"
      />
      <PasswordField
        ref={passwordRef}
        label="Password"
        placeholder="Your password"
        value={password}
        onChangeText={setPassword}
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />

      <Pressable
        onPress={() => navigation.navigate("ForgotPassword", { phone })}
        hitSlop={8}
        style={s.forgot}
      >
        <Text style={s.forgotTxt}>Forgot password?</Text>
      </Pressable>

      <Button title="Log in" icon="login" onPress={handleLogin} disabled={!ready} loading={loading} />

      <View style={s.divider}>
        <View style={s.line} />
        <Text style={s.or}>New to Srijan?</Text>
        <View style={s.line} />
      </View>

      <Button
        title="Create an account"
        variant="outline"
        icon="account-plus-outline"
        onPress={() => navigation.navigate("Register")}
      />
    </AuthShell>
  );
}

const s = StyleSheet.create({
  forgot: { alignSelf: "flex-end", marginTop: -4, marginBottom: 22 },
  forgotTxt: { color: C.primary, fontWeight: "700", fontSize: 13.5 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 22, gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: C.border },
  or: { color: C.textFaint, fontSize: 12.5, fontWeight: "600" },
});
