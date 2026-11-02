// Srish — the tomato-expert chat assistant. Answers stream in word by word
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

import { SrishAvatar, SrishBubble, UserBubble } from "../../components/srijan/chat";
import { TopInset } from "../../components/srijan/layout";
import { Badge, Banner, Card, Icon } from "../../components/srijan/ui";
import { C, RADIUS, SHADOW } from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";
import { checkSrish, streamSrish } from "../../services/api/chatService";

const SUGGESTIONS = [
  { icon: "leaf", text: "Tomato ke patte peele kyon ho rahe hain?" },
  { icon: "bug-outline", text: "Early blight ka ilaaj kya hai?" },
  { icon: "water-outline", text: "Tomato ko kitna paani dena chahiye?" },
  { icon: "access-point", text: "Mere khet ka abhi kya haal hai?" },
];

const STATUS = {
  checking: { label: "Connecting…", color: C.warn },
  online: { label: "Online · tomato expert", color: C.primaryMid },
  offline: { label: "Offline", color: "#F28B82" },
};

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

export default function AssistantScreen() {
  const { farmId } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState("checking");
  const listRef = useRef(null);
  const cancelRef = useRef(null);

  const ping = useCallback(() => {
    setServer("checking");
    checkSrish().then((h) => setServer(h ? "online" : "offline"));
  }, []);

  useEffect(() => {
    checkSrish().then((h) => setServer(h ? "online" : "offline"));
    // Abort a half-written answer if the screen goes away
    return () => cancelRef.current?.();
  }, []);

  // Send `text` as a new turn after `base` (the conversation so far).
  const ask = useCallback(
    (text, base) => {
      const question = text.trim();
      if (!question) return;
      const botId = newId();
      const patch = (fn) =>
        setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, ...fn(m) } : m)));
      const finish = () => {
        cancelRef.current = null;
        setBusy(false);
      };

      setMessages([
        ...base,
        { id: newId(), role: "user", content: question, status: "done" },
        { id: botId, role: "assistant", content: "", status: "pending", meta: null },
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
          setServer("online");
          patch((m) => {
            const reply = r.reply || m.content;
            if (!reply) {
              return { status: "error", error: "Srish abhi jawab nahi de paayi. Thodi der baad try karein." };
            }
            return {
              content: reply,
              status: "done",
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

  const status = STATUS[server];
  const canSend = !!draft.trim() && !busy;

  return (
    <SafeAreaView style={s.safe} edges={["left", "right"]}>
      <TopInset />

      {/* Deep-green header, continuing the status-bar strip */}
      <View style={s.header}>
        <SrishAvatar size={42} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title}>Srish</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <View style={[s.statusDot, { backgroundColor: status.color }]} />
            <Text style={s.subtitle}>{status.label}</Text>
          </View>
        </View>
        {messages.length > 0 ? (
          <Pressable onPress={newChat} hitSlop={10} style={s.headerBtn}>
            <Icon name="chat-plus-outline" size={21} color={C.white} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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
              <UserBubble text={item.content} />
            ) : (
              <SrishBubble msg={item} onRetry={item.status === "error" ? () => retry(item.id) : null} />
            )
          }
          ListHeaderComponent={
            server === "offline" && messages.length === 0 ? (
              <Banner
                tone="warn"
                icon="cloud-off-outline"
                title="Srish is offline"
                message="Couldn't reach the assistant server. Check your internet, or ask your admin to start the Srish server."
                action="Try again"
                onAction={ping}
                style={{ marginBottom: 14 }}
              />
            ) : null
          }
          ListEmptyComponent={<Welcome onPick={send} disabled={busy} />}
        />

        {/* Composer */}
        <View style={s.composer}>
          <View style={s.inputWrap}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Tomato ke baare mein poochiye…"
              placeholderTextColor={C.textFaint}
              style={s.input}
              multiline
              maxLength={2000}
            />
          </View>
          {busy ? (
            <Pressable onPress={stop} style={({ pressed }) => [s.sendBtn, s.stopBtn, pressed && { opacity: 0.85 }]}>
              <Icon name="stop" size={22} color={C.danger} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => send()}
              disabled={!canSend}
              style={({ pressed }) => [s.sendBtn, !canSend && s.sendBtnOff, pressed && { opacity: 0.85 }]}
            >
              <Icon name="send" size={20} color={C.white} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Welcome({ onPick, disabled }) {
  return (
    <View>
      <Card style={s.hero}>
        <SrishAvatar size={58} />
        <Text style={s.heroTitle}>Namaste! Main Srish hoon 🍅</Text>
        <Text style={s.heroBody}>
          Tomato ki kheti, bimariyan, khaad-paani aur aapke khet ke sensor data ke baare mein kuch bhi poochiye —
          Hindi ya English mein.
        </Text>
        <Badge label="Abhi sirf tomato ke liye trained" icon="information-outline" tone="info" style={{ marginTop: 12, alignSelf: "center" }} />
      </Card>

      <Text style={s.suggestHead}>Try asking</Text>
      {SUGGESTIONS.map((q) => (
        <Pressable
          key={q.text}
          disabled={disabled}
          onPress={() => onPick(q.text)}
          style={({ pressed }) => [s.suggest, pressed && { opacity: 0.8 }]}
        >
          <View style={s.suggestIcon}>
            <Icon name={q.icon} size={18} color={C.primary} />
          </View>
          <Text style={s.suggestTxt}>{q.text}</Text>
          <Icon name="arrow-top-right" size={18} color={C.textFaint} />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.deep,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
  },
  title: { fontSize: 21, fontWeight: "900", color: C.white, letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, color: C.onDeep, fontWeight: "600" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },

  hero: { alignItems: "center", paddingVertical: 22 },
  heroTitle: { fontSize: 19, fontWeight: "900", color: C.text, marginTop: 12, letterSpacing: -0.3 },
  heroBody: { fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 20, marginTop: 6 },

  suggestHead: { fontSize: 13, fontWeight: "800", color: C.textMuted, marginTop: 18, marginBottom: 8, marginLeft: 2 },
  suggest: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 8,
  },
  suggestIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  suggestTxt: { flex: 1, fontSize: 14, color: C.text, fontWeight: "600" },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#FAFCFB",
    borderRadius: 22,
    paddingHorizontal: 14,
    minHeight: 46,
    justifyContent: "center",
  },
  input: { fontSize: 15.5, color: C.text, maxHeight: 110, paddingVertical: 10 },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  sendBtnOff: { backgroundColor: C.primaryMid, elevation: 0, shadowOpacity: 0 },
  stopBtn: { backgroundColor: C.dangerSoft, borderWidth: 1.5, borderColor: C.danger + "55", elevation: 0 },
});
