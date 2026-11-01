import { useState } from "react";
import { Alert } from "react-native";

import { Screen } from "../../components/srijan/layout";
import { Banner, Button, PasswordField } from "../../components/srijan/ui";
import { useAuth } from "../../context/AuthContext";

export default function ChangePasswordScreen({ navigation }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ready = current.length > 0 && next.length >= 6 && confirm === next;

  const save = async () => {
    setLoading(true);
    setError(null);
    try {
      await changePassword(current, next);
      Alert.alert("Password changed", "Other devices have been logged out.");
      navigation.goBack();
    } catch (e) {
      setError(e.code === "INVALID_CREDENTIALS" ? "Current password is incorrect." : e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Change password" back>
      {error ? <Banner message={error} style={{ marginBottom: 14 }} /> : null}
      <PasswordField label="Current password" value={current} onChangeText={setCurrent} />
      <PasswordField
        label="New password"
        placeholder="At least 6 characters"
        value={next}
        onChangeText={setNext}
        error={next.length > 0 && next.length < 6 ? "At least 6 characters" : null}
      />
      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        error={confirm.length > 0 && confirm !== next ? "Passwords don't match" : null}
      />
      <Button title="Update password" icon="lock-check-outline" onPress={save} disabled={!ready} loading={loading} style={{ marginTop: 8 }} />
    </Screen>
  );
}
