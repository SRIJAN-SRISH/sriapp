// Firebase Phone Auth (SMS OTP) — used by the forgot-password flow.

import { signInWithPhoneNumber, signOut } from "firebase/auth";

import { auth } from "../../config/firebase";

const MESSAGES = {
  "auth/invalid-phone-number": "That mobile number isn't valid.",
  "auth/too-many-requests": "Too many attempts. Please wait a while and try again.",
  "auth/quota-exceeded": "SMS limit reached for today. Please try again later.",
  "auth/invalid-verification-code": "The OTP you entered is incorrect.",
  "auth/code-expired": "This OTP has expired. Please request a new one.",
  "auth/missing-verification-code": "Please enter the OTP.",
  "auth/operation-not-allowed": "SMS login is not enabled for this app yet (enable Phone sign-in in Firebase).",
  "auth/billing-not-enabled": "SMS sending needs billing enabled on the Firebase project.",
  "auth/captcha-check-failed": "Security check failed. Please try again.",
  "auth/invalid-app-credential": "Security check failed. Please try again.",
  "auth/network-request-failed": "Can't reach the server. Check your internet connection.",
  "recaptcha-cancelled": "Security check was cancelled.",
};

export function otpErrorMessage(e) {
  return MESSAGES[e?.code] || e?.message || "Something went wrong. Please try again.";
}

// Sends the OTP. Returns a confirmation object for verifyOtp().
export function sendOtp(phoneNumber, verifier) {
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

// Confirms the OTP and returns a Firebase ID token proving the phone number.
export async function verifyOtp(confirmation, code) {
  const cred = await confirmation.confirm(code);
  return cred.user.getIdToken();
}

export function signOutFirebase() {
  return signOut(auth).catch(() => {});
}
