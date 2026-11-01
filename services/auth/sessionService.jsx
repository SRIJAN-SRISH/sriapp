// Persists the login session on the phone so users stay logged in.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "srijan.session.v1";

// session = { token, user }
export async function loadSession() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Storage failure only means the user has to log in again next launch.
  }
}

export async function clearSession() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
