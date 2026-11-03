import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SrijanTabBar from "../components/srijan/TabBar";
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

// Five tabs with Srish in the middle. Devices is opened from Home / Account
// (it is the screen farmers need least often).
function Tabs() {
  return (
    <Tab.Navigator tabBar={(props) => <SrijanTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Sensors" component={SensorDataScreen} />
      <Tab.Screen name="Assistant" component={AssistantScreen} />
      <Tab.Screen name="Irrigation" component={IrrigationScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Device" component={DeviceListScreen} />
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
