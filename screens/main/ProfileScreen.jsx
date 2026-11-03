// Account — profile from app_users + linked farm from farm_profiles.

import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/srijan/layout";
import { Badge, Button, Card, Icon, InfoRow, SectionHeader } from "../../components/srijan/ui";
import { C, RADIUS } from "../../constants/colors";
import { CROP, GROWTH_STAGE } from "../../constants/enums";
import { useAuth } from "../../context/AuthContext";
import { useLoader } from "../../hooks/useLoader";
import { getFarmProfile } from "../../services/api/sensorService";
import { fmt, formatDate, initials } from "../../utils/format";

export default function ProfileScreen({ navigation }) {
  const { user, farmId, logout, refreshProfile } = useAuth();
  const { data: farm, refreshing, reload } = useLoader(async () => {
    refreshProfile().catch(() => {});
    return getFarmProfile(farmId);
  }, farmId);

  const location = [user?.village, user?.district, user?.state].filter(Boolean).join(", ");

  const confirmLogout = () =>
    Alert.alert("Log out?", "You'll need your mobile number and password to log in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);

  return (
    <Screen title="Account" refreshing={refreshing} onRefresh={reload}>
      <Card style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>{initials(user?.full_name)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.name} numberOfLines={1}>
            {user?.full_name}
          </Text>
          <Text style={s.phone}>{user?.phone}</Text>
          {user?.created_at ? <Text style={s.since}>Member since {formatDate(new Date(user.created_at))}</Text> : null}
        </View>
        <Pressable onPress={() => navigation.navigate("EditProfile")} hitSlop={8} style={s.editBtn}>
          <Icon name="pencil-outline" size={20} color={C.primary} />
        </Pressable>
      </Card>

      <SectionHeader title="Personal details" style={{ marginTop: 20 }} />
      <Card>
        <InfoRow icon="map-marker-outline" label="Location" value={location || "Not added"} />
        <InfoRow icon="mailbox-outline" label="PIN code" value={user?.pin_code || "Not added"} />
        <InfoRow icon="email-outline" label="Email" value={user?.email || "Not added"} last />
      </Card>

      <SectionHeader
        title="Linked farm"
        action="Change"
        onAction={() => navigation.navigate("LinkFarm")}
        style={{ marginTop: 20 }}
      />
      <Card onPress={() => navigation.navigate("FarmOverview")}>
        <View style={s.farmRow}>
          <View style={s.farmIcon}>
            <Icon name="barn" size={26} color={C.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.farmId}>{farmId}</Text>
            <Text style={s.farmMeta}>
              {farm
                ? `${farm.field_id} · ${CROP[farm.crop_id] || "Crop"} · ${GROWTH_STAGE[farm.growth_stage] || ""}`
                : "Loading farm…"}
            </Text>
            {farm ? (
              <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                <Badge label={`${fmt(farm.field_area_m2, 0)} m²`} tone="primary" icon="ruler-square" />
                <Badge label={farm.node_id} tone="info" icon="router-wireless" />
              </View>
            ) : null}
          </View>
          <Icon name="chevron-right" size={24} color={C.textFaint} />
        </View>
      </Card>

      <SectionHeader title="Settings" style={{ marginTop: 20 }} />
      <Card padded={false}>
        <MenuRow icon="router-wireless" label="My devices" onPress={() => navigation.navigate("Device")} />
        <MenuRow icon="account-edit-outline" label="Edit profile" onPress={() => navigation.navigate("EditProfile")} />
        <MenuRow icon="lock-outline" label="Change password" onPress={() => navigation.navigate("ChangePassword")} />
        <MenuRow icon="swap-horizontal" label="Change linked farm" onPress={() => navigation.navigate("LinkFarm")} />
        <MenuRow icon="help-circle-outline" label="Help & about" onPress={() => navigation.navigate("Help")} last />
      </Card>

      <Button title="Log out" variant="danger" icon="logout" onPress={confirmLogout} style={{ marginTop: 22 }} />
      <Text style={s.version}>Srijan · AgroSmart V1</Text>
    </Screen>
  );
}

function MenuRow({ icon, label, onPress, last }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.menuRow, !last && s.menuBorder, pressed && { backgroundColor: C.bg }]}
    >
      <View style={s.menuIcon}>
        <Icon name={icon} size={20} color={C.primary} />
      </View>
      <Text style={s.menuLbl}>{label}</Text>
      <Icon name="chevron-right" size={22} color={C.textFaint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: C.primarySoft,
  },
  avatarTxt: { fontSize: 22, fontWeight: "900", color: C.white },
  name: { fontSize: 19, fontWeight: "900", color: C.text },
  phone: { fontSize: 14, color: C.textMuted, marginTop: 2, fontWeight: "600" },
  since: { fontSize: 12, color: C.textFaint, marginTop: 3 },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  farmRow: { flexDirection: "row", alignItems: "center" },
  farmIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  farmId: { fontSize: 17, fontWeight: "900", color: C.text },
  farmMeta: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLbl: { flex: 1, fontSize: 15, fontWeight: "700", color: C.text },
  version: { textAlign: "center", fontSize: 12, color: C.textFaint, marginTop: 16 },
});
