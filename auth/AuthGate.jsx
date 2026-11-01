import { useAuth } from "../context/AuthContext";
import AuthNavigator from "../navigation/AuthNavigator";
import MainNavigator from "../navigation/MainNavigator";
import SplashScreen from "../screens/common/splashScreen";

// Picks the navigator from the auth state. Logging in, registering or
// logging out flips `status`, which swaps the whole navigator tree.
export default function AuthGate() {
  const { status } = useAuth();
  if (status === "loading") return <SplashScreen />;
  if (status === "signedIn") return <MainNavigator />;
  return <AuthNavigator />;
}
