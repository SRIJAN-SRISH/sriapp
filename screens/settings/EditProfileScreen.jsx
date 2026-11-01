import { useState } from "react";
import { Alert, View } from "react-native";

import { Screen } from "../../components/srijan/layout";
import { Banner, Button, Field } from "../../components/srijan/ui";
import { useAuth } from "../../context/AuthContext";
import { onlyDigits } from "../../utils/format";

export default function EditProfileScreen({ navigation }) {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [village, setVillage] = useState(user?.village || "");
  const [district, setDistrict] = useState(user?.district || "");
  const [stateName, setStateName] = useState(user?.state || "");
  const [pin, setPin] = useState(user?.pin_code || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const emailError = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email) ? "Enter a valid email" : null;
  const pinError = pin.length > 0 && pin.length < 6 ? "PIN code has 6 digits" : null;
  const ready = fullName.trim().length >= 2 && !emailError && !pinError;

  const save = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateProfile({ fullName, village, district, state: stateName, pinCode: pin, email });
      Alert.alert("Saved", "Your profile has been updated.");
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Edit profile" back>
      {error ? <Banner message={error} style={{ marginBottom: 14 }} /> : null}
      <Field label="Full name" icon="account-outline" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
      <Field label="Mobile number" icon="phone-outline" value={user?.phone} editable={false} hint="Mobile number can't be changed." />
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
        error={pinError}
      />
      <Field
        label="Email"
        icon="email-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        error={emailError}
      />
      <Button title="Save changes" icon="content-save-outline" onPress={save} disabled={!ready} loading={loading} style={{ marginTop: 8 }} />
    </Screen>
  );
}
