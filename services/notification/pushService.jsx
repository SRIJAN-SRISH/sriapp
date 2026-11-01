// Push notifications via Expo Push Service.
// After login the app asks permission, gets this phone's Expo push token and
// saves it in Supabase (app_push_tokens). Notifications are sent from the
// Supabase SQL Editor with app_send_push(...) — see supabase/push_notifications.sql.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { C } from "../../constants/colors";
import { registerPushToken, unregisterPushToken } from "../api/userService";

const STORED_KEY = "srijan.pushToken.v1";

// Show notifications as banners even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  // Must match "channelId" used by app_send_push
  await Notifications.setNotificationChannelAsync("alerts", {
    name: "Farm alerts",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: C.primary,
  });
}

// Returns the push token, or null if unavailable (simulator, Expo Go,
// permission denied, Firebase not configured). Never throws.
export async function registerForPush(sessionToken) {
  try {
    if (!Device.isDevice) return null;
    await ensureAndroidChannel();

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    await registerPushToken(sessionToken, pushToken, Platform.OS);
    await AsyncStorage.setItem(STORED_KEY, pushToken);
    return pushToken;
  } catch (e) {
    console.log("Push registration skipped:", e?.message);
    return null;
  }
}

// Stop sending notifications to this phone for this account. Never throws.
export async function unregisterFromPush(sessionToken) {
  try {
    const pushToken = await AsyncStorage.getItem(STORED_KEY);
    if (!pushToken) return;
    await AsyncStorage.removeItem(STORED_KEY);
    await unregisterPushToken(sessionToken, pushToken);
  } catch {
    // ignore — the token will be replaced on the next login anyway
  }
}
