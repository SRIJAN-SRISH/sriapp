// Chat building blocks for the Srish screen. Styled like a familiar messaging
// app (bubbles, times, ticks) so it feels like texting a farm helper.

import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { C } from "../../constants/colors";
import { Icon } from "./ui";

export const CHAT_BG = "#EEF4EC";

export function clockTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h < 12 ? "am" : "pm"}`;
}

export function SrishAvatar({ size = 30, ring }) {
  return (
    <View
      style={[
        c.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        ring && { borderWidth: 2, borderColor: "rgba(255,255,255,0.35)" },
      ]}
    >
      <Icon name="sprout" size={size * 0.56} color={C.white} />
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

// ─── Three bouncing dots, like "typing…" in a messaging app ─────────────────
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
export function DayChip({ label }) {
  return (
    <View style={c.dayChip}>
      <Text style={c.dayChipTxt}>{label}</Text>
    </View>
  );
}

export function UserBubble({ text, at }) {
  return (
    <View style={c.userRow}>
      <View style={c.userBubble}>
        <Text style={c.userTxt}>{text}</Text>
        <View style={c.metaRow}>
          <Text style={c.userTime}>{clockTime(at)}</Text>
          <Icon name="check-all" size={14} color="#BDE8CC" style={{ marginLeft: 3 }} />
        </View>
      </View>
    </View>
  );
}

export function SrishBubble({ msg, onRetry }) {
  const { content, status, meta, error, at } = msg;
  const thinking = status === "pending" && !content;

  if (thinking) {
    return (
      <View style={c.botRow}>
        <View style={[c.botBubble, { paddingVertical: 14 }]}>
          <TypingDots />
        </View>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={c.botRow}>
        <View style={[c.botBubble, c.botBubbleError]}>
          <View style={{ flexDirection: "row" }}>
            <Icon name="alert-circle-outline" size={18} color={C.danger} style={{ marginTop: 1 }} />
            <Text style={[c.botTxt, { flex: 1, marginLeft: 6 }]}>{error}</Text>
          </View>
          {onRetry ? (
            <Pressable onPress={onRetry} hitSlop={8} style={c.retryBtn}>
              <Icon name="refresh" size={16} color={C.primaryDark} />
              <Text style={c.retryTxt}>Dobara bhejein</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={c.botRow}>
      <View style={c.botBubble}>
        <RichText text={content} style={c.botTxt} />
        {meta?.usedKb && status === "done" ? (
          <View style={c.note}>
            <Icon name="book-open-page-variant-outline" size={13} color={C.primary} />
            <Text style={c.noteTxt}>
              Tomato rog guide se{meta.kbDisease ? ` · ${meta.kbDisease}` : ""}
            </Text>
          </View>
        ) : null}
        {meta?.degraded && status === "done" ? (
          <View style={c.note}>
            <Icon name="information-outline" size={13} color={C.warn} />
            <Text style={[c.noteTxt, { color: C.warn }]}>Jaldi ka jawab — ek baar confirm kar lein</Text>
          </View>
        ) : null}
        <View style={c.metaRow}>
          {msg.stopped ? <Text style={c.botTime}>rok diya · </Text> : null}
          <Text style={c.botTime}>{status === "streaming" ? "likh rahi hai…" : clockTime(at)}</Text>
        </View>
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

  dots: { flexDirection: "row", alignItems: "center", height: 12, gap: 5, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.textFaint },

  dayChip: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  dayChipTxt: { fontSize: 12, color: C.textMuted, fontWeight: "700" },

  metaRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginTop: 3 },

  userRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 8, paddingLeft: 56 },
  userBubble: {
    backgroundColor: C.primary,
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  userTxt: { color: C.white, fontSize: 15.5, lineHeight: 21 },
  userTime: { fontSize: 10.5, color: "#D3EEDD" },

  botRow: { flexDirection: "row", marginBottom: 8, paddingRight: 40 },
  botBubble: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  botBubbleError: { backgroundColor: "#FFF5F5" },
  botTxt: { color: C.text, fontSize: 15.5, lineHeight: 22 },
  botTime: { fontSize: 10.5, color: C.textFaint },

  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  noteTxt: { fontSize: 12, color: C.primary, fontWeight: "600", flexShrink: 1 },

  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: C.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  retryTxt: { fontSize: 13, fontWeight: "800", color: C.primaryDark },
});
