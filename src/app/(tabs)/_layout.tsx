import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useColors } from '@/ui';

function icon(emoji: string) {
  return ({ focused }: { focused: boolean }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Parcours', tabBarIcon: icon('🗺️') }} />
      <Tabs.Screen name="league" options={{ title: 'Ligue', tabBarIcon: icon('🏆') }} />
      <Tabs.Screen name="deck" options={{ title: 'Deck', tabBarIcon: icon('🃏') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('🏅') }} />
    </Tabs>
  );
}
