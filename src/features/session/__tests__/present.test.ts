/**
 * Présentation des choix : les étapes de cas pratique sont mélangées (la
 * bonne réponse est stockée en premier) et les choix de code gardent la
 * police à chasse fixe.
 */
import { mulberry32, type CaseStep } from '@/game';

import { isCodeChoice, presentCaseStep } from '../present';

const step: CaseStep = { prompt: 'Que fais-tu ?', choices: ['Bonne', 'Mauvaise A', 'Mauvaise B', 'Mauvaise C'], answer: 0, feedback: 'Parce que.' };

describe('presentCaseStep', () => {
  it('remappe l’index de la bonne réponse après mélange', () => {
    for (let seed = 1; seed < 50; seed += 1) {
      const p = presentCaseStep(step, mulberry32(seed));
      expect(p.choices[p.answer]).toBe('Bonne');
      expect([...p.choices].sort()).toEqual([...step.choices].sort());
      p.choices.forEach((c, i) => expect(step.choices[p.order[i]]).toBe(c));
    }
  });

  it('ne laisse pas la bonne réponse toujours en premier', () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, seed) => presentCaseStep(step, mulberry32(seed + 1)).answer));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('garde l’ordre d’une étape à deux choix', () => {
    const p = presentCaseStep({ ...step, choices: ['Oui', 'Non'] }, mulberry32(3));
    expect(p.choices).toEqual(['Oui', 'Non']);
    expect(p.answer).toBe(0);
  });
});

describe('isCodeChoice', () => {
  it('met en police de code les sorties et extraits des QCM de code', () => {
    expect(isCodeChoice('py-2:w:1', 'Leads: 42', 4)).toBe(true);
    expect(isCodeChoice('py-2:w:1', 'Leads:42', 4)).toBe(true);
    expect(isCodeChoice('py-6:w:5', '[  PROMO20]', 4)).toBe(true);
    expect(isCodeChoice('py-3:c:17', '[1]\n[1, 2]', 4)).toBe(true);
    expect(isCodeChoice('py-concepts-1:c:4', 'True', 4)).toBe(true);
  });

  it('laisse en texte les phrases et les vrai/faux', () => {
    expect(isCodeChoice('py-13:c:3', 'Le texte est ajouté à la fin du fichier', 4)).toBe(false);
    expect(isCodeChoice('web-6:w:8', 'Vrai', 2)).toBe(false);
    expect(isCodeChoice('seo-1:def:x', 'Optimisation pour les moteurs de recherche', 4)).toBe(false);
    expect(isCodeChoice('seo-1:term:x', 'Map Pack', 4)).toBe(false);
  });

  it('hors QCM de code, seulement ce qui ressemble clairement à du code', () => {
    expect(isCodeChoice('py-6:def:x', 'df.head()', 4)).toBe(true);
    expect(isCodeChoice('web-1:term:x', '<div>', 4)).toBe(true);
  });
});
