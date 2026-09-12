import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { UNIT_BY_ID } from '@/content';
import { BADGES, levelProgress, questLabel } from '@/game';
import { sounds, type SoundName } from '@/lib/sounds';
import { useProgress } from '@/store/progress';
import { Button, Card, Confetti, Crowns, FadeUp, Pop, ProgressBar, Ring, Screen, Text, space, useColors, useCountUp } from '@/ui';

import type { SessionSpec, SessionState } from './useSession';

/**
 * L'écran de fin : une cascade de cartes, chacune avec son petit moment.
 * Un seul son, le plus important (niveau > badge > couronne > sans-faute > objectif).
 */
export function SessionEnd({ state, spec, color }: { state: SessionState; spec: SessionSpec; color: string }) {
  const colors = useColors();
  const progress = useProgress((s) => s.progress);
  const r = state.result;
  const level = levelProgress(progress.xp);
  const score = `${state.correctCount}/${state.mainCount}`;
  const perfect = state.mainCount > 0 && state.correctCount === state.mainCount;
  const good = state.correctCount >= state.mainCount * 0.6;
  const crownGained = !!r && r.traitsAfter > r.traitsBefore;
  const answersXp = r ? r.progress.xp - state.xpAtStart - r.xpGained : 0;
  const totalXp = r ? r.progress.xp - state.xpAtStart : 0;
  const shownXp = useCountUp(Math.max(0, totalXp), 900, 300);

  const sound = useMemo<SoundName | null>(() => {
    if (!r) return null;
    if (r.levelUp.crossed) return 'levelup';
    if (r.newBadges.length > 0) return 'badge';
    if (crownGained) return 'crown';
    if (perfect) return 'perfect';
    if (r.goalReached) return 'goal';
    return null;
  }, [r, crownGained, perfect]);

  useEffect(() => {
    if (sound) {
      const t = setTimeout(() => sounds.play(sound), 250);
      return () => clearTimeout(t);
    }
  }, [sound]);

  let delay = 0;
  const next = () => (delay += 140);

  return (
    <Screen>
      {perfect && <Confetti />}
      <View style={styles.hero}>
        <Pop>
          <Text style={styles.big}>{perfect ? '🏆' : good ? '🎉' : '💪'}</Text>
        </Pop>
        <FadeUp delay={100}>
          <Text variant="title" style={styles.center}>
            {perfect ? 'Sans faute !' : good ? 'Bien joué !' : 'Ça rentre.'}
          </Text>
          <Text variant="body" secondary style={styles.center}>
            Score {score}
            {state.bestCombo >= 3 ? ` · meilleure série ×${state.bestCombo}` : ''}
          </Text>
        </FadeUp>
      </View>

      {r && (
        <FadeUp delay={next()}>
          <Card>
            <View style={styles.row}>
              <View style={styles.grow}>
                <Text variant="bodyBold">✨ XP gagnés</Text>
                <Text variant="small" secondary>
                  {answersXp} pour les réponses{r.xpGained > 0 ? ` + ${r.xpGained} de bonus de session` : ''}.
                </Text>
              </View>
              <Text variant="title" style={{ color }}>
                +{shownXp}
              </Text>
            </View>
            <ProgressBar ratio={level.ratio} color={color} />
            <Text variant="small" secondary>
              Niveau {level.level} · {level.xpToNextLevel} XP avant le suivant
            </Text>
          </Card>
        </FadeUp>
      )}

      {r && r.levelUp.crossed && (
        <Pop delay={next() + 200}>
          <Card style={{ borderColor: color, backgroundColor: colors.surfaceAlt }}>
            <Text variant="h2">🆙 Niveau {r.levelUp.to} !</Text>
            <Text variant="small" secondary>
              Tu passes du niveau {r.levelUp.from} au niveau {r.levelUp.to}.
            </Text>
          </Card>
        </Pop>
      )}

      {r && (
        <FadeUp delay={next()}>
          <Card style={r.goalReached ? { borderColor: colors.success } : undefined}>
            <View style={styles.row}>
              <Ring ratio={r.dailyRatio} size={56} color={r.dailyRatio >= 1 ? colors.success : color}>
                <Text variant="small">{r.dailyRatio >= 1 ? '✓' : `${Math.round(r.dailyRatio * 100)}%`}</Text>
              </Ring>
              <View style={styles.grow}>
                <Text variant="bodyBold">{r.goalReached ? '🎯 Objectif du jour atteint !' : r.dailyRatio >= 1 ? '🎯 Objectif du jour déjà atteint' : '🎯 Objectif du jour'}</Text>
                <Text variant="small" secondary>
                  {Math.min(r.progress.daily.xp, r.progress.daily.goal)} / {r.progress.daily.goal} XP
                  {r.goalReached ? ' · +15 gemmes' : ''}
                </Text>
              </View>
            </View>
          </Card>
        </FadeUp>
      )}

      {r && (r.gemsGained > 0 || r.energyRefunded > 0) && (
        <FadeUp delay={next()}>
          <Card>
            <Text variant="bodyBold">
              💎 +{r.gemsGained} gemmes{r.energyRefunded > 0 ? ` · ⚡ +${r.energyRefunded} énergie (sans faute)` : ''}
            </Text>
            <Text variant="small" secondary>
              Solde : 💎 {progress.gems}. À dépenser dans le Profil : recharge, gel de série, boost XP.
            </Text>
          </Card>
        </FadeUp>
      )}

      {r && r.questsCompleted.length > 0 && (
        <Pop delay={next()}>
          <Card style={{ borderColor: colors.success }}>
            <Text variant="bodyBold">🎯 Quête accomplie</Text>
            {r.questsCompleted.map((q) => (
              <Text key={q.id} variant="small">
                {questLabel(q)} · 💎 {q.reward}
              </Text>
            ))}
          </Card>
        </Pop>
      )}

      {state.skipTest && (
        <FadeUp delay={next()}>
          <Card style={{ borderColor: state.skipTest.passed ? colors.success : colors.danger }}>
            <Text variant="bodyBold">{state.skipTest.passed ? '⏩ Test de sortie réussi' : '⏩ Test de sortie raté'}</Text>
            <Text variant="small" secondary>
              {state.skipTest.passed
                ? state.skipTest.validatedUnits.length > 0
                  ? `Validées d’office : ${state.skipTest.validatedUnits.map((id) => UNIT_BY_ID.get(id)?.title ?? id).join(', ')}.`
                  : 'Rien à valider : le chemin était déjà ouvert jusqu’ici.'
                : 'Il fallait 8/10. Tes réponses comptent quand même ; reprends le chemin ou retente plus tard.'}
            </Text>
          </Card>
        </FadeUp>
      )}

      {r && spec.mode === 'unit' && (
        <FadeUp delay={next()}>
          <Card style={crownGained ? { borderColor: colors.gold } : undefined}>
            <View style={styles.row}>
              <Text variant="bodyBold">👑 Couronnes</Text>
              {crownGained ? (
                <Pop delay={delay + 300}>
                  <Crowns count={r.traitsAfter} size={20} />
                </Pop>
              ) : (
                <Crowns count={r.traitsAfter} size={18} />
              )}
            </View>
            <Text variant="small" secondary>
              {crownGained
                ? `Une de plus ! ${r.traitsAfter >= 5 ? 'Unité légendaire.' : r.traitsAfter >= 3 ? 'Le chemin avance ; il reste la maîtrise (5).' : 'Refais l’unité pour la suivante.'}`
                : r.traitsAfter >= 5
                  ? 'Toujours légendaire.'
                  : 'Pas de nouvelle couronne : il faut réussir tous les exercices de l’unité, sur plusieurs sessions.'}
            </Text>
          </Card>
        </FadeUp>
      )}

      {r && r.newlyUnlockedUnits.length > 0 && (
        <Pop delay={next()}>
          <Card style={{ borderColor: color }}>
            <Text variant="bodyBold">🔓 Nouvelle unité ouverte</Text>
            {r.newlyUnlockedUnits.map((id) => (
              <Text key={id} variant="small">
                {UNIT_BY_ID.get(id)?.title ?? id}
              </Text>
            ))}
          </Card>
        </Pop>
      )}

      {r && (r.streakIncremented || r.freezeConsumedFor) && (
        <FadeUp delay={next()}>
          <Card>
            <Text variant="bodyBold">🔥 Série : {progress.streak.current} jour{progress.streak.current > 1 ? 's' : ''}</Text>
            {r.freezeConsumedFor && (
              <Text variant="small" secondary>
                Un gel a couvert le {r.freezeConsumedFor}.
              </Text>
            )}
          </Card>
        </FadeUp>
      )}

      {r && r.newBadges.length > 0 && (
        <Pop delay={next() + 200}>
          <Card style={{ borderColor: colors.gold, backgroundColor: colors.surfaceAlt }}>
            <Text variant="bodyBold">🏅 Nouveau badge</Text>
            {r.newBadges.map((id) => (
              <Text key={id} variant="h2">
                {BADGES.find((b) => b.id === id)?.name ?? id}
              </Text>
            ))}
          </Card>
        </Pop>
      )}

      {state.adShown && (
        <Text variant="small" secondary>
          (Emplacement publicitaire : désactivé dans cette version.)
        </Text>
      )}

      <FadeUp delay={next()}>
        <Button label="Continuer" color={color} onPress={() => router.back()} />
      </FadeUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  big: { fontSize: 64 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
});
