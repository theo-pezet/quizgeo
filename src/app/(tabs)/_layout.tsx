import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useT } from '@/i18n';
import { fonts, useColors } from '@/ui';

type Name = ComponentProps<typeof Ionicons>['name'];

function icon(active: Name, inactive: Name) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => <Ionicons name={focused ? active : inactive} size={24} color={color} />;
}

export default function TabsLayout() {
  const colors = useColors();
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 2, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.extraBold, fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.path'), tabBarIcon: icon('map', 'map-outline') }} />
      <Tabs.Screen name="league" options={{ title: t('tabs.league'), tabBarIcon: icon('trophy', 'trophy-outline') }} />
      <Tabs.Screen name="deck" options={{ title: t('tabs.deck'), tabBarIcon: icon('albums', 'albums-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
