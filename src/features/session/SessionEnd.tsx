import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CATALOG, WORLD_BY_UNIT, isWorldComplete } from '@/content';
import { useContent } from '@/content/useContent';
import { MONTHLY_TARGET, PATH_TRAITS, allUnitTraits, levelProgress, toDayKey, type Quest } from '@/game';
import { monthLabel, useLang, useT, type Key } from '@/i18n';
import { sounds, type SoundName } from '@/lib/sounds';
import { useProgress } from '@/store/progress';
import { Button, Confetti, Crowns, FadeUp, Icon, Pop, ProgressBar, Ring, Screen, Text, radius, space, tint, useColors, useCountUp, type IconName } from '@/ui';

import type { SessionSpec, SessionState } from './useSession';

type Page =
  | { kind: 'recap' }
  | { kind: 'skip' }
  | { kind: 'levelUp' }
  | { kind: 'crown' }
  | { kind: 'world' }
  | { kind: 'quest'; quests: Quest[] }
  | { kind: 'badge' }
  | { kind: 'monthly' }
  | { kind: 'streak' };

const QUEST_KEYS: Record<Quest['kind'], Key> = {
  xp: 'quest.xp',
  lessons: 'quest.lessons',
  perfect: 'quest.perfect',
  combo: 'quest.combo',
  cards: 'quest.cards',
  recover: 'quest.recover',
};

/**
 * L'écran de fin : une page par événement, chacune tenant dans l'écran, avec
 * un seul bouton fixe en bas. La première page résume ; les suivantes
 * n'existent que s'il s'est passé quelque chose (niveau, couronne, monde,
 * quête, badge, série).
 */
export function SessionEnd({ state, spec, color }: { state: SessionState; spec: SessionSpec; color: string }) {
  const colors = useColors();
  const t = useT();
  const lang = useLang();
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
    if (r.levelUp.crossed) out.push({ kind: 'levelUp' });
    if (crownGained || r.newlyUnlockedUnits.length > 0) out.push({ kind: 'crown' });
    if (worldDone) out.push({ kind: 'world' });
    if (r.questsCompleted.length > 0) out.push({ kind: 'quest', quests: r.questsCompleted });
    if (r.newBadges.length > 0) out.push({ kind: 'badge' });
    if (r.monthlyCompleted) out.push({ kind: 'monthly' });
    if (r.streakIncremented || r.freezeConsumedFor) out.push({ kind: 'streak' });
    return out;
  }, [r, state.skipTest, crownGained, worldDone]);

  const [index, setIndex] = useState(0);
  const page = pages[index];

  useEffect(() => {
    const sound: SoundName | null =
      page.kind === 'recap' ? (perfect ? 'perfect' : r?.goalReached ? 'goal' : null)
      : page.kind === 'levelUp' ? 'levelup'
      : page.kind === 'crown' || page.kind === 'world' ? 'crown'
      : page.kind === 'badge' || page.kind === 'quest' || page.kind === 'monthly' ? 'badge'
      : null;
    if (sound) {
      const timer = setTimeout(() => sounds.play(sound), 200);
      return () => clearTimeout(timer);
    }
  }, [page, perfect, r]);

  const last = index === pages.length - 1;
  const footer = <Button label={t('common.continue')} color={color} onPress={() => (last ? router.back() : setIndex(index + 1))} />;

  return (
    <Screen footer={footer}>
      {(perfect && page.kind === 'recap') || page.kind === 'world' || page.kind === 'levelUp' || page.kind === 'monthly' ? <Confetti /> : null}
      {page.kind === 'recap' && (
        <Recap state={state} color={color} perfect={perfect} good={good} />
      )}
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
      {page.kind === 'levelUp' && r && (
        <Moment key="level" icon="arrow-up-circle" color={color} title={t('end.levelUp.title', { level: r.levelUp.to })} body={t('end.levelUp.body', { from: r.levelUp.from, to: r.levelUp.to })} />
      )}
      {page.kind === 'crown' && r && (
        <Moment
          key="crown"
          emoji="👑"
          color={colors.gold}
          title={crownGained ? t('end.crown.title') : t('end.unlocked.title')}
          body={crownGained ? (r.traitsAfter >= 5 ? t('end.crown.body5') : r.traitsAfter >= PATH_TRAITS ? t('end.crown.body3') : t('end.crown.body1')) : ''}>
          {crownGained && (
            <Pop delay={300}>
              <Crowns count={r.traitsAfter} size={30} />
            </Pop>
          )}
          {r.newlyUnlockedUnits.length > 0 && (
            <View style={[styles.list, { backgroundColor: colors.surfaceAlt }]}>
              <Text variant="small" secondary>
                {t('end.unlocked.title')}
              </Text>
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
        <Moment key="world" emoji={world.emoji} color={world.color} title={t('end.world.title')} body={t('end.world.body', { world: world.title[lang] })} />
      )}
      {page.kind === 'quest' && (
        <Moment key="quest" icon="flag" color={colors.success} title={t('end.quest.title')} body="">
          <View style={[styles.list, { backgroundColor: colors.surfaceAlt }]}>
            {page.quests.map((q) => (
              <View key={q.id} style={styles.listRow}>
                <Icon name="checkmark-circle" size={18} color={colors.success} />
                <Text variant="bodyBold" style={styles.grow}>
                  {t(QUEST_KEYS[q.kind], { n: q.target })}
                </Text>
                <Icon name="diamond" size={16} color={colors.gem} />
                <Text variant="bodyBold" style={{ color: colors.gem }}>
                  {q.reward}
                </Text>
              </View>
            ))}
          </View>
        </Moment>
      )}
      {page.kind === 'badge' && r && (
        <Moment key="badge" icon="medal" color={colors.gold} title={t('end.badge.title')} body="">
          <View style={styles.badges}>
            {r.newBadges.map((id) => (
              <View key={id} style={[styles.badge, { backgroundColor: colors.goldSoft, borderColor: colors.gold }]}>
                <Text variant="h2">{t(`badge.${id}` as Key)}</Text>
              </View>
            ))}
          </View>
        </Moment>
      )}
      {page.kind === 'monthly' && r && (
        <Moment key="monthly" icon="medal" color={colors.gold} title={t('monthly.end.title')} body={t('monthly.end.body', { target: MONTHLY_TARGET, month: monthLabel(lang, r.progress.monthly.month ?? '') })} />
      )}
      {page.kind === 'streak' && r && (
        <Moment
          key="streak"
          icon="flame"
          color={colors.streak}
          title={t('end.streak.title', { count: progress.streak.current })}
          body={r.freezeConsumedFor ? t('end.streak.freeze', { day: r.freezeConsumedFor }) : t('end.streak.body')}
        />
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
        <Tile color={accuracy === 100 ? colors.success : colors.gem} icon="locate" label={t('end.tile.accuracy')} value={`${accuracy}%`} />
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
              {r.dailyRatio >= 1 ? <Icon name="checkmark" size={22} color={colors.success} /> : <Text variant="small">{Math.round(r.dailyRatio * 100)}%</Text>}
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
  badges: { gap: space.sm, alignItems: 'center' },
  badge: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.xl },
});
