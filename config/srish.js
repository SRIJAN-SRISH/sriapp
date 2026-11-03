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
// CANDIDATES below exist because the Wi-Fi address is handed out by DHCP and
// changes whenever the laptop reconnects — the app showed "Offline" for a
// perfectly healthy server purely because the baked-in address had gone stale.
// Rather than depend on one guess, the app probes the candidates at startup
// and keeps the first that answers. `srish status` on the laptop prints its
// current addresses.
//
// A Tailscale address is listed first on purpose: it belongs to the machine
// rather than the network, so it survives changing Wi-Fi. It only works if the
// phone is on the same tailnet; if it is not, the probe falls through to the
// LAN address, costing one failed request at startup.

import Constants from "expo-constants";

const CANDIDATES = [
  "http://192.168.1.39:8000", // LAN (DHCP — expect this to change)
  "http://100.112.55.89:8000", // Tailscale — only when that VPN is running
  "http://192.168.1.14:8000", // previous LAN address
];

const clean = (u) => String(u || "").replace(/\/+$/, "");

function configured() {
  const fromEnv = process.env.EXPO_PUBLIC_SRISH_API_URL;
  const fromExtra = Constants.expoConfig?.extra?.srishApiUrl;
  return fromEnv || fromExtra || null;
}

// An explicit setting always wins and is never probed around.
export const SRISH_API_PINNED = !!configured();

// Mutable: starts at the best guess, and resolveSrishUrl() may move it to
// whichever candidate actually answered.
export let SRISH_API_URL = clean(configured() || CANDIDATES[0]);

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
