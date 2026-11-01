import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";

// Loads data whenever the screen is focused, supports pull-to-refresh, and
// optionally re-polls every `pollMs` while focused.
// `key` identifies the inputs (e.g. the farm ID); results from a different
// key are discarded, so switching farms never shows the old farm's data.
export function useLoader(loader, key, { pollMs } = {}) {
  const [state, setState] = useState({ key: undefined, data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(
    async (mode) => {
      if (mode === "refresh") setRefreshing(true);
      try {
        const data = await loaderRef.current();
        setState({ key, data, error: null });
      } catch (e) {
        const error = e?.message || "Could not load data.";
        setState((s) => ({ key, data: s.key === key ? s.data : null, error }));
      } finally {
        setRefreshing(false);
      }
    },
    [key],
  );

  useFocusEffect(
    useCallback(() => {
      run("focus");
      if (!pollMs) return undefined;
      const id = setInterval(() => run("poll"), pollMs);
      return () => clearInterval(id);
    }, [run, pollMs]),
  );

  const current = state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current,
    refreshing,
    reload: () => run("refresh"),
  };
}
