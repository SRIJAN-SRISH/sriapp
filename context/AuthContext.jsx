import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  changePassword as apiChangePassword,
  getProfile,
  loginUser,
  logoutUser,
  registerUser,
  updateProfile as apiUpdateProfile,
} from "../services/api/userService";
import { clearSession, loadSession, saveSession } from "../services/auth/sessionService";
import { registerForPush, unregisterFromPush } from "../services/notification/pushService";

const AuthContext = createContext(null);

// status: "loading" → reading stored session
//         "signedOut" | "signedIn"
export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [session, setSession] = useState(null); // { token, user }

  const signOutLocal = useCallback(async () => {
    await clearSession();
    setSession(null);
    setStatus("signedOut");
  }, []);

  const applySession = useCallback(async (next) => {
    await saveSession(next);
    setSession(next);
    setStatus("signedIn");
  }, []);

  // Restore session on launch, then refresh the profile in the background.
  useEffect(() => {
    (async () => {
      const stored = await loadSession();
      if (!stored?.token) {
        setStatus("signedOut");
        return;
      }
      setSession(stored);
      setStatus("signedIn");
      try {
        const user = await getProfile(stored.token);
        await applySession({ token: stored.token, user });
      } catch (e) {
        // Expired/invalid token → back to login. Network errors keep the
        // cached profile so the app still opens offline.
        if (e.code === "SESSION_EXPIRED") await signOutLocal();
      }
    })();
  }, [applySession, signOutLocal]);

  // Register this phone for push notifications whenever a session becomes
  // active (after login, register, or app launch with a saved session).
  const sessionToken = session?.token;
  useEffect(() => {
    if (sessionToken) registerForPush(sessionToken);
  }, [sessionToken]);

  const login = useCallback(
    async (phone, password) => applySession(await loginUser(phone, password)),
    [applySession],
  );

  const register = useCallback(
    async (fields) => applySession(await registerUser(fields)),
    [applySession],
  );

  const logout = useCallback(async () => {
    const token = session?.token;
    // Stop notifications to this phone before the session is invalidated
    if (token) await unregisterFromPush(token);
    await signOutLocal();
    if (token) logoutUser(token).catch(() => {});
  }, [session, signOutLocal]);

  const withToken = useCallback(
    async (fn) => {
      try {
        return await fn(session.token);
      } catch (e) {
        if (e.code === "SESSION_EXPIRED") await signOutLocal();
        throw e;
      }
    },
    [session, signOutLocal],
  );

  const refreshProfile = useCallback(async () => {
    const user = await withToken((t) => getProfile(t));
    await applySession({ token: session.token, user });
    return user;
  }, [withToken, applySession, session]);

  const updateProfile = useCallback(
    async (fields) => {
      const user = await withToken((t) => apiUpdateProfile(t, fields));
      await applySession({ token: session.token, user });
      return user;
    },
    [withToken, applySession, session],
  );

  const changePassword = useCallback(
    (oldPassword, newPassword) => withToken((t) => apiChangePassword(t, oldPassword, newPassword)),
    [withToken],
  );

  const value = useMemo(
    () => ({
      status,
      user: session?.user ?? null,
      farmId: session?.user?.farm_id ?? null,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
      changePassword,
    }),
    [status, session, login, register, logout, refreshProfile, updateProfile, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
