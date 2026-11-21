import { Pressable, StyleSheet, View } from 'react-native';

import { nextPlannedSubject, studyPlan, studyTarget, type StudyState } from '@/game';
import { useT } from '@/i18n';

import { Ring } from './anim';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';
import { radius, space, useColors } from './tokens';

interface SubjectInfo {
  id: string;
  title: string;
  emoji: string;
  color: string;
}

/**
 * L'objectif en minutes (1 h 30 par défaut), la dette éventuelle, la série
 * « objectif tenu » et le plan du jour par matière. Toucher une matière
 * l'ouvre sur le parcours.
 */
export function StudyPlanCard({ study, subjects, onPick }: { study: StudyState; subjects: SubjectInfo[]; onPick: (subjectId: string) => void }) {
  const colors = useColors();
  const t = useT();
  const target = studyTarget(study);
  const done = Math.floor(study.seconds / 60);
  const met = done >= target || study.metOn === study.day;
  const plan = studyPlan(study, subjects.map((s) => s.id));
  const next = met ? null : nextPlannedSubject(plan);
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const nextInfo = next ? byId.get(next) : undefined;
  return (
    <Card color={met ? colors.success : colors.primary}>
      <View style={styles.head}>
        <Ring ratio={Math.min(1, done / target)} size={64} color={met ? colors.success : colors.primary}>
          {met ? <Icon name="checkmark" size={24} color={colors.success} /> : <Text variant="small">{t('study.short', { done })}</Text>}
        </Ring>
        <View style={styles.headText}>
          <Text variant="bodyBold">{met ? t('study.done') : t('study.title')}</Text>
          <Text variant="small" secondary>
            {t('study.detail', { done: Math.min(done, target), target })}
          </Text>
          {study.debtMinutes > 0 && !met && (
            <Text variant="small" style={{ color: colors.danger }}>
              {t('study.debt', { n: study.debtMinutes })}
            </Text>
          )}
          <Text variant="small" secondary>
            {t('study.streak', { n: study.goalStreak, best: study.bestGoalStreak })}
          </Text>
        </View>
      </View>
      {plan.map((line) => {
        const info = byId.get(line.subjectId);
        if (!info) return null;
        const ok = line.doneMinutes >= line.targetMinutes;
        return (
          <Pressable key={line.subjectId} accessibilityRole="button" onPress={() => onPick(line.subjectId)} style={styles.line}>
            <View style={styles.lineHead}>
              <Text variant="small" style={styles.lineLabel}>
                {info.emoji} {info.title}
              </Text>
              <Text variant="small" style={{ color: ok ? colors.success : colors.textSecondary }}>
                {t('study.line', { done: Math.min(line.doneMinutes, line.targetMinutes), target: line.targetMinutes })}
              </Text>
            </View>
            <ProgressBar ratio={Math.min(1, line.doneMinutes / line.targetMinutes)} height={8} color={ok ? colors.success : info.color} />
          </Pressable>
        );
      })}
      {nextInfo && <Button label={t('study.next', { subject: nextInfo.title })} color={nextInfo.color} onPress={() => onPick(nextInfo.id)} />}
      <Text variant="small" secondary style={styles.rules}>
        {t('study.rules')}
      </Text>
    </Card>
  );
}

/** Le bilan des jours manqués, une fois, jusqu'à « Compris ». */
export function StudyReportCard({ report, onClose }: { report: NonNullable<StudyState['report']>; onClose: () => void }) {
  const colors = useColors();
  const t = useT();
  return (
    <Card color={colors.danger}>
      <View style={styles.reportHead}>
        <Icon name="alert-circle" size={22} color={colors.danger} />
        <Text variant="bodyBold">{t('study.report.title', { count: report.missedDays })}</Text>
      </View>
      <Text variant="small">{t('study.report.missing', { n: report.missingMinutes })}</Text>
      {report.gemsLost > 0 && <Text variant="small">{t('study.report.gems', { n: report.gemsLost })}</Text>}
      {report.streakLost > 0 && <Text variant="small">{t('study.report.streak', { n: report.streakLost })}</Text>}
      {report.debtMinutes > 0 && <Text variant="small">{t('study.report.debt', { n: report.debtMinutes })}</Text>}
      <View style={[styles.reportBar, { backgroundColor: colors.surfaceAlt }]}>
        <Text variant="small" secondary>
          {t('study.report.hint')}
        </Text>
      </View>
      <Button label={t('study.report.ok')} tone="secondary" onPress={onClose} />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headText: { flex: 1, gap: 2 },
  line: { gap: 4, paddingVertical: 2 },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  lineLabel: { flex: 1 },
  rules: { fontSize: 12 },
  reportHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reportBar: { borderRadius: radius.md, padding: space.sm },
});
