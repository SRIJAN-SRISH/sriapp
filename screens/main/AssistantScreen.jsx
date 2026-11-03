// Srish — the tomato-expert chat helper. Answers stream in word by word
// from the Srish API (see services/api/chatService.jsx).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHAT_BG, DayChip, SrishAvatar, SrishBubble, UserBubble } from "../../components/srijan/chat";
import { TopInset } from "../../components/srijan/layout";
import { Icon } from "../../components/srijan/ui";
import { C } from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";
import { checkSrish, streamSrish } from "../../services/api/chatService";

const GREETING = {
  id: "greeting",
  role: "assistant",
  status: "done",
  content:
    "Namaste 🙏 Main Srish hoon, aapki kheti sahayak.\n\nTomato ki fasal ke baare mein kuch bhi poochiye — patte, rog, khaad ya paani. Hindi ya English, jo aasaan lage.\n\nAbhi main sirf **tomato** 🍅 mein madad kar sakti hoon.",
};

const QUICK = [
  "🍂 Patte peele ho rahe hain",
  "🐛 Patton par daag hain",
  "💧 Kitna paani dein?",
  "🧪 Kaun si khaad dein?",
  "🌱 Mera khet kaisa hai?",
];

let seq = 0;
const newId = () => `m${Date.now()}-${++seq}`;

// Completed question/answer pairs, oldest first — what the server expects as
// `history`. Failed or stopped-before-any-text turns are left out.
function toHistory(messages) {
  const out = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const q = messages[i];
    const a = messages[i + 1];
    if (q.role === "user" && a.role === "assistant" && a.status === "done" && a.content) {
      out.push({ role: "user", content: q.content }, { role: "assistant", content: a.content });
    }
  }
  return out;
}

export default function AssistantScreen({ route }) {
  const { farmId } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState("checking");
  const listRef = useRef(null);
  const cancelRef = useRef(null);

  // Other screens can open Srish with a question already typed in
  // (navigate("Assistant", { prefill, nonce })). The farmer still taps send.
  const prefill = route?.params?.prefill;
  const nonce = route?.params?.nonce;
  const [seenNonce, setSeenNonce] = useState(null);
  if (prefill && nonce && nonce !== seenNonce) {
    setSeenNonce(nonce);
    setDraft(prefill);
  }

  const ping = useCallback(() => {
    setServer("checking");
    checkSrish().then((h) => setServer(h ? "online" : "offline"));
  }, []);

  useEffect(() => {
    let alive = true;
    const poll = () =>
      checkSrish().then((h) => {
        if (alive) setServer(h ? "online" : "offline");
      });

    poll();
    // Keep checking, so the status recovers on its own once the model is back up
    // instead of waiting for the next send or a manual retry.
    const timer = setInterval(poll, 20000);

    return () => {
      alive = false;
      clearInterval(timer);
      // Abort a half-written answer if the screen goes away
      cancelRef.current?.();
    };
  }, []);

  // Send `text` as a new turn after `base` (the conversation so far).
  const ask = useCallback(
    (text, base) => {
      const question = text.trim();
      if (!question) return;
      const botId = newId();
      const now = new Date().toISOString();
      const patch = (fn) =>
        setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, ...fn(m) } : m)));
      const finish = () => {
        cancelRef.current = null;
        setBusy(false);
      };

      setMessages([
        ...base,
        { id: newId(), role: "user", content: question, status: "done", at: now },
        { id: botId, role: "assistant", content: "", status: "pending", meta: null, at: now },
      ]);
      setDraft("");
      setBusy(true);

      cancelRef.current = streamSrish(question, toHistory(base), {
        farmId,
        onMeta: (ev) =>
          patch(() => ({
            meta: {
              intent: ev.intent,
              degraded: !!ev.degraded,
              usedKb: !!ev.used_kb,
              kbDisease: ev.kb_disease || null,
            },
          })),
        onToken: (t) => patch((m) => ({ content: m.content + t, status: "streaming" })),
        onDone: (r) => {
          // A turn can complete while Ollama is down -- the server still sends a
          // polite "cannot answer" reply. Treating that as proof of life showed
          // "Online" for a bot that could not answer anything, so trust the flag.
          setServer(r.backend_down ? "offline" : "online");
          const at = new Date().toISOString();
          patch((m) => {
            if (r.backend_down) {
              return {
                status: "error",
                error: "Srish abhi aaram kar rahi hai 😴 Laptop par model chalu karke dobara bhejein.",
              };
            }
            const reply = r.reply || m.content;
            if (!reply) {
              return { status: "error", error: "Jawab nahi aa paaya. Thodi der baad dobara bhejein." };
            }
            return {
              content: reply,
              status: "done",
              at,
              meta: {
                intent: r.intent ?? m.meta?.intent,
                degraded: !!(r.degraded ?? m.meta?.degraded),
                usedKb: !!(r.used_kb ?? m.meta?.usedKb),
                kbDisease: r.kb_disease ?? m.meta?.kbDisease ?? null,
              },
            };
          });
          finish();
        },
        onError: (e) => {
          patch(() => ({ status: "error", error: e.message }));
          setServer("offline");
          finish();
        },
      });
    },
    [farmId],
  );

  const send = (text = draft) => {
    if (!busy) ask(text, messages);
  };

  // Quick replies carry a leading emoji for the eye; the question sent is the text.
  const sendQuick = (label) => send(label.replace(/^\S+\s/, ""));

  const retry = (botId) => {
    if (busy) return;
    const idx = messages.findIndex((m) => m.id === botId);
    const question = idx >= 1 ? messages[idx - 1] : null;
    if (question?.role !== "user") return;
    ask(question.content, messages.slice(0, idx - 1));
  };

  const stop = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setBusy(false);
    setMessages((prev) =>
      prev
        .map((m) =>
          m.role === "assistant" && (m.status === "pending" || m.status === "streaming")
            ? m.content
              ? { ...m, status: "done", stopped: true }
              : null
            : m,
        )
        .filter(Boolean)
        // Drop a question whose answer never started
        .filter((m, i, arr) => !(m.role === "user" && i === arr.length - 1)),
    );
  };

  const newChat = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setBusy(false);
    setMessages([]);
    setDraft("");
  };

  const subtitle = busy
    ? "likh rahi hai…"
    : server === "online"
      ? "Kheti sahayak · online"
      : server === "checking"
        ? "jud rahi hai…"
        : "abhi uplabdh nahi";
  const canSend = !!draft.trim() && !busy;

  return (
    <SafeAreaView style={s.safe} edges={["left", "right"]}>
      <TopInset />

      {/* Chat header, like a contact in a messaging app */}
      <View style={s.header}>
        <View>
          <SrishAvatar size={42} ring />
          <View style={[s.presence, { backgroundColor: server === "online" ? "#4ADE80" : server === "checking" ? C.warn : "#9CA3AF" }]} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title}>Srish</Text>
          <Text style={s.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {messages.length > 0 ? (
          <Pressable onPress={newChat} hitSlop={10} style={s.headerBtn} accessibilityLabel="Nayi baat shuru karein">
            <Icon name="square-edit-outline" size={21} color={C.white} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: CHAT_BG }} behavior="padding">
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) =>
            item.role === "user" ? (
              <UserBubble text={item.content} at={item.at} />
            ) : (
              <SrishBubble msg={item} onRetry={item.status === "error" ? () => retry(item.id) : null} />
            )
          }
          ListHeaderComponent={
            <>
              <DayChip label="Aaj" />
              {messages.length > 0 ? <SrishBubble msg={GREETING} /> : null}
            </>
          }
          ListEmptyComponent={
            <View>
              <SrishBubble msg={GREETING} />
              {server === "offline" ? (
                <Pressable onPress={ping} style={s.offline}>
                  <Icon name="cloud-off-outline" size={16} color={C.warn} />
                  <Text style={s.offlineTxt}>
                    Srish abhi uplabdh nahi hai. <Text style={s.offlineLink}>Dobara check karein</Text>
                  </Text>
                </Pressable>
              ) : null}
              <Text style={s.quickHead}>Ya inme se chunein</Text>
              <View style={s.quickWrap}>
                {QUICK.map((q) => (
                  <Pressable
                    key={q}
                    disabled={busy}
                    onPress={() => sendQuick(q)}
                    style={({ pressed }) => [s.quick, pressed && { backgroundColor: C.primarySoft }]}
                  >
                    <Text style={s.quickTxt}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />

        {/* Composer */}
        <View style={s.composer}>
          <View style={s.inputWrap}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Apna sawaal likhiye…"
              placeholderTextColor={C.textFaint}
              style={s.input}
              multiline
              maxLength={2000}
            />
          </View>
          {busy ? (
            <Pressable onPress={stop} style={({ pressed }) => [s.sendBtn, s.stopBtn, pressed && { opacity: 0.85 }]}>
              <Icon name="stop" size={22} color={C.white} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => send()}
              disabled={!canSend}
              style={({ pressed }) => [s.sendBtn, !canSend && s.sendBtnOff, pressed && { opacity: 0.85 }]}
            >
              <Icon name="send" size={20} color={C.white} style={{ marginLeft: 2 }} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.deep },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.deep,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  presence: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.deep,
  },
  title: { fontSize: 19, fontWeight: "900", color: C.white, letterSpacing: -0.3 },
  subtitle: { fontSize: 12.5, color: C.onDeep, fontWeight: "600", marginTop: 1 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  list: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, flexGrow: 1 },

  offline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: C.warnSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginVertical: 6,
  },
  offlineTxt: { fontSize: 12.5, color: C.text, flexShrink: 1 },
  offlineLink: { fontWeight: "800", color: C.warn },

  quickHead: { fontSize: 12.5, fontWeight: "700", color: C.textMuted, marginTop: 10, marginBottom: 8, marginLeft: 4 },
  quickWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quick: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.primaryMid,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  quickTxt: { fontSize: 14, color: C.primaryDark, fontWeight: "700" },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 6,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  input: { fontSize: 16, color: C.text, maxHeight: 110, paddingVertical: 10 },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { backgroundColor: C.primaryMid },
  stopBtn: { backgroundColor: C.danger },
});
