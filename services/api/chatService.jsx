// Srish chatbot transport. Server lives in the SRISH repo (api_server.py).
//
// Two ways to ask a question:
//   askSrish      — one promise, resolves with the whole answer (6-20s)
//   streamSrish   — words arrive as they are generated; use this for chat UI
//
// A turn is { role: "user" | "assistant", content: string }. Pass the previous
// turns as `history`, oldest first, WITHOUT the message being sent.

import {
  SRISH_API_URL,
  SRISH_HISTORY_TURNS,
  SRISH_TIMEOUT_MS,
} from "../../config/srish";

const OFFLINE =
  "Srish se baat nahi ho paa rahi. Check karein ki aap same network par hain.";

function friendly(err) {
  const msg = err?.message || "";
  if (/Network request failed|fetch|timeout|timed out/i.test(msg)) {
    return new Error(OFFLINE);
  }
  return new Error(msg || "Srish could not answer right now.");
}

function body(message, history, { farmId, depth } = {}) {
  return JSON.stringify({
    message: String(message ?? "").trim(),
    history: (history || []).slice(-SRISH_HISTORY_TURNS).map((t) => ({
      role: t.role,
      content: String(t.content ?? ""),
    })),
    farm_id: farmId ?? null,
    depth: !!depth,
  });
}

/** Is the bot up? Returns the /health payload, or null if unreachable. */
export async function checkSrish() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${SRISH_API_URL}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Ask Srish and wait for the finished answer.
 *
 * Resolves with { reply, intent, language, degraded, used_kb, kb_disease,
 * farm_rows, error }. `degraded: true` means the router was down, so the
 * off-topic filter and knowledge base were skipped for that turn.
 */
export async function askSrish(message, history = [], opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SRISH_TIMEOUT_MS);
  try {
    const res = await fetch(`${SRISH_API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body(message, history, opts),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Srish returned ${res.status}`);
    return await res.json();
  } catch (e) {
    throw friendly(e);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask Srish and receive the answer as it is written.
 *
 * Callbacks: onMeta({intent, language, degraded}) fires once routing is done,
 * onToken(text) fires per chunk, onDone(result) fires with the full result,
 * onError(err) fires instead of onDone on failure.
 *
 * Returns a cancel function — call it on unmount so a half-finished answer
 * does not try to update a screen that is gone.
 *
 * Built on XMLHttpRequest rather than fetch because React Native's fetch does
 * not expose a readable body stream, so response.body cannot be iterated.
 */
export function streamSrish(message, history = [], handlers = {}) {
  const { onMeta, onToken, onDone, onError, ...opts } = handlers;

  const xhr = new XMLHttpRequest();
  let consumed = 0; // how much of responseText has been parsed
  let settled = false;
  let last = null;

  const fail = (err) => {
    if (settled) return;
    settled = true;
    onError?.(friendly(err));
  };

  // The server sends newline-delimited JSON, one event per line. XHR hands us
  // the whole text so far on each progress tick, so track how far we have read
  // and only parse complete lines — the tail may be a partial object.
  const drain = (final) => {
    const text = xhr.responseText || "";
    let cut = text.lastIndexOf("\n") + 1;
    if (final && cut < text.length) cut = text.length;
    if (cut <= consumed) return;

    const chunk = text.slice(consumed, cut);
    consumed = cut;

    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        continue; // ignore a torn line rather than killing the stream
      }
      if (ev.type === "token") onToken?.(ev.text || "");
      else if (ev.type === "meta") onMeta?.(ev);
      else if (ev.type === "done") last = ev;
    }
  };

  xhr.open("POST", `${SRISH_API_URL}/chat/stream`);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.timeout = SRISH_TIMEOUT_MS;

  xhr.onprogress = () => drain(false);

  xhr.onload = () => {
    drain(true);
    if (settled) return;
    if (xhr.status < 200 || xhr.status >= 300) {
      return fail(new Error(`Srish returned ${xhr.status}`));
    }
    settled = true;
    onDone?.(last || { reply: "", error: "no response from Srish" });
  };

  xhr.onerror = () => fail(new Error("Network request failed"));
  xhr.ontimeout = () => fail(new Error("Srish timed out"));

  try {
    xhr.send(body(message, history, opts));
  } catch (e) {
    fail(e);
  }

  return () => {
    if (settled) return;
    settled = true;
    try {
      xhr.abort();
    } catch {
      // already finished; nothing to abort
    }
  };
}
