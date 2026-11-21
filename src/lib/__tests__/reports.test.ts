import type { Exercise } from '@/game';

import { buildReport } from '../reports';

const q = { kind: 'qcm', key: 'u:x:1', unitId: 'u', prompt: 'What are the 4 Ps?', choices: ['Product, price, place, promotion', 'People'], answer: 0, explain: 'The marketing mix.' } as unknown as Exercise;
const v = { kind: 'order', key: 'u:x:2', unitId: 'u', prompt: 'Order', steps: ['a', 'b', 'c'], explain: '' } as unknown as Exercise;

describe('buildReport', () => {
  it('liste les questions dans l’ordre des signalements, avec la réponse de l’app', () => {
    const text = buildReport(
      [
        { key: 'u:x:2', at: '2026-11-21T10:00:00Z' },
        { key: 'u:x:1', at: '2026-11-21T09:00:00Z', unitTitle: 'Marketing mix' },
        { key: 'gone:x:9', at: '2026-11-21T09:30:00Z' },
        { key: 'u:x:3', at: '2026-11-21T10:00:00Z' },
      ],
      new Map([
        ['u:x:1', q],
        ['u:x:2', v],
      ]),
    );
    expect(text).toContain('4 question(s) reported');
    expect(text.indexOf('[u:x:1] Marketing mix')).toBeLessThan(text.indexOf('[gone:x:9]'));
    expect(text).toContain("App's answer: Product, price, place, promotion");
    expect(text).toContain("App's explanation: The marketing mix.");
    expect(text).toContain('(this question no longer exists in the app)');
    expect(text).not.toContain("App's explanation: \n");
  });
});
