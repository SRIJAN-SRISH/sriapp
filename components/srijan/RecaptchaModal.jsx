// reCAPTCHA for Firebase Phone Auth in React Native / Expo Go.
//
// Firebase's JS SDK needs an "application verifier" before it will send an
// SMS. On the web that's a reCAPTCHA widget; in React Native we render the
// same widget inside a WebView (served from the Firebase authDomain, which is
// an authorised reCAPTCHA domain) and pass the token back.
//
// Usage:
//   const { verifier, modal } = useRecaptchaVerifier();
//   await signInWithPhoneNumber(auth, phone, verifier);
//   ...render {modal} somewhere in the screen.

import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { firebaseConfig } from "../../config/firebase";
import { C, RADIUS } from "../../constants/colors";
import { Icon } from "./ui";

const FIREBASE_JS = "https://www.gstatic.com/firebasejs/10.12.2";

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<script src="${FIREBASE_JS}/firebase-app-compat.js"></script>
<script src="${FIREBASE_JS}/firebase-auth-compat.js"></script>
<style>
  html, body { margin: 0; height: 100%; background: #ffffff; }
  body { display: flex; align-items: flex-start; justify-content: center; padding-top: 12px; }
</style>
</head>
<body>
<div id="rc"></div>
<script>
  function send(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  try {
    firebase.initializeApp(${JSON.stringify(firebaseConfig)});
    var verifier = new firebase.auth.RecaptchaVerifier("rc", {
      size: "normal",
      callback: function (token) { send({ type: "token", token: token }); },
      "expired-callback": function () { send({ type: "expired" }); }
    });
    verifier.render()
      .then(function () { send({ type: "ready" }); })
      .catch(function (e) { send({ type: "error", message: String((e && e.message) || e) }); });
  } catch (e) {
    send({ type: "error", message: String((e && e.message) || e) });
  }
</script>
</body>
</html>`;

export function useRecaptchaVerifier() {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  // { resolve, reject } of the verify() call waiting for a token
  const pendingRef = useRef(null);

  // Stable ApplicationVerifier handed to Firebase's signInWithPhoneNumber.
  const verifier = useMemo(
    () => ({
      type: "recaptcha",
      verify: () =>
        new Promise((resolve, reject) => {
          pendingRef.current = { resolve, reject };
          setReady(false);
          setVisible(true);
        }),
      _reset: () => {},
    }),
    [],
  );

  const finish = (fn) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setVisible(false);
    if (p) fn(p);
  };

  const onMessage = (e) => {
    let msg;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === "ready") setReady(true);
    else if (msg.type === "token") finish((p) => p.resolve(msg.token));
    else if (msg.type === "error") {
      finish((p) => {
        const err = new Error(msg.message || "Security check failed to load.");
        err.code = "recaptcha-error";
        p.reject(err);
      });
    }
  };

  const cancel = () =>
    finish((p) => {
      const err = new Error("Security check was cancelled.");
      err.code = "recaptcha-cancelled";
      p.reject(err);
    });

  const modal = (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={cancel}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.head}>
            <Icon name="shield-check-outline" size={22} color={C.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.title}>Quick security check</Text>
              <Text style={s.sub}>{"Tick \"I'm not a robot\" to receive your OTP."}</Text>
            </View>
            <Pressable onPress={cancel} hitSlop={10}>
              <Icon name="close" size={24} color={C.textMuted} />
            </Pressable>
          </View>
          <View style={s.webWrap}>
            {visible ? (
              <WebView
                source={{ html: HTML, baseUrl: `https://${firebaseConfig.authDomain}` }}
                originWhitelist={["*"]}
                onMessage={onMessage}
                javaScriptEnabled
                style={{ backgroundColor: C.white }}
              />
            ) : null}
            {!ready ? (
              <View style={s.loading} pointerEvents="none">
                <ActivityIndicator color={C.primary} />
                <Text style={s.loadingTxt}>Loading…</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );

  return { verifier, modal };
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingBottom: 24,
  },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, marginBottom: 10 },
  title: { fontSize: 17, fontWeight: "900", color: C.text },
  sub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  webWrap: { height: 520, marginHorizontal: 8, borderRadius: RADIUS.md, overflow: "hidden" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white,
  },
  loadingTxt: { marginTop: 8, color: C.textFaint, fontSize: 13 },
});
