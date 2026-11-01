import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AuthGate from "./auth/AuthGate";
import { C } from "./constants/colors";
import { AuthProvider } from "./context/AuthContext";

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: C.primary, background: C.bg, card: C.white, border: C.border, text: C.text },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={theme}>
          <AuthGate />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
