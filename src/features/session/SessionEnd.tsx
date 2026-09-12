import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { UNIT_BY_ID } from '@/content';
import { BADGES, levelProgress, questLabel } from '@/game';
import { useProgress } from '@/store/progress';
import { Button, Card, Crowns, ProgressBar, Screen, Text, space, useColors } from '@/ui';

import type { SessionSpec, SessionState } from './useSession';

export function SessionEnd({ state, spec, color }: { state: SessionState; spec: SessionSpec; color: string }) {
  const colors = useColors();
  const progress = useProgress((s) => s.progress);
  const r = state.result;
  const level = levelProgress(progress.xp);
  const score = `${state.correctCount}/${state.mainCount}`;
  const perfect = state.mainCount > 0 && state.correctCount === state.mainCount;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.big}>{perfect ? '🏆' : state.correctCount >= state.mainCount * 0.6 ? '🎉' : '💪'}</Text>
        <Text variant="title">{perfect ? 'Sans faute !' : state.correctCount >= state.mainCount * 0.6 ? 'Bien joué !' : 'Ça rentre.'}</Text>
        <Text variant="body" secondary>
          Score {score}
          {state.bestCombo >= 3 ? ` · meilleure série ×${state.bestCombo}` : ''}
        </Text>
      </View>

      {r && (
        <Card>
          <Text variant="bodyBold">✨ XP gagnés</Text>
          <Text variant="small" secondary>
            +{r.xpGained} de bonus de session, en plus des XP de chaque bonne réponse.
          </Text>
          <ProgressBar ratio={level.ratio} color={color} />
          <Text variant="small" secondary>
            Niveau {level.level} · {level.xpToNextLevel} XP avant le suivant
            {r.levelUp.crossed ? ` · 🆙 Niveau ${r.levelUp.from} → ${r.levelUp.to}` : ''}
          </Text>
        </Card>
      )}

      {r && (r.gemsGained > 0 || r.energyRefunded > 0) && (
        <Card>
          <Text variant="bodyBold">
            💎 +{r.gemsGained} gemmes{r.energyRefunded > 0 ? ` · ⚡ +${r.energyRefunded} énergie (sans faute)` : ''}
          </Text>
          <Text variant="small" secondary>
            Solde : 💎 {progress.gems}. À dépenser dans le Profil : recharge, gel de série, boost XP.
          </Text>
        </Card>
      )}

      {r && r.questsCompleted.length > 0 && (
        <Card style={{ borderColor: colors.success }}>
          <Text variant="bodyBold">🎯 Quête accomplie</Text>
          {r.questsCompleted.map((q) => (
            <Text key={q.id} variant="small">
              {questLabel(q)} · 💎 {q.reward}
            </Text>
          ))}
        </Card>
      )}

      {r && spec.mode === 'unit' && (
        <Card>
          <View style={styles.row}>
            <Text variant="bodyBold">👑 Couronnes</Text>
            <Crowns count={r.traitsAfter} size={18} />
          </View>
          <Text variant="small" secondary>
            {r.traitsAfter > r.traitsBefore
              ? `Une de plus ! ${r.traitsAfter >= 5 ? 'Unité légendaire.' : r.traitsAfter >= 3 ? 'Le chemin avance ; il reste la maîtrise (5).' : 'Refais l’unité pour la suivante.'}`
              : r.traitsAfter >= 5
                ? 'Toujours légendaire.'
                : 'Pas de nouvelle couronne : il faut réussir tous les exercices de l’unité, sur plusieurs sessions.'}
          </Text>
        </Card>
      )}

      {r && r.newlyUnlockedUnits.length > 0 && (
        <Card style={{ borderColor: color }}>
          <Text variant="bodyBold">🔓 Nouvelle unité ouverte</Text>
          {r.newlyUnlockedUnits.map((id) => (
            <Text key={id} variant="small">
              {UNIT_BY_ID.get(id)?.title ?? id}
            </Text>
          ))}
        </Card>
      )}

      {r && (r.streakIncremented || r.freezeConsumedFor) && (
        <Card>
          <Text variant="bodyBold">🔥 Série : {progress.streak.current} jour{progress.streak.current > 1 ? 's' : ''}</Text>
          {r.freezeConsumedFor && (
            <Text variant="small" secondary>
              Un gel a couvert le {r.freezeConsumedFor}.
            </Text>
          )}
        </Card>
      )}

      {r && r.newBadges.length > 0 && (
        <Card style={{ borderColor: colors.gold }}>
          <Text variant="bodyBold">🏅 Nouveau badge</Text>
          {r.newBadges.map((id) => (
            <Text key={id} variant="small">
              {BADGES.find((b) => b.id === id)?.name ?? id}
            </Text>
          ))}
        </Card>
      )}

      {state.adShown && (
        <Text variant="small" secondary>
          (Emplacement publicitaire : désactivé dans cette version.)
        </Text>
      )}

      <Button label="Continuer" color={color} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  big: { fontSize: 64 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
