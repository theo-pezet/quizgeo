import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, type ComponentProps } from 'react';
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
  const insets = useSafeAreaInsets();
  // La barre d'onglets absorbe déjà la marge basse du système : les écrans
  // d'onglet la voient à 0, sinon elle serait comptée deux fois (bande vide
  // au-dessus de la barre, panneaux qui flottent 48 dp trop haut).
  const screenInsets = useMemo(() => ({ ...insets, bottom: 0 }), [insets]);
  return (
    <Tabs
      screenLayout={({ children }) => <SafeAreaInsetsContext.Provider value={screenInsets}>{children}</SafeAreaInsetsContext.Provider>}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        // Hauteur explicite + marge basse : sur Android 15+ (edge-to-edge) la barre
        // système recouvre le bas de l'écran, il faut la compenser nous-mêmes.
        // Icône 24 + libellé 16 (hauteur de ligne explicite : Nunito a de grands
        // jambages, « Ligue » et « Parcours » étaient coupés en bas).
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 2, height: 66 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 6 },
        tabBarLabelStyle: { fontFamily: fonts.extraBold, fontSize: 11, lineHeight: 16, marginTop: 2 },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.path'), tabBarIcon: icon('map', 'map-outline') }} />
      <Tabs.Screen name="league" options={{ title: t('tabs.league'), tabBarIcon: icon('trophy', 'trophy-outline') }} />
      <Tabs.Screen name="deck" options={{ title: t('tabs.deck'), tabBarIcon: icon('albums', 'albums-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
