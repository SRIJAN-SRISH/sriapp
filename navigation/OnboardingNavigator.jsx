import { createNativeStackNavigator } from "@react-navigation/native-stack";

import OnboardingScreen from "../screens/onboarding/RegisterUserScreen";

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}
