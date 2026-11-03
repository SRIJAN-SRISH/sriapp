// Where the Srish tomato-expert bot lives. Server code is in the SRISH repo
// (api_server.py).
//
// Srish runs Ollama, so she cannot run on the phone — the API has to be
// reachable over the network. Note that "localhost" on a device means the
// phone itself, so during development this must be your machine's LAN IP.
//
// Override without editing this file:
//   EXPO_PUBLIC_SRISH_API_URL=http://192.168.1.14:8000 npx expo start
// or set expo.extra.srishApiUrl in app.json for a build.

import Constants from "expo-constants";

const DEFAULT_URL = "http://192.168.1.14:8000";

function resolve() {
  const fromEnv = process.env.EXPO_PUBLIC_SRISH_API_URL;
  const fromExtra = Constants.expoConfig?.extra?.srishApiUrl;
  return (fromEnv || fromExtra || DEFAULT_URL).replace(/\/+$/, "");
}

export const SRISH_API_URL = resolve();

// Answers take roughly 6-20s: the bot routes the question through one model and
// then generates the reply. Streaming shows words as they arrive, so this
// ceiling only matters for the non-streaming call.
export const SRISH_TIMEOUT_MS = 120000;

// How many past turns to send back as context. The server trims too; this keeps
// the request small over mobile data.
export const SRISH_HISTORY_TURNS = 10;
