// Link the account to a different farm (farm_profiles.farm_id).

import { useState } from "react";
import { Alert, Text } from "react-native";

import { Screen } from "../../components/srijan/layout";
import { Banner, Button, Card, Field, InfoRow } from "../../components/srijan/ui";
import { C } from "../../constants/colors";
import { CROP } from "../../constants/enums";
import { useAuth } from "../../context/AuthContext";
import { getFarmProfile } from "../../services/api/sensorService";
import { fmt } from "../../utils/format";

export default function AddDeviceScreen({ navigation }) {
  const { farmId, updateProfile } = useAuth();
  const [input, setInput] = useState("");
  const [farm, setFarm] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const id = input.trim().toUpperCase();

  const check = async () => {
    setChecking(true);
    setError(null);
    setFarm(null);
    try {
      const f = await getFarmProfile(id);
      if (!f) setError(`No farm with ID ${id} exists.`);
      setFarm(f);
    } catch (e) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  };

  const link = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ farmId: id });
      Alert.alert("Farm linked", `Your account now shows data for ${id}.`);
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Linked farm" subtitle={`Currently ${farmId}`} back>
      <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 20, marginBottom: 16 }}>
        Enter the Farm ID configured on your Node B gateway. All dashboard data comes from this farm.
      </Text>
      {error ? <Banner message={error} style={{ marginBottom: 14 }} /> : null}
      <Field
        label="Farm ID"
        icon="barn"
        placeholder="e.g. FARM_002"
        autoCapitalize="characters"
        autoCorrect={false}
        value={input}
        onChangeText={(v) => {
          setInput(v);
          setFarm(null);
        }}
      />
      {farm ? (
        <>
          <Card style={{ marginBottom: 16 }}>
            <InfoRow label="Farm" value={farm.farm_id} />
            <InfoRow label="Field" value={farm.field_id} />
            <InfoRow label="Crop" value={CROP[farm.crop_id] || `Code ${farm.crop_id}`} />
            <InfoRow label="Area" value={`${fmt(farm.field_area_m2, 0)} m²`} last />
          </Card>
          <Button
            title={id === farmId ? "Already linked" : `Link ${id}`}
            icon="link-variant"
            onPress={link}
            disabled={id === farmId}
            loading={saving}
          />
        </>
      ) : (
        <Button title="Find farm" icon="magnify" onPress={check} disabled={id.length < 3} loading={checking} />
      )}
    </Screen>
  );
}
