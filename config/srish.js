// Where the Srish tomato-expert bot lives. Server code is in the SRISH repo
// (api_server.py).
//
// Srish runs Ollama, so she cannot run on the phone — the API has to be
// reachable over the network. Note that "localhost" on a device means the
// phone itself, so during development this must be your machine's LAN IP.
//
// Override without editing this file:
//   EXPO_PUBLIC_SRISH_API_URL=http://192.168.1.39:8000 npx expo start
// or set expo.extra.srishApiUrl in app.json for a build.
//
// The address is worked out at runtime rather than written down, because the
// laptop's Wi-Fi address is a DHCP lease: it moved from .14 to .39 on one
// reconnect, and the app showed "Offline" against a perfectly healthy server
// purely because the compiled-in address had gone stale.
//
// The reliable source is Expo itself. While `npx expo start` is running, the
// phone is already talking to Metro ON THE LAPTOP, so Expo knows that host --
// and it is the same machine serving this API. Reading it there means the
// address is always current, with nothing to configure and no VPN involved.
//
// Order of preference:
//   1. EXPO_PUBLIC_SRISH_API_URL / expo.extra.srishApiUrl — explicit wins
//   2. the Metro host, i.e. wherever this app was loaded from
//   3. previously seen addresses, for a standalone build with no Metro
//
// `srish status` on the laptop prints its current addresses.

import Constants from "expo-constants";

const API_PORT = 8000;

// Addresses seen before. Only used by a standalone build, where there is no
// Metro host to learn from.
const FALLBACKS = [
  `http://192.168.1.39:${API_PORT}`,
  `http://192.168.1.14:${API_PORT}`,
];

const clean = (u) => String(u || "").replace(/\/+$/, "");

/** The laptop's current address, taken from wherever this app was loaded.
 *
 * Expo reports that host in different places across SDKs and launch modes, so
 * check each. The value looks like "192.168.1.39:8081" or a full URL; keep the
 * host and swap in the API port.
 */
function hostFromExpo() {
  const raw =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    Constants.linkingUri ||
    "";

  const host = String(raw)
    .replace(/^\w+:\/\//, "") // strip any scheme
    .split("/")[0] // drop any path
    .split("?")[0]
    .split(":")[0]; // drop Metro's port

  // Only an IP is useful here. A tunnel gives a .exp.direct hostname, which
  // serves the bundle but is not this API, and "localhost" would mean the
  // phone itself.
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  if (host.startsWith("127.")) return null;

  return `http://${host}:${API_PORT}`;
}

function configured() {
  const fromEnv = process.env.EXPO_PUBLIC_SRISH_API_URL;
  const fromExtra = Constants.expoConfig?.extra?.srishApiUrl;
  return fromEnv || fromExtra || null;
}

// Metro's host first: in development it is the laptop, and it is always right.
const CANDIDATES = [hostFromExpo(), ...FALLBACKS].filter(Boolean);

/** Where the app looked, for a diagnostics line in the UI. */
export const SRISH_API_CANDIDATES = CANDIDATES;
export const SRISH_API_FROM_METRO = hostFromExpo();

// An explicit setting always wins and is never probed around.
export const SRISH_API_PINNED = !!configured();

// Mutable: starts at the best guess, and resolveSrishUrl() may move it to
// whichever candidate actually answered.
export let SRISH_API_URL = clean(
  configured() || CANDIDATES[0] || `http://localhost:${API_PORT}`,
);

async function probe(base, timeoutMs) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${clean(base)}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false; // unreachable on this address
  }
}

/** First address to answer, or null if none do.
 *
 * Deliberately concurrent. Probing in sequence means every dead entry costs a
 * full timeout before the live one is tried — with the VPN switched off that
 * was seconds of delay on each health check, for an address that was never
 * going to answer. Racing them makes a dead candidate free.
 *
 * Written with counters rather than Promise.any, which is not reliably present
 * across the JS engines React Native ships.
 */
function firstReachable(bases, timeoutMs) {
  return new Promise((resolve) => {
    let pending = bases.length;
    if (!pending) return resolve(null);
    let settled = false;

    bases.forEach((base) => {
      probe(base, timeoutMs).then((ok) => {
        if (settled) return;
        if (ok) {
          settled = true;
          resolve(clean(base));
        } else if (--pending === 0) {
          resolve(null);
        }
      });
    });
  });
}

/** Find a reachable API address, remember it, and return it.
 *
 * Returns null when nothing answered, which the caller should treat as the bot
 * being offline. Safe to call repeatedly — it re-probes, so moving between
 * networks recovers without a restart.
 */
export async function resolveSrishUrl(timeoutMs = 2500) {
  if (SRISH_API_PINNED) return SRISH_API_URL;

  // The address that worked last time usually still works, so give it a solo
  // attempt before fanning out. Deliberately a shorter timeout than the fan-out
  // gets: this is an optimisation for the common case, and when it misses its
  // cost is added to the real lookup rather than replacing it.
  if (await probe(SRISH_API_URL, Math.min(timeoutMs, 1200))) return SRISH_API_URL;

  const rest = CANDIDATES.filter((c) => clean(c) !== SRISH_API_URL);
  const found = await firstReachable(rest, timeoutMs);
  if (found) {
    SRISH_API_URL = found;
    return found;
  }
  return null;
}

/** The address in use right now.
 *
 * Call this instead of importing SRISH_API_URL directly: resolveSrishUrl()
 * reassigns it, and a value captured at import time would not follow.
 */
export const getSrishUrl = () => SRISH_API_URL;

// Answers take roughly 6-20s: the bot routes the question through one model and
// then generates the reply. Streaming shows words as they arrive, so this
// ceiling only matters for the non-streaming call.
export const SRISH_TIMEOUT_MS = 120000;

// How many past turns to send back as context. The server trims too; this keeps
// the request small over mobile data.
export const SRISH_HISTORY_TURNS = 10;
