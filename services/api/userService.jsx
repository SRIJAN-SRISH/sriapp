// Account calls. All go through the app_* SQL functions defined in
// supabase/app_users.sql — the app never touches app_users directly.

import { supabase } from "../../config/supabase";

const ERROR_MESSAGES = {
  PHONE_TAKEN: "This mobile number is already registered. Please log in instead.",
  FARM_NOT_FOUND: "No farm with this Farm ID exists. Check the ID printed on your Node B device.",
  INVALID_CREDENTIALS: "Mobile number or password is incorrect.",
  WEAK_PASSWORD: "Password must be at least 6 characters.",
  NAME_REQUIRED: "Please enter your name.",
  INVALID_PHONE: "Please enter a valid 10-digit mobile number.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  OTP_INVALID: "Your OTP verification has expired. Please verify your number again.",
  PHONE_NOT_REGISTERED: "No account is registered with this mobile number.",
};

export class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function toAppError(error) {
  const raw = error?.message || "";
  const code = Object.keys(ERROR_MESSAGES).find((k) => raw.includes(k));
  if (code) return new AppError(code, ERROR_MESSAGES[code]);

  // RPC function missing → the SQL setup hasn't been run yet
  if (error?.code === "PGRST202" || raw.includes("Could not find the function")) {
    return new AppError(
      "SETUP_REQUIRED",
      "Account system is not set up on the server yet. Run supabase/app_users.sql in the Supabase SQL editor.",
    );
  }
  if (raw.includes("Network request failed") || raw.includes("fetch")) {
    return new AppError("NETWORK", "Can't reach the server. Check your internet connection.");
  }
  return new AppError("UNKNOWN", raw || "Something went wrong. Please try again.");
}

async function rpc(fn, args) {
  let res;
  try {
    res = await supabase.rpc(fn, args);
  } catch (e) {
    throw toAppError(e);
  }
  if (res.error) throw toAppError(res.error);
  return res.data;
}

export function isPhoneRegistered(phone) {
  return rpc("app_phone_registered", { p_phone: phone });
}

// Returns { token, user }
export function registerUser({ phone, password, fullName, farmId, email, village, district, state, pinCode }) {
  return rpc("app_register", {
    p_phone: phone,
    p_password: password,
    p_full_name: fullName,
    p_farm_id: farmId || null, // null → server creates the next FARM_xxx
    p_email: email || null,
    p_village: village || null,
    p_district: district || null,
    p_state: state || null,
    p_pin_code: pinCode || null,
  });
}

// Returns { token, user }
export function loginUser(phone, password) {
  return rpc("app_login", { p_phone: phone, p_password: password });
}

export function getProfile(token) {
  return rpc("app_get_profile", { p_token: token });
}

// Pass only the fields to change. "" clears an optional field.
export function updateProfile(token, fields) {
  return rpc("app_update_profile", {
    p_token: token,
    p_full_name: fields.fullName ?? null,
    p_email: fields.email ?? null,
    p_village: fields.village ?? null,
    p_district: fields.district ?? null,
    p_state: fields.state ?? null,
    p_pin_code: fields.pinCode ?? null,
    p_farm_id: fields.farmId ?? null,
  });
}

export function changePassword(token, oldPassword, newPassword) {
  return rpc("app_change_password", {
    p_token: token,
    p_old_password: oldPassword,
    p_new_password: newPassword,
  });
}

// firebaseIdToken proves the phone number was verified by SMS OTP; the server
// checks it with Google before changing the password.
export function resetPasswordWithOtp(firebaseIdToken, newPassword) {
  return rpc("app_reset_password_otp", {
    p_firebase_id_token: firebaseIdToken,
    p_new_password: newPassword,
  });
}

export function registerPushToken(token, pushToken, platform) {
  return rpc("app_register_push_token", { p_token: token, p_push_token: pushToken, p_platform: platform });
}

export function unregisterPushToken(token, pushToken) {
  return rpc("app_unregister_push_token", { p_token: token, p_push_token: pushToken });
}

export function logoutUser(token) {
  return rpc("app_logout", { p_token: token });
}
