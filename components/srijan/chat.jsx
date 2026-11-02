// Chat building blocks for the Srish assistant screen.

import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { C, SHADOW } from "../../constants/colors";
import { Badge, Icon } from "./ui";

// What the router decided the question was about → label shown on the reply.
const INTENT_LABELS = {
  tomato_disease: ["Disease help", "bug-outline", "danger"],
  tomato_general: ["Tomato care", "sprout-outline", "primary"],
  farm_status: ["Your farm now", "access-point", "water"],
  farm_report: ["Farm report", "chart-box-outline", "water"],
  url_query: ["From a link", "link-variant", "info"],
};

export function SrishAvatar({ size = 30 }) {
  return (
    <View style={[c.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon name="robot-happy-outline" size={size * 0.58} color={C.white} />
    </View>
  );
}

// ─── Lightweight markdown: **bold**, bullets, numbered lists, headings ───────
function Inline({ text, style }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <Text key={i} style={c.bold}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

export function RichText({ text, style }) {
  const lines = text.replace(/\r/g, "").split("\n");
  return (
    <View>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={{ height: 6 }} />;

        const heading = line.match(/^#{1,4}\s+(.*)$/);
        if (heading) return <Inline key={i} text={heading[1]} style={[style, c.bold, { marginTop: 2 }]} />;

        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        if (bullet) {
          return (
            <View key={i} style={c.listRow}>
              <Text style={[style, c.bulletDot]}>•</Text>
              <Inline text={bullet[1]} style={[style, { flex: 1 }]} />
            </View>
          );
        }

        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (numbered) {
          return (
            <View key={i} style={c.listRow}>
              <Text style={[style, c.number]}>{numbered[1]}.</Text>
              <Inline text={numbered[2]} style={[style, { flex: 1 }]} />
            </View>
          );
        }

        return <Inline key={i} text={line} style={style} />;
      })}
    </View>
  );
}

// ─── Three bouncing dots while Srish is thinking ─────────────────────────────
function Dot({ delay }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        c.dot,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
        },
      ]}
    />
  );
}

export function TypingDots() {
  return (
    <View style={c.dots}>
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
}

// ─── Message bubbles ─────────────────────────────────────────────────────────
export function UserBubble({ text }) {
  return (
    <View style={c.userRow}>
      <View style={c.userBubble}>
        <Text style={c.userTxt}>{text}</Text>
      </View>
    </View>
  );
}

export function SrishBubble({ msg, onRetry }) {
  const { content, status, meta, error } = msg;
  const intent = meta?.intent ? INTENT_LABELS[meta.intent] : null;
  const thinking = status === "pending" && !content;

  return (
    <View style={c.botRow}>
      <SrishAvatar size={28} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <View style={[c.botBubble, status === "error" && c.botBubbleError]}>
          {thinking ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TypingDots />
              <Text style={c.thinkingTxt}>{meta ? "Jawab likh rahi hoon…" : "Soch rahi hoon…"}</Text>
            </View>
          ) : status === "error" ? (
            <View style={{ flexDirection: "row" }}>
              <Icon name="wifi-off" size={18} color={C.danger} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={c.errTxt}>{error}</Text>
                {onRetry ? (
                  <Pressable onPress={onRetry} hitSlop={8} style={{ marginTop: 6 }}>
                    <Text style={c.retryTxt}>Try again</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : (
            <>
              <RichText text={content} style={c.botTxt} />
              {status === "streaming" ? <View style={c.caret} /> : null}
              {msg.stopped ? <Text style={c.stoppedTxt}>Stopped</Text> : null}
            </>
          )}
        </View>

        {status === "done" && (intent || meta?.degraded || meta?.usedKb) ? (
          <View style={c.tags}>
            {intent ? <Badge label={intent[0]} icon={intent[1]} tone={intent[2]} /> : null}
            {meta?.usedKb ? (
              <Badge
                label={meta.kbDisease ? `Knowledge base · ${meta.kbDisease}` : "Knowledge base"}
                icon="book-open-variant"
                tone="primary"
              />
            ) : null}
            {meta?.degraded ? (
              <Badge label="Quick answer · please double-check" icon="alert-outline" tone="warn" />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const c = StyleSheet.create({
  avatar: { backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  bold: { fontWeight: "800" },
  listRow: { flexDirection: "row", marginTop: 2 },
  bulletDot: { width: 14, color: C.primary, fontWeight: "900" },
  number: { minWidth: 20, color: C.primary, fontWeight: "800" },

  dots: { flexDirection: "row", alignItems: "center", height: 16, gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },

  userRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 12, paddingLeft: 48 },
  userBubble: {
    backgroundColor: C.primary,
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userTxt: { color: C.white, fontSize: 15, lineHeight: 21 },

  botRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14, paddingRight: 24 },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: C.card,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxWidth: "100%",
    ...SHADOW,
    elevation: 1,
  },
  botBubbleError: { backgroundColor: C.dangerSoft, borderColor: C.danger + "33" },
  botTxt: { color: C.text, fontSize: 15, lineHeight: 22 },
  thinkingTxt: { marginLeft: 10, fontSize: 13.5, color: C.textMuted, fontWeight: "600" },
  caret: { width: 8, height: 15, borderRadius: 2, backgroundColor: C.primaryMid, marginTop: 4 },
  stoppedTxt: { marginTop: 6, fontSize: 12, color: C.textFaint, fontStyle: "italic" },
  errTxt: { fontSize: 14, color: C.text, lineHeight: 20 },
  retryTxt: { fontSize: 13.5, fontWeight: "800", color: C.danger },

  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
});
