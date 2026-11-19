import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CATALOG, WORLD_BY_UNIT, isWorldComplete } from '@/content';
import { useContent } from '@/content/useContent';
import { PATH_TRAITS, allUnitTraits, levelProgress, toDayKey, type Quest, type SessionEndResult } from '@/game';
import { formatDay, useLang, useT, type Key } from '@/i18n';
import { sounds, type SoundName } from '@/lib/sounds';
import { useProgress } from '@/store/progress';
import { Button, Confetti, Crowns, FadeUp, Icon, Pop, ProgressBar, Ring, Screen, Text, radius, space, tint, useColors, useCountUp, type IconName } from '@/ui';

import { exitSession } from './exit';
import type { SessionSpec, SessionState } from './useSession';

type Page = { kind: 'recap' } | { kind: 'skip' } | { kind: 'crown' } | { kind: 'world' };

const QUEST_KEYS: Record<Quest['kind'], Key> = {
  xp: 'quest.xp',
  lessons: 'quest.lessons',
  perfect: 'quest.perfect',
  combo: 'quest.combo',
  cards: 'quest.cards',
  recover: 'quest.recover',
};

/**
 * L'écran de fin : la première page résume la séance ET liste les petits
 * événements (niveau, quêtes, badges, défi du mois, série) ; seuls les vrais
 * moments d'apprentissage ont leur page (couronne, monde, test de sortie).
 * Avant la 1.4, chaque événement avait sa page : une leçon pouvait enchaîner
 * cinq écrans de félicitations, et les récompenses attendues finissent par
 * peser moins qu'un retour sur ce qu'on maîtrise (Deci, Koestner & Ryan 1999).
 */
export function SessionEnd({ state, spec, color }: { state: SessionState; spec: SessionSpec; color: string }) {
  const colors = useColors();
  const t = useT();
  const { EXERCISES, UNIT_BY_ID } = useContent();
  const progress = useProgress((s) => s.progress);
  const r = state.result;
  const perfect = state.mainCount > 0 && state.correctCount === state.mainCount;
  const good = state.correctCount >= state.mainCount * 0.6;
  const crownGained = !!r && spec.mode === 'unit' && r.traitsAfter > r.traitsBefore;
  const world = spec.mode === 'unit' ? WORLD_BY_UNIT.get(spec.unitId) : undefined;

  const worldDone = useMemo(() => {
    if (!r || !world || r.traitsAfter < PATH_TRAITS || r.traitsBefore >= PATH_TRAITS) return false;
    const traits = allUnitTraits(r.progress, EXERCISES, CATALOG, toDayKey(new Date()));
    return isWorldComplete(world, traits, PATH_TRAITS);
  }, [r, world, EXERCISES]);

  const pages = useMemo<Page[]>(() => {
    const out: Page[] = [{ kind: 'recap' }];
    if (!r) return out;
    if (state.skipTest) out.push({ kind: 'skip' });
    if (crownGained || r.newlyUnlockedUnits.length > 0) out.push({ kind: 'crown' });
    if (worldDone) out.push({ kind: 'world' });
    return out;
  }, [r, state.skipTest, crownGained, worldDone]);

  const [index, setIndex] = useState(0);
  const page = pages[index];

  useEffect(() => {
    const sound: SoundName | null =
      page.kind === 'recap' ? (perfect ? 'perfect' : r?.levelUp.crossed ? 'levelup' : r?.goalReached ? 'goal' : null)
      : page.kind === 'crown' || page.kind === 'world' ? 'crown'
      : null;
    if (sound) {
      const timer = setTimeout(() => sounds.play(sound), 200);
      return () => clearTimeout(timer);
    }
  }, [page, perfect, r]);

  const last = index === pages.length - 1;
  const footer = <Button label={t('common.continue')} color={color} onPress={() => (last ? exitSession() : setIndex(index + 1))} />;

  return (
    <Screen footer={footer}>
      {(page.kind === 'recap' && (perfect || r?.levelUp.crossed || r?.monthlyCompleted)) || page.kind === 'world' ? <Confetti /> : null}
      {page.kind === 'recap' && (
        <Recap state={state} color={color} perfect={perfect} good={good} />
      )}
      {page.kind === 'recap' && r && <Extras result={r} streak={progress.streak.current} />}
      {page.kind === 'skip' && state.skipTest && (
        <Moment
          key="skip"
          icon={state.skipTest.passed ? 'rocket' : 'refresh'}
          color={state.skipTest.passed ? colors.success : colors.danger}
          title={state.skipTest.passed ? t('end.skip.passed') : t('end.skip.failed')}
          body={
            state.skipTest.passed
              ? state.skipTest.validatedUnits.length > 0
                ? t('end.skip.validated', { units: state.skipTest.validatedUnits.map((id) => UNIT_BY_ID.get(id)?.title ?? id).join(', ') })
                : t('end.skip.nothing')
              : t('end.skip.failedBody')
          }
        />
      )}
      {page.kind === 'crown' && r && (
        <Moment
          key="crown"
          emoji="👑"
          color={colors.gold}
          title={
            crownGained
              ? t('end.crown.title')
              : r.newlyUnlockedUnits.length > 1
                ? t('end.unlocked.list', { count: r.newlyUnlockedUnits.length })
                : t('end.unlocked.title')
          }
          body={crownGained ? (r.traitsAfter >= 5 ? t('end.crown.body5') : r.traitsAfter >= PATH_TRAITS ? t('end.crown.body3') : t('end.crown.body1')) : ''}>
          {crownGained && spec.mode === 'unit' && UNIT_BY_ID.get(spec.unitId) && (
            <Text variant="bodyBold" style={styles.center}>
              {t('end.mastered', { description: UNIT_BY_ID.get(spec.unitId)?.description ?? '' })}
            </Text>
          )}
          {crownGained && (
            <Pop delay={300}>
              <Crowns count={r.traitsAfter} size={30} />
            </Pop>
          )}
          {r.newlyUnlockedUnits.length > 0 && (
            <View style={[styles.list, { backgroundColor: colors.surfaceAlt }]}>
              {crownGained && (
                <Text variant="small" secondary>
                  {t('end.unlocked.list', { count: r.newlyUnlockedUnits.length })}
                </Text>
              )}
              {r.newlyUnlockedUnits.map((id) => (
                <View key={id} style={styles.listRow}>
                  <Icon name="lock-open" size={16} color={color} />
                  <Text variant="bodyBold">{UNIT_BY_ID.get(id)?.title ?? id}</Text>
                </View>
              ))}
            </View>
          )}
        </Moment>
      )}
      {page.kind === 'world' && world && (
        <Moment key="world" emoji={world.emoji} color={world.color} title={t('end.world.title')} body={t('end.world.body', { world: world.title })} />
      )}
      {state.adShown && page.kind === 'recap' && (
        <Text variant="small" secondary style={styles.center}>
          {t('end.ad')}
        </Text>
      )}
    </Screen>
  );
}

function Recap({ state, color, perfect, good }: { state: SessionState; color: string; perfect: boolean; good: boolean }) {
  const colors = useColors();
  const t = useT();
  const progress = useProgress((s) => s.progress);
  const r = state.result;
  const level = levelProgress(progress.xp);
  const totalXp = r ? r.progress.xp - state.xpAtStart : 0;
  const shownXp = useCountUp(Math.max(0, totalXp), 900, 300);
  const accuracy = state.mainCount > 0 ? Math.round((state.correctCount / state.mainCount) * 100) : 0;
  return (
    <View style={styles.page}>
      <Pop>
        <Text style={styles.big}>{perfect ? '🏆' : good ? '🎉' : '💪'}</Text>
      </Pop>
      <FadeUp delay={100}>
        <Text variant="title" style={styles.center}>
          {perfect ? t('end.perfect') : good ? t('end.good') : t('end.ok')}
        </Text>
      </FadeUp>
      <FadeUp delay={220} style={styles.tiles}>
        <Tile color={color} icon="sparkles" label={t('end.tile.xp')} value={`+${shownXp}`} />
        <Tile color={accuracy === 100 ? colors.success : colors.gem} icon="locate" label={t('end.tile.accuracy')} value={t('common.percent', { value: accuracy })} />
        {r && r.gemsGained > 0 ? (
          <Tile color={colors.gem} icon="diamond" label={t('end.tile.gems')} value={`+${r.gemsGained}`} />
        ) : (
          <Tile color={colors.streak} icon="flame" label={t('end.tile.combo')} value={`×${state.bestCombo}`} />
        )}
      </FadeUp>
      {r && (
        <FadeUp delay={360} style={styles.fullWidth}>
          <View style={[styles.goalRow, { backgroundColor: colors.surface, borderColor: r.goalReached ? colors.success : colors.border }]}>
            <Ring ratio={r.dailyRatio} size={56} color={r.dailyRatio >= 1 ? colors.success : color}>
              {r.dailyRatio >= 1 ? <Icon name="checkmark" size={22} color={colors.success} /> : <Text variant="small">{t('common.percent', { value: Math.round(r.dailyRatio * 100) })}</Text>}
            </Ring>
            <View style={styles.grow}>
              <Text variant="bodyBold">{r.dailyRatio >= 1 ? t('end.goal.reached') : t('end.goal.progress')}</Text>
              <Text variant="small" secondary>
                {t('end.goal.detail', { xp: Math.min(r.progress.daily.xp, r.progress.daily.goal), goal: r.progress.daily.goal })}
                {r.goalReached ? ` · ${t('end.goal.bonus')}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.levelBox}>
            <ProgressBar ratio={level.ratio} color={color} />
            <Text variant="small" secondary>
              {t('end.levelLine', { level: level.level, toNext: level.xpToNextLevel })}
              {r.energyRefunded > 0 ? ` · ${t('end.energyRefund', { count: r.energyRefunded })}` : ''}
            </Text>
          </View>
        </FadeUp>
      )}
    </View>
  );
}

/** Les petits événements de la séance, en une liste sous le résumé. */
function Extras({ result: r, streak }: { result: SessionEndResult; streak: number }) {
  const colors = useColors();
  const t = useT();
  const lang = useLang();
  const rows: { key: string; icon: IconName; color: string; text: string; gems?: number }[] = [];
  if (r.levelUp.crossed) rows.push({ key: 'level', icon: 'arrow-up-circle', color: colors.primary, text: t('end.levelUp.title', { level: r.levelUp.to }) });
  for (const q of r.questsCompleted) rows.push({ key: `q-${q.id}`, icon: 'flag', color: colors.success, text: `${t('end.quest.title')}: ${t(QUEST_KEYS[q.kind], { n: q.target })}`, gems: q.reward });
  for (const id of r.newBadges) rows.push({ key: `b-${id}`, icon: 'medal', color: colors.gold, text: `${t('end.badge.title')}: ${t(`badge.${id}` as Key)}` });
  if (r.monthlyCompleted) rows.push({ key: 'monthly', icon: 'medal', color: colors.gold, text: t('monthly.end.title') });
  if (r.streakIncremented || r.freezeConsumedFor)
    rows.push({
      key: 'streak',
      icon: 'flame',
      color: colors.streak,
      text: r.freezeConsumedFor ? `${t('end.streak.title', { count: streak })} · ${t('end.streak.freeze', { day: formatDay(r.freezeConsumedFor, lang) })}` : t('end.streak.title', { count: streak }),
    });
  if (rows.length === 0) return null;
  return (
    <FadeUp delay={480} style={styles.fullWidth}>
      <View style={[styles.list, { backgroundColor: colors.surfaceAlt }]}>
        <Text variant="small" secondary style={styles.label}>
          {t('end.also')}
        </Text>
        {rows.map((row) => (
          <View key={row.key} style={styles.listRow}>
            <Icon name={row.icon} size={18} color={row.color} />
            <Text variant="small" style={styles.grow}>
              {row.text}
            </Text>
            {row.gems !== undefined && (
              <>
                <Icon name="diamond" size={14} color={colors.gem} />
                <Text variant="small" style={{ color: colors.gem }}>
                  {row.gems}
                </Text>
              </>
            )}
          </View>
        ))}
      </View>
    </FadeUp>
  );
}

function Tile({ color, icon, label, value }: { color: string; icon: IconName; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tile, { borderColor: color, backgroundColor: colors.surface }]}>
      <View style={[styles.tileHead, { backgroundColor: color }]}>
        <Icon name={icon} size={14} color="#fff" />
        <Text variant="small" style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text variant="h2" style={[styles.center, { color }]}>
        {value}
      </Text>
    </View>
  );
}

/** Une page « moment » : grande icône ou emoji, titre, texte, contenu libre. */
function Moment({ icon, emoji, color, title, body, children }: { icon?: IconName; emoji?: string; color: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <View style={styles.page}>
      <Pop>
        <View style={[styles.halo, { backgroundColor: tint(color, 0.82) }]}>
          {emoji ? <Text style={styles.big}>{emoji}</Text> : icon ? <Icon name={icon} size={64} color={color} /> : null}
        </View>
      </Pop>
      <FadeUp delay={120} style={styles.fullWidth}>
        <Text variant="title" style={styles.center}>
          {title}
        </Text>
        {body !== '' && (
          <Text variant="body" secondary style={styles.center}>
            {body}
          </Text>
        )}
      </FadeUp>
      <FadeUp delay={240} style={styles.fullWidth}>
        {children}
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingVertical: space.xl },
  big: { fontSize: 64, lineHeight: 76, textAlign: 'center' },
  halo: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  fullWidth: { width: '100%', gap: space.md, alignItems: 'center' },
  tiles: { flexDirection: 'row', gap: space.sm, width: '100%' },
  tile: { flex: 1, borderWidth: 2, borderRadius: radius.md, overflow: 'hidden', paddingBottom: space.md, gap: space.sm },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
  tileLabel: { color: '#fff', fontSize: 11 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 2, borderRadius: radius.lg, padding: space.md, width: '100%' },
  levelBox: { width: '100%', gap: space.xs },
  grow: { flex: 1 },
  list: { width: '100%', borderRadius: radius.md, padding: space.md, gap: space.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { fontWeight: '800', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 },
});
