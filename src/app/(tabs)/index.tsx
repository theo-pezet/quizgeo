import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CATALOG, EXERCISES, SUBJECTS, UNITS, type Subject, type Unit } from '@/content';
import {
  allUnitTraits,
  currentUnit,
  isActiveToday,
  isUnitUnlocked,
  levelProgress,
  reviewQueueSize,
  toDayKey,
  type Traits,
} from '@/game';
import { useProgress } from '@/store/progress';
import { Button, Card, Crowns, ProgressBar, Screen, Text, radius, space, useColors } from '@/ui';

export default function PathScreen() {
  const colors = useColors();
  const progress = useProgress((s) => s.progress);
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id);
  const [picked, setPicked] = useState<Unit | null>(null);

  const traits = useMemo(() => allUnitTraits(progress, EXERCISES, CATALOG), [progress]);
  const subject = SUBJECTS.find((s) => s.id === subjectId) as Subject;
  const units = UNITS.filter((u) => u.subjectId === subjectId);
  const current = currentUnit(subjectId, traits, CATALOG);
  const level = levelProgress(progress.xp);
  const queue = reviewQueueSize(progress);
  const flame = isActiveToday(progress.streak, toDayKey(new Date()));

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.stats}>
          <Text variant="bodyBold">
            {flame ? '🔥' : '🩶'} {progress.streak.current}
          </Text>
          <Text variant="bodyBold">⭐ Niv. {level.level}</Text>
          <Text variant="bodyBold">✨ {progress.xp} XP</Text>
        </View>
        <ProgressBar ratio={level.ratio} height={6} />
      </View>

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
          const unlocked = isUnitUnlocked(unit.id, traits, CATALOG);
          const isCurrent = unit.id === current;
          const offset = Math.round(Math.sin(i * 1.1) * 60);
          return (
            <View key={unit.id} style={[styles.nodeRow, { transform: [{ translateX: offset }] }]}>
              <PathNode unit={unit} traits={t} unlocked={unlocked} isCurrent={isCurrent} color={subject.color} onPress={() => setPicked(unit)} />
            </View>
          );
        })}
      </View>

      {picked && (
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sheetHead}>
            <Text variant="h2" style={styles.sheetTitle}>
              {picked.title}
            </Text>
            <Crowns count={traits[picked.id] ?? 0} size={16} />
          </View>
          <Text variant="small" secondary>
            {picked.description}
          </Text>
          {isUnitUnlocked(picked.id, traits, CATALOG) ? (
            <Button
              label={(traits[picked.id] ?? 0) === 0 ? 'Commencer' : (traits[picked.id] ?? 0) === 3 ? 'Refaire pour le plaisir' : 'Continuer'}
              color={subject.color}
              onPress={() => router.push({ pathname: '/session/[unitId]', params: { unitId: picked.id } })}
            />
          ) : (
            <Text variant="small" style={{ color: colors.danger }}>
              🔒 Gagne une couronne sur l’unité précédente pour ouvrir celle-ci.
            </Text>
          )}
          <Button label="Fermer" tone="ghost" onPress={() => setPicked(null)} />
        </View>
      )}
    </Screen>
  );
}

function PathNode({
  unit,
  traits,
  unlocked,
  isCurrent,
  color,
  onPress,
}: {
  unit: Unit;
  traits: Traits;
  unlocked: boolean;
  isCurrent: boolean;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const bg = !unlocked ? colors.locked : traits === 3 ? colors.gold : color;
  return (
    <Pressable onPress={onPress} style={styles.node}>
      <View style={[styles.circle, { backgroundColor: bg }, isCurrent && { borderColor: colors.text, borderWidth: 3 }]}>
        <Text style={styles.nodeEmoji}>{!unlocked ? '🔒' : traits === 3 ? '👑' : isCurrent ? '▶' : '✓'}</Text>
      </View>
      <View style={styles.nodeLabel}>
        <Text variant="small" numberOfLines={1}>
          {unit.title}
        </Text>
        <Crowns count={traits} size={10} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { gap: space.sm, paddingVertical: space.xs },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.md },
  path: { gap: space.lg, paddingVertical: space.md, alignItems: 'center' },
  nodeRow: { alignItems: 'center' },
  node: { alignItems: 'center', gap: space.xs, width: 200 },
  circle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  nodeEmoji: { fontSize: 24, color: '#fff' },
  nodeLabel: { alignItems: 'center', gap: 2 },
  sheet: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.sm, elevation: 8 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  sheetTitle: { flex: 1 },
});
