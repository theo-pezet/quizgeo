import { Redirect, router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';

import { CATALOG, isWorldComplete, worldProgress, worldsOf, type Unit, type World } from '@/content';
import { useContent } from '@/content/useContent';
import { useActiveSubjects } from '@/content/useSubjects';
import {
  displayedStreak,
  PATH_TRAITS,
  allUnitTraits,
  applyUnlockAnimationPlayed,
  canStartLesson,
  currentUnit,
  dailyRatio,
  isActiveToday,
  isGoalMet,
  isUnitUnlocked,
  levelProgress,
  reviewQueueSize,
  toDayKey,
  type Traits,
} from '@/game';
import { useLang, useT } from '@/i18n';
import { useProgress, useSettings } from '@/store/progress';
import { Button, Card, Crowns, EnergyBadge, Icon, MonthlyCard, NoEnergySheet, Pop, Pulse, QuestsCard, Ring, Screen, Stat, Text, Tutorial, ink, palette, radius, shade, space, tint, useColors, useIsDark, type IconName } from '@/ui';

export default function PathScreen() {
  const colors = useColors();
  const t = useT();
  const lang = useLang();
  const { UNITS, EXERCISES, UNIT_BY_ID, EXERCISE_BY_KEY } = useContent();
  const SUBJECTS = useActiveSubjects();
  const progress = useProgress((s) => s.progress);
  const setProgress = useProgress((s) => s.setProgress);
  const tick = useProgress((s) => s.tick);
  useFocusEffect(useCallback(() => tick(), [tick]));
  const focused = useIsFocused();
  const progressHydrated = useProgress((s) => s.hydrated);
  const settingsHydrated = useSettings((s) => s.hydrated);
  const onboardingDone = useSettings((s) => s.onboardingDone);
  const favorite = useSettings((s) => s.favoriteSubject);
  const tutorialDone = useSettings((s) => s.tutorialDone);
  const setTutorialDone = useSettings((s) => s.setTutorialDone);
  const setFavoriteSubject = useSettings((s) => s.setFavoriteSubject);
  const [subjectId, setSubjectId] = useState(favorite ?? SUBJECTS[0].id);
  useEffect(() => {
    if (favorite) setSubjectId(favorite);
  }, [favorite]);
  const activeIds = SUBJECTS.map((s) => s.id).join(',');
  useEffect(() => {
    // La matière affichée doit rester parmi celles que l'utilisateur a choisies.
    if (!SUBJECTS.some((s) => s.id === subjectId)) setSubjectId(SUBJECTS[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIds]);
  const [picked, setPicked] = useState<Unit | null>(null);
  const [noEnergy, setNoEnergy] = useState(false);

  const now = new Date();
  const today = toDayKey(now);
  // Couronnes du jour (fissures comprises) et couronnes « pleines », pour montrer ce qui s'est perdu.
  const traits = useMemo(() => allUnitTraits(progress, EXERCISES, CATALOG, today), [progress, EXERCISES, today]);
  const traitsFull = useMemo(() => allUnitTraits(progress, EXERCISES, CATALOG), [progress, EXERCISES]);
  const subject = SUBJECTS.find((s) => s.id === subjectId) ?? SUBJECTS[0];
  // Un monde sans unité (contenu pas encore livré) n'est pas affiché.
  const worlds = worldsOf(subject.id).filter((w) => w.unitIds.some((id) => UNIT_BY_ID.has(id)));
  const current = currentUnit(subject.id, traits, CATALOG);
  const level = levelProgress(progress.xp);
  const queue = reviewQueueSize(progress, EXERCISE_BY_KEY);
  const flame = isActiveToday(progress.streak, today);
  const goalRatio = dailyRatio(progress.daily, today);
  const goalMet = isGoalMet(progress.daily, today);

  // Animation de déverrouillage : une fois par unité, quand le parcours
  // redevient visible (retour de leçon, changement de matière), une fois la
  // progression lue sur le disque. Le Pop se joue puis le nœud redevient normal.
  const [justUnlocked, setJustUnlocked] = useState<Set<string>>(new Set());
  useFocusEffect(
    useCallback(() => {
      if (!progressHydrated) return;
      const p = useProgress.getState().progress;
      const tr = allUnitTraits(p, EXERCISES, CATALOG, toDayKey(new Date()));
      const units = UNITS.filter((u) => u.subjectId === subject.id);
      const fresh = units.filter((u, i) => i > 0 && isUnitUnlocked(u.id, tr, CATALOG) && !p.units[u.id]?.unlockAnimationPlayed);
      if (fresh.length === 0) return;
      setJustUnlocked(new Set(fresh.map((u) => u.id)));
      let next = p;
      for (const u of fresh) next = applyUnlockAnimationPlayed(next, u.id);
      setProgress(next);
    }, [progressHydrated, subject.id, UNITS, EXERCISES, setProgress]),
  );
  useEffect(() => {
    if (justUnlocked.size === 0) return;
    const id = setTimeout(() => setJustUnlocked(new Set()), 1500);
    return () => clearTimeout(id);
  }, [justUnlocked]);

  // Défilement automatique jusqu'à l'unité en cours : à l'ouverture, au
  // changement de matière et quand l'unité en cours change (retour de leçon).
  // Positions : parcours dans le contenu, monde dans le parcours, nœud dans le monde.
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const layout = useRef({ path: -1, worlds: new Map<string, number>(), rows: new Map<string, number>() });
  const pendingScroll = useRef(true);
  const scrolledOnce = useRef(false);
  const currentWorldId = current ? worlds.find((w) => w.unitIds.includes(current))?.id : undefined;
  const maybeScroll = useCallback(() => {
    if (!pendingScroll.current || !current || !currentWorldId) return;
    const { path, worlds: ws, rows } = layout.current;
    const wy = ws.get(currentWorldId);
    const ry = rows.get(current);
    if (path < 0 || wy === undefined || ry === undefined) return;
    pendingScroll.current = false;
    scrollRef.current?.scrollTo({ y: Math.max(0, path + wy + ry - screenHeight * 0.3), animated: scrolledOnce.current });
    scrolledOnce.current = true;
  }, [current, currentWorldId, screenHeight]);
  useEffect(() => {
    pendingScroll.current = true;
    maybeScroll();
  }, [subject.id, current, progressHydrated, maybeScroll]);
  const onPathLayout = (e: LayoutChangeEvent) => {
    layout.current.path = e.nativeEvent.layout.y;
    maybeScroll();
  };

  if (settingsHydrated && !onboardingDone) return <Redirect href="/onboarding" />;
  // Tant que les réglages ne sont pas lus, on ne sait pas s'il faut l'intro : rien plutôt qu'un flash.
  if (!settingsHydrated) return null;

  const startUnit = (unit: Unit, skipTest = false) => {
    if (!canStartLesson(progress.energy, new Date())) {
      setPicked(null);
      setNoEnergy(true);
      return;
    }
    setPicked(null);
    router.push({ pathname: '/session/[unitId]', params: skipTest ? { unitId: unit.id, skip: '1' } : { unitId: unit.id } });
  };

  const pickedWorld = picked ? worlds.find((w) => w.unitIds.includes(picked.id)) : undefined;
  const pickedTraits = picked ? (traits[picked.id] ?? 0) : 0;
  const showTutorial = onboardingDone && !tutorialDone;
  // Les panneaux vont dans la couche superposée, ancrée en bas de l'écran,
  // jamais dans le contenu qui défile (sinon ils s'ouvrent hors de vue).
  // Bouton retour Android : ferme d'abord la feuille ouverte au lieu de quitter l'app.
  useEffect(() => {
    if (!picked && !noEnergy) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPicked(null);
      setNoEnergy(false);
      return true;
    });
    return () => sub.remove();
  }, [picked, noEnergy]);

  const overlay = noEnergy ? <NoEnergySheet onClose={() => setNoEnergy(false)} /> : picked && !showTutorial ? sheet(picked) : null;

  function sheet(picked: Unit) {
    return (
    <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: pickedWorld?.color ?? colors.border }]}>
      <View style={styles.sheetHead}>
        <Text variant="h2" style={styles.sheetTitle}>
          {picked.title}
        </Text>
        <Crowns count={pickedTraits} cracked={Math.max(0, (traitsFull[picked.id] ?? 0) - pickedTraits)} size={16} />
      </View>
      <Text variant="small" secondary>
        {picked.description}
      </Text>
      {(traitsFull[picked.id] ?? 0) > pickedTraits && (
        <Text variant="small" style={{ color: colors.danger }}>
          {t('path.unit.cracked')}
        </Text>
      )}
      {isUnitUnlocked(picked.id, traits, CATALOG) ? (
        <Button
          label={`${
            pickedTraits === 0
              ? t('path.unit.start')
              : pickedTraits >= 5
                ? t('path.unit.legendary')
                : pickedTraits >= PATH_TRAITS
                  ? t('path.unit.nextCrown', { n: pickedTraits + 1 })
                  : t('path.unit.continue')
          } · ${t('path.unit.energyCost')}`}
          color={pickedWorld?.color ?? subject.color}
          onPress={() => startUnit(picked)}
        />
      ) : (
        <>
          <Text variant="small" style={{ color: colors.danger }}>
            {t('path.unit.locked')}
          </Text>
          <Button label={`${t('path.unit.skipButton')} · ${t('path.unit.energyCost')}`} tone="secondary" onPress={() => startUnit(picked, true)} />
          <Text variant="small" secondary>
            {t('path.unit.skipHint')}
          </Text>
        </>
      )}
      <Button label={t('common.close')} tone="ghost" onPress={() => setPicked(null)} />
    </View>
    );
  }

  return (
    <Screen scroll={false} style={styles.noPad} overlay={overlay}>
      <ScrollView ref={scrollRef} style={StyleSheet.absoluteFill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.stats}>
          <Stat icon={flame ? 'flame' : 'flame-outline'} color={flame ? colors.streak : colors.textSecondary} value={displayedStreak(progress.streak, today)} />
          <EnergyBadge energy={progress.energy} now={now} compact />
          <Stat icon="diamond" color={colors.gem} value={progress.gems} />
          <Stat icon="star" color={colors.gold} value={level.level} />
        </View>
        <View style={[styles.goalRow, { backgroundColor: colors.surface, borderColor: goalMet ? colors.success : colors.border }]}>
          <Ring ratio={goalRatio} size={56} color={goalMet ? colors.success : subject.color}>
            {goalMet ? <Icon name="checkmark" size={22} color={colors.success} /> : <Text variant="small">{t('common.percent', { value: Math.round(goalRatio * 100) })}</Text>}
          </Ring>
          <View style={styles.goalText}>
            <Text variant="bodyBold">{goalMet ? t('path.goal.done') : t('path.goal.title')}</Text>
            <Text variant="small" secondary>
              {t('path.goal.detail', { xp: Math.min(progress.daily.xp, progress.daily.goal), goal: progress.daily.goal, level: level.level, toNext: level.xpToNextLevel })}
            </Text>
          </View>
        </View>
      </View>

      {progress.quests.items.length > 0 && <QuestsCard quests={progress.quests.items} />}
      <MonthlyCard monthly={progress.monthly} month={today.slice(0, 7)} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {SUBJECTS.map((s) => {
          const active = s.id === subject.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setSubjectId(s.id);
                // Retenue pour le prochain démarrage.
                setFavoriteSubject(s.id);
                setPicked(null);
                setNoEnergy(false);
              }}
              style={[styles.chip, { backgroundColor: active ? s.color : colors.surface, borderColor: active ? shade(s.color) : colors.border, borderBottomWidth: active ? 4 : 2 }]}>
              <Text variant="small" style={{ color: active ? '#fff' : colors.text }}>
                {s.emoji} {s.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {queue > 0 && (
        <Card color={colors.primary}>
          <View style={styles.reviewHead}>
            <Icon name="refresh-circle" size={22} color={colors.primary} />
            <Text variant="bodyBold">{t('path.review.title', { count: queue })}</Text>
          </View>
          <Text variant="small" secondary>
            {t('path.review.body')}
          </Text>
          <Button label={t('path.review.button')} tone="secondary" onPress={() => router.push('/session/review')} />
        </Card>
      )}

      <View style={styles.path} onLayout={onPathLayout}>
        {worlds.length === 0 && (
          <Card>
            <Text variant="body" secondary>
              {t('path.empty')}
            </Text>
          </Card>
        )}
        {worlds.map((world, wi) => {
          const done = worldProgress(world, traits, PATH_TRAITS);
          const complete = isWorldComplete(world, traits, PATH_TRAITS);
          const firstUnit = world.unitIds[0];
          const open = isUnitUnlocked(firstUnit, traits, CATALOG);
          const total = world.unitIds.length;
          return (
            <View
              key={world.id}
              style={styles.world}
              onLayout={(e) => {
                layout.current.worlds.set(world.id, e.nativeEvent.layout.y);
                maybeScroll();
              }}>
              <WorldBanner world={world} title={world.title[lang]} subtitle={world.subtitle[lang]} done={done} complete={complete} open={open} label={t('path.world.label', { index: world.index })} progressLabel={t('path.world.progress', { done, total, count: total })} lockedLabel={t('path.world.locked')} completeLabel={t('path.world.complete')} />
              {world.unitIds.map((unitId, i) => {
                const unit = UNIT_BY_ID.get(unitId);
                if (!unit) return null;
                const tr = traits[unit.id] ?? 0;
                const cracked = Math.max(0, (traitsFull[unit.id] ?? 0) - tr);
                const unlocked = isUnitUnlocked(unit.id, traits, CATALOG);
                const isCurrent = unit.id === current;
                const offset = Math.round(Math.sin((wi * 7 + i) * 1.1) * 56);
                return (
                  <View
                    key={unit.id}
                    style={[styles.nodeRow, { transform: [{ translateX: offset }] }]}
                    onLayout={(e) => {
                      layout.current.rows.set(unit.id, e.nativeEvent.layout.y);
                      if (isCurrent) maybeScroll();
                    }}>
                    <PathNode
                      unit={unit}
                      traits={tr}
                      cracked={cracked}
                      unlocked={unlocked}
                      isCurrent={isCurrent}
                      justUnlocked={justUnlocked.has(unit.id)}
                      animate={focused}
                      color={world.color}
                      hint={isCurrent ? (tr === 0 ? t('path.unit.start') : t('path.unit.continue')) : null}
                      onPress={() => setPicked(unit)}
                    />
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
      </ScrollView>
      {showTutorial && <Tutorial onDone={() => setTutorialDone(true)} />}
    </Screen>
  );
}

function WorldBanner({ world, title, subtitle, done, complete, open, label, progressLabel, lockedLabel, completeLabel }: { world: World; title: string; subtitle: string; done: number; complete: boolean; open: boolean; label: string; progressLabel: string; lockedLabel: string; completeLabel: string }) {
  const colors = useColors();
  // Monde ouvert : sa couleur, texte blanc. Monde fermé : surface neutre et
  // texte du thème (le blanc sur beige était illisible en clair).
  const bg = open ? world.color : colors.surfaceAlt;
  const fg = open ? '#FFFFFF' : colors.text;
  const fgSoft = open ? 'rgba(255,255,255,0.92)' : colors.textSecondary;
  return (
    <View style={[styles.banner, open ? { backgroundColor: bg, borderBottomColor: shade(bg) } : { backgroundColor: bg, borderColor: colors.border, borderWidth: 2, borderBottomWidth: 6, borderBottomColor: colors.borderStrong }]}>
      <View style={styles.bannerText}>
        <Text variant="small" style={[styles.bannerLabel, { color: fgSoft }]}>
          {label.toUpperCase()} · {complete ? completeLabel.toUpperCase() : progressLabel}
        </Text>
        <Text variant="h2" style={{ color: fg }}>
          {title}
        </Text>
        <Text variant="small" style={{ color: fgSoft }}>
          {open ? subtitle : lockedLabel}
        </Text>
      </View>
      <View style={[styles.bannerEmblem, { backgroundColor: open ? tint(bg, 0.25) : colors.border }]}>
        {open ? <Text style={styles.bannerEmoji}>{world.emoji}</Text> : <Icon name="lock-closed" size={28} color={colors.textSecondary} />}
        {complete && (
          <View style={[styles.bannerCheck, { backgroundColor: colors.success }]}>
            <Icon name="checkmark" size={14} color="#fff" />
          </View>
        )}
      </View>
    </View>
  );
}

function PathNode({
  unit,
  traits,
  cracked,
  unlocked,
  isCurrent,
  justUnlocked,
  animate,
  color,
  hint,
  onPress,
}: {
  unit: Unit;
  traits: Traits;
  cracked: number;
  unlocked: boolean;
  isCurrent: boolean;
  justUnlocked: boolean;
  /** Faux quand le parcours n'est pas visible : la pulsation s'arrête. */
  animate: boolean;
  color: string;
  hint: string | null;
  onPress: () => void;
}) {
  const colors = useColors();
  const dark = useIsDark();
  const bg = !unlocked ? colors.locked : traits >= 5 ? colors.gold : color;
  // Cadenas en gris du thème sur le fond verrouillé, encre sombre sur l'or : lisibles.
  const iconColor = !unlocked ? colors.textSecondary : traits >= 5 ? palette.light.text : '#FFFFFF';
  const icon: IconName = !unlocked ? 'lock-closed' : cracked > 0 ? 'heart-dislike' : traits >= 5 ? 'trophy' : isCurrent ? 'play' : traits >= PATH_TRAITS ? 'checkmark' : 'star';
  const circle = (
    <View style={[styles.circle, { backgroundColor: bg, borderBottomColor: shade(bg, 0.3) }, isCurrent && { borderColor: colors.text, borderWidth: 3, borderBottomWidth: 8 }]}>
      <Icon name={icon} size={28} color={iconColor} />
    </View>
  );
  return (
    <Pressable onPress={onPress} style={styles.node} accessibilityRole="button" accessibilityLabel={unit.title}>
      {hint && (
        <View style={[styles.hint, { backgroundColor: colors.surface, borderColor: color }]}>
          <Text variant="small" style={{ color: ink(color, dark) }}>
            {hint.toUpperCase()}
          </Text>
        </View>
      )}
      {justUnlocked ? <Pop>{circle}</Pop> : <Pulse active={isCurrent && animate}>{circle}</Pulse>}
      <View style={styles.nodeLabel}>
        <Text variant="small" numberOfLines={2} secondary={!unlocked} style={styles.nodeTitle}>
          {unit.title}
        </Text>
        <Crowns count={traits} cracked={cracked} size={11} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  noPad: { padding: 0, gap: 0 },
  content: { padding: space.lg, gap: space.lg },
  header: { gap: space.md },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 2, borderRadius: radius.lg, padding: space.sm, paddingRight: space.md },
  goalText: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { gap: space.sm, paddingVertical: space.xs },
  chip: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.md, minHeight: 44, justifyContent: 'center' },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  path: { gap: space.xl, paddingBottom: 240 },
  world: { gap: space.lg, alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, width: '100%', borderRadius: radius.lg, padding: space.lg, borderBottomWidth: 6 },
  bannerText: { flex: 1, gap: 2 },
  bannerLabel: { letterSpacing: 0.6, fontSize: 12 },
  bannerEmblem: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  bannerEmoji: { fontSize: 32, lineHeight: 40 },
  bannerCheck: { position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  nodeRow: { alignItems: 'center' },
  node: { alignItems: 'center', gap: space.xs, width: 200 },
  hint: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: space.md, marginBottom: 2 },
  circle: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 7 },
  nodeLabel: { alignItems: 'center', gap: 2, width: '100%' },
  nodeTitle: { textAlign: 'center' },
  sheet: { borderRadius: radius.lg, borderWidth: 2, padding: space.lg, gap: space.sm, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  sheetTitle: { flex: 1 },
});
