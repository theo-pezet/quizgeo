/**
 * « Signaler une erreur » : les questions marquées pendant les leçons, mises
 * en forme pour être envoyées d'un coup (Claude, mail, copier-coller) et
 * corrigées dans le contenu. Fonctions pures : __tests__/reports.test.ts.
 */

import type { Exercise } from '@/game';

import { describe } from './askClaude';

export interface ReportItem {
  key: string;
  /** Date ISO du signalement. */
  at: string;
  unitTitle?: string;
}

/** Le texte d'un lot de signalements, dans l'ordre où ils ont été faits. */
export function buildReport(items: readonly ReportItem[], byKey: ReadonlyMap<string, Exercise>): string {
  const lines = [
    `Skilltrail: ${items.length} question(s) reported as wrong, outdated or off-topic.`,
    'For each one, check the facts (search the web when it is about the present), then fix it in the content.',
  ];
  const sorted = [...items].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  sorted.forEach((item, i) => {
    lines.push('', `${i + 1}. [${item.key}]${item.unitTitle ? ` ${item.unitTitle}` : ''}`);
    const e = byKey.get(item.key);
    if (!e) {
      lines.push('(this question no longer exists in the app)');
      return;
    }
    const { question, answer } = describe(e);
    lines.push(...question, `App's answer: ${answer}`);
    if (e.explain) lines.push(`App's explanation: ${e.explain}`);
  });
  return lines.join('\n');
}
