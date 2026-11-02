import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Icon } from "../components/srijan/ui";
import { C } from "../constants/colors";
import AddDeviceScreen from "../screens/device/AddDeviceScreen";
import DeviceDetailsScreen from "../screens/device/DeviceDetailsScreen";
import DeviceListScreen from "../screens/device/DeviceListScreen";
import AlertsScreen from "../screens/main/AlertsScreen";
import AssistantScreen from "../screens/main/AssistantScreen";
import DashboardScreen from "../screens/main/dashboardScreen";
import FarmOverviewScreen from "../screens/main/FarmOverviewScreen";
import IrrigationScreen from "../screens/main/IrrigationScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import SensorDataScreen from "../screens/main/SensorDatascreen";
import ChangePasswordScreen from "../screens/settings/ChangePasswordScreen";
import EditProfileScreen from "../screens/settings/EditProfileScreen";
import HelpScreen from "../screens/settings/HelpScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Home: ["home-variant", "home-variant-outline"],
  Sensors: ["chart-box", "chart-box-outline"],
  Assistant: ["robot-happy", "robot-happy-outline"],
  Irrigation: ["water", "water-outline"],
  Device: ["router-wireless", "router-wireless"],
  Profile: ["account-circle", "account-circle-outline"],
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textFaint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarStyle: { backgroundColor: C.white, borderTopColor: C.border },
        tabBarIcon: ({ focused, color, size }) => (
          <Icon name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Sensors" component={SensorDataScreen} />
      <Tab.Screen name="Assistant" component={AssistantScreen} options={{ title: "Srish" }} />
      <Tab.Screen name="Irrigation" component={IrrigationScreen} />
      <Tab.Screen name="Device" component={DeviceListScreen} options={{ title: "Devices" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Account" }} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="FarmOverview" component={FarmOverviewScreen} />
      <Stack.Screen name="NodeDetails" component={DeviceDetailsScreen} />
      <Stack.Screen name="LinkFarm" component={AddDeviceScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
    </Stack.Navigator>
  );
}
