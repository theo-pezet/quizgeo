import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CATALOG, EXERCISES, SUBJECTS, UNITS, type Subject, type Unit } from '@/content';
import {
  PATH_TRAITS,
  allUnitTraits,
  canStartLesson,
  currentUnit,
  isActiveToday,
  isUnitUnlocked,
  levelProgress,
  reviewQueueSize,
  toDayKey,
  type Traits,
} from '@/game';
import { useProgress } from '@/store/progress';
import { Button, Card, Crowns, EnergyBadge, NoEnergySheet, ProgressBar, QuestsCard, Screen, Text, radius, space, useColors } from '@/ui';

export default function PathScreen() {
  const colors = useColors();
  const progress = useProgress((s) => s.progress);
  const tick = useProgress((s) => s.tick);
  useFocusEffect(useCallback(() => tick(), [tick]));
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id);
  const [picked, setPicked] = useState<Unit | null>(null);
  const [noEnergy, setNoEnergy] = useState(false);

  const now = new Date();
  const today = toDayKey(now);
  // Couronnes du jour (fissures comprises) et couronnes « pleines », pour montrer ce qui s'est perdu.
  const traits = useMemo(() => allUnitTraits(progress, EXERCISES, CATALOG, today), [progress, today]);
  const traitsFull = useMemo(() => allUnitTraits(progress, EXERCISES, CATALOG), [progress]);
  const subject = SUBJECTS.find((s) => s.id === subjectId) as Subject;
  const units = UNITS.filter((u) => u.subjectId === subjectId);
  const current = currentUnit(subjectId, traits, CATALOG);
  const level = levelProgress(progress.xp);
  const queue = reviewQueueSize(progress);
  const flame = isActiveToday(progress.streak, today);

  const startUnit = (unit: Unit, skipTest = false) => {
    if (!canStartLesson(progress.energy, new Date())) {
      setPicked(null);
      setNoEnergy(true);
      return;
    }
    setPicked(null);
    router.push({ pathname: '/session/[unitId]', params: skipTest ? { unitId: unit.id, skip: '1' } : { unitId: unit.id } });
  };

  const sheet = picked ? (
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sheetHead}>
            <Text variant="h2" style={styles.sheetTitle}>
              {picked.title}
            </Text>
            <Crowns count={traits[picked.id] ?? 0} cracked={Math.max(0, (traitsFull[picked.id] ?? 0) - (traits[picked.id] ?? 0))} size={16} />
          </View>
          <Text variant="small" secondary>
            {picked.description}
          </Text>
          {(traitsFull[picked.id] ?? 0) > (traits[picked.id] ?? 0) && (
            <Text variant="small" style={{ color: colors.danger }}>
              💔 Des couronnes se sont fissurées faute de révision : rejoue l’unité pour les réparer.
            </Text>
          )}
          {isUnitUnlocked(picked.id, traits, CATALOG) ? (
            <Button
              label={
                (traits[picked.id] ?? 0) === 0
                  ? 'Commencer · ⚡ 5'
                  : (traits[picked.id] ?? 0) >= 5
                    ? 'Légendaire · rejouer · ⚡ 5'
                    : (traits[picked.id] ?? 0) >= PATH_TRAITS
                      ? `Vers la ${(traits[picked.id] ?? 0) + 1}ᵉ couronne · ⚡ 5`
                      : 'Continuer · ⚡ 5'
              }
              color={subject.color}
              onPress={() => startUnit(picked)}
            />
          ) : (
            <>
              <Text variant="small" style={{ color: colors.danger }}>
                🔒 Gagne une couronne sur l’unité précédente pour ouvrir celle-ci.
              </Text>
              <Button label="Tester pour sauter ici · 8/10 · ⚡ 5" tone="secondary" onPress={() => startUnit(picked, true)} />
              <Text variant="small" secondary>
                Tu connais déjà ? Réussis 8 exercices sur 10 de cette unité et les précédentes sont validées.
              </Text>
            </>
          )}
          <Button label="Fermer" tone="ghost" onPress={() => setPicked(null)} />
        </View>
  ) : null;

  return (
    <Screen overlay={sheet}>
      <View style={styles.header}>
        <View style={styles.stats}>
          <Text variant="bodyBold">
            {flame ? '🔥' : '🩶'} {progress.streak.current}
          </Text>
          <EnergyBadge energy={progress.energy} now={now} compact />
          <Text variant="bodyBold">💎 {progress.gems}</Text>
          <Text variant="bodyBold">⭐ {level.level}</Text>
        </View>
        <ProgressBar ratio={level.ratio} height={6} />
      </View>

      {noEnergy && <NoEnergySheet onClose={() => setNoEnergy(false)} />}
      {progress.quests.items.length > 0 && <QuestsCard quests={progress.quests.items} />}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {SUBJECTS.map((s) => {
          const active = s.id === subjectId;
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                setSubjectId(s.id);
                setPicked(null);
              }}
              style={[styles.chip, { backgroundColor: active ? s.color : colors.surface, borderColor: active ? s.color : colors.border }]}>
              <Text variant="small" style={{ color: active ? '#fff' : colors.text }}>
                {s.emoji} {s.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text variant="small" secondary>
        {subject.tagline}
      </Text>

      {queue > 0 && (
        <Card style={{ borderColor: colors.primary }}>
          <Text variant="bodyBold">🔁 {queue} exercice{queue > 1 ? 's' : ''} à revoir</Text>
          <Text variant="small" secondary>
            Les erreurs reviennent jusqu’à deux bonnes réponses d’affilée.
          </Text>
          <Button label="Réviser mes erreurs" tone="secondary" onPress={() => router.push('/session/review')} />
        </Card>
      )}

      <View style={styles.path}>
        {units.map((unit, i) => {
          const t = traits[unit.id] ?? 0;
          const cracked = Math.max(0, (traitsFull[unit.id] ?? 0) - t);
          const unlocked = isUnitUnlocked(unit.id, traits, CATALOG);
          const isCurrent = unit.id === current;
          const offset = Math.round(Math.sin(i * 1.1) * 60);
          return (
            <View key={unit.id} style={[styles.nodeRow, { transform: [{ translateX: offset }] }]}>
              <PathNode unit={unit} traits={t} cracked={cracked} unlocked={unlocked} isCurrent={isCurrent} color={subject.color} onPress={() => setPicked(unit)} />
            </View>
          );
        })}
      </View>

    </Screen>
  );
}

function PathNode({
  unit,
  traits,
  cracked,
  unlocked,
  isCurrent,
  color,
  onPress,
}: {
  unit: Unit;
  traits: Traits;
  cracked: number;
  unlocked: boolean;
  isCurrent: boolean;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const bg = !unlocked ? colors.locked : traits >= 5 ? colors.gold : color;
  const emoji = !unlocked ? '🔒' : cracked > 0 ? '💔' : traits >= 5 ? '👑' : isCurrent ? '▶' : traits >= PATH_TRAITS ? '✓' : '•';
  return (
    <Pressable onPress={onPress} style={styles.node}>
      <View style={[styles.circle, { backgroundColor: bg }, isCurrent && { borderColor: colors.text, borderWidth: 3 }]}>
        <Text style={styles.nodeEmoji}>{emoji}</Text>
      </View>
      <View style={styles.nodeLabel}>
        <Text variant="small" numberOfLines={1}>
          {unit.title}
        </Text>
        <Crowns count={traits} cracked={cracked} size={10} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { gap: space.sm, paddingVertical: space.xs },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.md },
  path: { gap: space.lg, paddingVertical: space.md, paddingBottom: 240, alignItems: 'center' },
  nodeRow: { alignItems: 'center' },
  node: { alignItems: 'center', gap: space.xs, width: 200 },
  circle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  nodeEmoji: { fontSize: 24, color: '#fff' },
  nodeLabel: { alignItems: 'center', gap: 2 },
  sheet: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.sm, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  sheetTitle: { flex: 1 },
});
