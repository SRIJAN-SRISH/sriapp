// Firebase is used only for SMS OTP (Phone Auth) in the forgot-password flow.
// App accounts themselves live in Supabase (see supabase/app_users.sql).

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, initializeAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyBoZb_2nh1QV-R0g87qi_8sE7jIUhLJzOc",
  authDomain: "agrosmart-d4a8b.firebaseapp.com",
  projectId: "agrosmart-d4a8b",
  storageBucket: "agrosmart-d4a8b.firebasestorage.app",
  messagingSenderId: "125022740891",
  appId: "1:125022740891:web:eeb5a443df7f46a689813e",
  measurementId: "G-74YXBWH7WP",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// In-memory: the Firebase session is only needed for a few minutes while
// resetting a password, so nothing is persisted on the phone.
function createAuth() {
  try {
    return initializeAuth(app, { persistence: inMemoryPersistence });
  } catch {
    return getAuth(app); // already initialised (fast refresh)
  }
}

export const auth = createAuth();
