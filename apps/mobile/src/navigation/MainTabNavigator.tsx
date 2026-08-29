import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { FeedScreen } from '../screens/FeedScreen';
import { SubmitScreen } from '../screens/SubmitScreen';
import { MyVideosScreen } from '../screens/MyVideosScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors } from '../theme/tokens';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Feather.glyphMap> = {
  Feed: 'film',
  Submit: 'plus-circle',
  MyVideos: 'grid',
  Profile: 'user',
};

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <Feather name={ICONS[route.name as keyof MainTabParamList]} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Submit" component={SubmitScreen} options={{ title: 'Submit' }} />
      <Tab.Screen name="MyVideos" component={MyVideosScreen} options={{ title: 'My Videos' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
