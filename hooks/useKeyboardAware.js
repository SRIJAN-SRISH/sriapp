import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, TextInput } from "react-native";

// Keeps the focused input visible above the keyboard.
//
// With Android edge-to-edge (Expo SDK 54+) the window no longer resizes when
// the keyboard opens, so the screen's ScrollView must be padded and scrolled
// manually. Screens attach `scrollRef` + `onScroll` to their ScrollView; inputs
// call `onFieldFocus` (via KeyboardAwareContext) when focused.

export const KeyboardAwareContext = createContext(null);

export function useKeyboardAwareField() {
  return useContext(KeyboardAwareContext);
}

const MARGIN = 24; // space kept between the input and the keyboard/footer

export function useKeyboardAware() {
  const scrollRef = useRef(null);
  const offsetY = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const visibleRef = useRef(false);

  const ensureFocusedVisible = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput?.();
    const scroll = scrollRef.current;
    if (!input || !scroll || typeof input.measureInWindow !== "function") return;
    scroll.measureInWindow?.((sx, sy, sw, sh) => {
      input.measureInWindow((ix, iy, iw, ih) => {
        const visibleBottom = sy + sh - MARGIN;
        const visibleTop = sy + MARGIN;
        let delta = 0;
        if (iy + ih > visibleBottom) delta = iy + ih - visibleBottom;
        else if (iy < visibleTop) delta = iy - visibleTop;
        if (delta !== 0) {
          scroll.scrollTo({ y: Math.max(0, offsetY.current + delta), animated: true });
        }
      });
    });
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    let timer;
    const show = Keyboard.addListener(showEvt, () => {
      visibleRef.current = true;
      setKeyboardVisible(true);
      // Wait for KeyboardAvoidingView padding + header collapse to lay out.
      clearTimeout(timer);
      timer = setTimeout(ensureFocusedVisible, Platform.OS === "ios" ? 320 : 180);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      visibleRef.current = false;
      setKeyboardVisible(false);
    });
    return () => {
      clearTimeout(timer);
      show.remove();
      hide.remove();
    };
  }, [ensureFocusedVisible]);

  // Moving focus between fields while the keyboard is already open
  const onFieldFocus = useCallback(() => {
    if (visibleRef.current) setTimeout(ensureFocusedVisible, 60);
  }, [ensureFocusedVisible]);

  const onScroll = useCallback((e) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  // Value for KeyboardAwareContext.Provider
  const fieldContext = useMemo(() => ({ onFieldFocus }), [onFieldFocus]);

  return { scrollRef, onScroll, keyboardVisible, fieldContext };
}
