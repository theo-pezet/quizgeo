import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { Card as DeckCard } from '@/content';
import { resolveUnitCards } from '@/content/generate';
import { useContent } from '@/content/useContent';
import { useActiveSubjects } from '@/content/useSubjects';
import { deckStats, toDayKey } from '@/game';
import { formatDay, useLang, useT } from '@/i18n';
import { useProgress } from '@/store/progress';
import { Button, Card, Screen, Text, fonts, radius, shade, space, useColors } from '@/ui';

export default function DeckScreen() {
  const colors = useColors();
  const t = useT();
  const { CARDS: ALL_CARDS, UNITS, cardIdsOf } = useContent();
  const SUBJECTS = useActiveSubjects();
  // Le deck ne montre que les matières choisies.
  const CARDS = useMemo(() => {
    const ids = new Set(SUBJECTS.map((s) => s.id));
    return ALL_CARDS.filter((c) => ids.has(c.subject));
  }, [ALL_CARDS, SUBJECTS]);
  const progress = useProgress((s) => s.progress);
  const tick = useProgress((s) => s.tick);
  useFocusEffect(useCallback(() => tick(), [tick]));
  const [subjectId, setSubjectId] = useState<string | null>(null);
  // Une matière décochée dans le Profil ne doit pas rester comme filtre fantôme.
  useEffect(() => {
    if (subjectId && !SUBJECTS.some((s) => s.id === subjectId)) setSubjectId(null);
  }, [SUBJECTS, subjectId]);
  // Chaque carte affiche l'unité qui l'enseigne (sinon sa matière), jamais un identifiant technique.
  const unitTitleOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of UNITS) for (const card of resolveUnitCards(unit, ALL_CARDS)) if (!map.has(card.id)) map.set(card.id, unit.title);
    return map;
  }, [UNITS, ALL_CARDS]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const today = toDayKey(new Date());

  const ids = useMemo(() => (subjectId ? cardIdsOf(subjectId) : CARDS.map((c) => c.id)), [subjectId, cardIdsOf, CARDS]);
  const stats = useMemo(() => deckStats(progress.cards, ids, today), [progress.cards, ids, today]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CARDS.filter((c) => (!subjectId || c.subject === subjectId) && (q === '' || c.term.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q)));
  }, [query, subjectId, CARDS]);

  const header = (
    <View style={styles.header}>
      <Text variant="title">{t('deck.title')}</Text>
      <Text variant="small" secondary>
        {t('deck.blurb', { count: CARDS.length })}
      </Text>
      <View style={styles.chips}>
        <Chip label={t('deck.all')} active={subjectId === null} onPress={() => setSubjectId(null)} />
        {SUBJECTS.map((s) => (
          <Chip key={s.id} label={`${s.emoji} ${s.title}`} active={subjectId === s.id} color={s.color} onPress={() => setSubjectId(s.id)} />
        ))}
      </View>
      <Card>
        <View style={styles.statsRow}>
          <Stat label={t('deck.due')} value={stats.dueToday} color={colors.danger} />
          <Stat label={t('deck.learning')} value={stats.learning} color={colors.primary} />
          <Stat label={t('deck.known')} value={stats.review} color={colors.success} />
          <Stat label={t('deck.new')} value={stats.new} color={colors.textSecondary} />
        </View>
        <Button
          label={stats.dueToday > 0 ? t('deck.reviewDue', { count: stats.dueToday }) : t('deck.learnNew')}
          onPress={() => router.push({ pathname: '/deck/review', params: subjectId ? { subjectId } : {} })}
        />
      </Card>
      <TextInput
        placeholder={t('deck.search')}
        placeholderTextColor={colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
      />
    </View>
  );

  return (
    <Screen scroll={false} style={styles.noPad}>
      {/* En position absolue : sur le web, la colonne ne prend alors pas la hauteur de la liste et la liste défile bien d'elle-même. */}
      <FlatList
        style={StyleSheet.absoluteFill}
        data={filtered}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        initialNumToRender={20}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text variant="body" secondary style={styles.empty}>
            {t('deck.noResult')}
          </Text>
        }
        renderItem={({ item }) => <Row card={item} unitTitle={unitTitleOf.get(item.id)} open={open === item.id} onPress={() => setOpen(open === item.id ? null : item.id)} />}
      />
    </Screen>
  );
}

function Row({ card, unitTitle, open, onPress }: { card: DeckCard; unitTitle?: string; open: boolean; onPress: () => void }) {
  const colors = useColors();
  const t = useT();
  const lang = useLang();
  const { SUBJECTS } = useContent();
  const progress = useProgress((s) => s.progress.cards[card.id]);
  const subject = SUBJECTS.find((s) => s.id === card.subject);
  return (
    <Pressable onPress={onPress} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.rowHead}>
        <Text variant="bodyBold">{card.term}</Text>
        <Text variant="small" secondary>
          {subject?.emoji} {unitTitle ?? subject?.title}
        </Text>
      </View>
      {open && (
        <View style={styles.rowBody}>
          <Text variant="small">{card.definition}</Text>
          {card.example ? (
            <Text variant="small" secondary>
              {t('common.example', { text: card.example })}
            </Text>
          ) : null}
          <Text variant="small" secondary>
            {progress === undefined || progress.phase === 'new'
              ? t('deck.never')
              : t('deck.state.detail', { state: progress.phase === 'learning' ? t('deck.state.learning') : t('deck.state.known'), due: progress.due ? formatDay(progress.due, lang, { day: 'numeric', month: 'long' }) : '', count: progress.reps })}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function Chip({ label, active, color, onPress }: { label: string; active: boolean; color?: string; onPress: () => void }) {
  const colors = useColors();
  const tintColor = color ?? colors.primary;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} hitSlop={4} style={[styles.chip, { backgroundColor: active ? tintColor : colors.surface, borderColor: active ? shade(tintColor) : colors.border, borderBottomWidth: active ? 4 : 2 }]}>
      <Text variant="small" style={{ color: active ? '#fff' : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="h2" style={{ color }}>
        {value}
      </Text>
      <Text variant="small" secondary>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noPad: { padding: 0, gap: 0 },
  list: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl },
  header: { gap: space.md, marginBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: space.md, minHeight: 44, justifyContent: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  input: { borderWidth: 2, borderRadius: radius.md, padding: space.md, fontSize: 16, fontFamily: fonts.regular },
  row: { borderWidth: 2, borderRadius: radius.md, padding: space.md, gap: space.sm },
  rowHead: { gap: 2 },
  empty: { textAlign: 'center', paddingVertical: space.xl },
  rowBody: { gap: space.xs },
});
