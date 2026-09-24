/**
 * Lint du contenu généré (generate.ts), dans les trois langues : ce qu'un
 * relecteur repérerait d'un coup d'œil et qu'aucun type ne garantit.
 *
 * Les contrôles sont écrits indépendamment de cardText.ts (repliement,
 * recherche en mots entiers) pour ne pas valider le masque avec lui-même.
 */

import type { ClozeExercise, Exercise, MatchExercise, QcmExercise } from '@/game';
import { answerMatches } from '@/lib/text';

import { contentFor } from '..';
import { head, shortDefinition, shownDefinition } from '../generate';

const LANGS = ['fr', 'en', 'es'] as const;
/** Sigles trop génériques pour trahir une réponse : toutes les cartes de la matière IA les portent. */
const GENERIC = new Set(['IA', 'AI']);

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasPhrase(hay: string, needle: string): boolean {
  const n = fold(needle);
  return n.replace(/ /g, '').length >= 3 && ` ${fold(hay)} `.includes(` ${n} `);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Le texte cite-t-il le terme, sa forme sans parenthèses ou l'un de ses sigles ? Renvoie la forme trouvée. */
function leak(text: string, term: string): string | undefined {
  const base = term.replace(/\s*\([^()]*\)/g, '').trim();
  for (const form of [term, base]) if (hasPhrase(text, form)) return form;
  // Sigles du terme hors parenthèses : « Taux de rebond (GA4) » ne doit pas cacher « GA4 », qui n'est qu'un contexte.
  for (const tok of base.split(/[\s/,:]+/)) {
    if (!/^[A-Z0-9][A-Z0-9&.-]{1,7}$/.test(tok) || (tok.match(/[A-Z]/g)?.length ?? 0) < 2 || GENERIC.has(tok)) continue;
    if (new RegExp(`(^|[^A-Za-z0-9])${escapeRe(tok)}s?([^A-Za-z0-9]|$)`).test(text)) return tok;
  }
  return undefined;
}

const kindOf = (e: Exercise) => e.key.split(':')[1];

describe.each(LANGS)('exercices générés en %s', (lang) => {
  const c = contentFor(lang);
  const generated = c.EXERCISES.filter((e) => ['def', 'term', 'cloze', 'match'].includes(kindOf(e)));
  const cardOf = (e: Exercise) => ('cardId' in e && e.cardId ? c.CARD_BY_ID.get(e.cardId) : undefined);

  it('« Quel terme… ? » : la définition ne donne ni le terme, ni son sigle, et reste assez longue', () => {
    const bad: string[] = [];
    for (const e of generated) {
      if (kindOf(e) !== 'term' || e.kind !== 'qcm') continue;
      const shown = e.prompt.split('\n\n').slice(1).join('\n\n');
      const found = leak(shown, e.choices[e.answer]);
      if (found) bad.push(`${e.key} : « ${found} »`);
      if (shown.split('___').join('').trim().length < 40) bad.push(`${e.key} : définition trop courte`);
    }
    expect(bad).toEqual([]);
  });

  it('« Que signifie… ? » : aucune définition ne commence par le terme ou son développement, toutes finissent pareil', () => {
    const bad: string[] = [];
    for (const e of generated) {
      if (kindOf(e) !== 'def' || e.kind !== 'qcm') continue;
      const card = cardOf(e);
      const correct = e.choices[e.answer];
      if (card && leak(correct, card.term)) bad.push(`${e.key} : « ${leak(correct, card.term)} » dans la bonne réponse`);
      for (const choice of e.choices) {
        if (!/[.!?…]$/.test(choice)) bad.push(`${e.key} : sans point final « ${choice.slice(-20)} »`);
        // « Valeur vie client (Lifetime Value) : … » : un développement anglais en Title Case avant les deux-points.
        // Le masque ne doit pas vider le choix de son sens (le terme est déjà affiché dans la question).
        if (choice.includes('___') && choice.split('___').join('').replace(/[^\p{L}\p{N}]/gu, '').length < 20) bad.push(`${e.key} : choix vidé par le masque « ${choice} »`);
        if (/^[^:.]{1,80}\((?:[A-Z][\w-]*\s(?:(?:of|on|the|to|for|from|and)\s)*){1,5}[A-Z][\w-]*\)\s?:\s/.test(choice)) bad.push(`${e.key} : amorce « Développé (English) : » « ${choice.slice(0, 50)} »`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('textes à trou : réponse invisible, au moins 2 distracteurs de même nature, sans doublon', () => {
    const formula = (s: string) => /[/*×÷=]|\s[-+]\s|%/.test(s);
    const bad: string[] = [];
    for (const e of generated) {
      if (e.kind !== 'cloze') continue;
      const x = e as ClozeExercise;
      expect(x.text.split('___').length).toBe(2);
      if (hasPhrase(x.text.replace('___', ' '), x.answer)) bad.push(`${x.key} : réponse visible`);
      const keys = x.bank.map(fold);
      if (new Set(keys).size !== keys.length || keys.includes(fold(x.answer))) bad.push(`${x.key} : doublon dans la banque`);
      if (x.bank.length < 2) bad.push(`${x.key} : banque de ${x.bank.length}`);
      for (const b of x.bank) if (formula(b) !== formula(x.answer)) bad.push(`${x.key} : « ${b} » n'est pas de même nature que « ${x.answer} »`);
    }
    expect(bad).toEqual([]);
  });

  it('associations : définitions distinctes, sans le terme, bien coupées, avec une majuscule', () => {
    const bad: string[] = [];
    for (const e of generated) {
      if (e.kind !== 'match') continue;
      const m = e as MatchExercise;
      const rights = m.pairs.map((p) => fold(p.right));
      if (new Set(rights).size !== rights.length) bad.push(`${m.key} : définitions identiques`);
      for (const p of m.pairs) {
        const r = p.right;
        const found = leak(r, p.left);
        if (found) bad.push(`${m.key} : « ${found} » dans « ${r} »`);
        if (/[.,:;!?(]…$/.test(r)) bad.push(`${m.key} : « …» après une ponctuation « ${r.slice(-15)} »`);
        if (/^[a-zà-ÿ]+[\s,']/.test(r)) bad.push(`${m.key} : commence par une minuscule « ${r.slice(0, 30)} »`);
        if (r.replace(/___|…/g, '').trim().length < 25) bad.push(`${m.key} : trop court « ${r} »`);
        if (r.length > 120) bad.push(`${m.key} : trop long (${r.length})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('mode tapé : aucun distracteur n’est accepté, pas de terme composé ni de dictée', () => {
    const bad: string[] = [];
    for (const e of generated) {
      if (e.kind !== 'qcm' || !e.typed) continue;
      const q = e as QcmExercise & { typed: NonNullable<QcmExercise['typed']> };
      const { answer, accept = [] } = q.typed;
      q.choices.forEach((choice, i) => {
        if (i !== q.answer && answerMatches(choice, answer, accept)) bad.push(`${q.key} : « ${choice} » accepté pour « ${answer} »`);
      });
      if (!answerMatches(answer, answer, accept)) bad.push(`${q.key} : la réponse elle-même est refusée`);
      const shortest = Math.min(answer.replace(/\s*\([^()]*\)/g, '').length, ...accept.map((a) => a.length));
      if (shortest > 30) bad.push(`${q.key} : ${shortest} caractères à taper`);
      const acro = /\(([A-Z0-9][A-Z0-9&.-]{1,7})\)/.exec(answer)?.[1];
      if (acro && !answerMatches(acro, answer, accept)) bad.push(`${q.key} : le sigle « ${acro} » est refusé`);
    }
    expect(bad).toEqual([]);
  });

  it('« Terme : définition » suit la typographie de la langue', () => {
    for (const e of generated) {
      if (!('explain' in e) || !e.explain || kindOf(e) === 'match') continue;
      const first = e.explain.split('\n')[0];
      if (lang === 'fr') expect(first).toMatch(/^[^\n]+? : /);
      else expect(first).not.toMatch(/^[^\n:]+? : /);
    }
  });
});

describe('aides du générateur', () => {
  it('retire le terme anglais entre parenthèses et le propose en mode tapé', () => {
    const fr = contentFor('fr');
    const reach = fr.CARD_BY_ID.get('marketing-reach');
    expect(reach).toBeDefined();
    if (!reach) return;
    const shown = shownDefinition(reach, 'fr');
    expect(shown.text).not.toMatch(/\(reach\)/i);
    expect(shown.trailing?.toLowerCase()).toBe('reach');
    const typed = fr.EXERCISES.find((e) => e.kind === 'qcm' && e.key.endsWith(':term:marketing-reach'));
    if (typed && typed.kind === 'qcm' && typed.typed) expect(answerMatches('reach', typed.typed.answer, typed.typed.accept)).toBe(true);
  });

  it('head : espace insécable avant « : » en français seulement', () => {
    expect(head('ROI', 'Retour sur investissement.', 'fr')).toBe('ROI : Retour sur investissement.');
    expect(head('ROI', 'Return on Investment.', 'en')).toBe('ROI: Return on Investment.');
    expect(head('ROI', 'Retorno de la inversión.', 'es')).toBe('ROI: Retorno de la inversión.');
  });

  it('shortDefinition : retire le développement quelle que soit sa longueur et masque le terme', () => {
    const fr = shortDefinition("Retour sur investissement (Return on Investment) : une mesure utilisée pour évaluer l'efficacité d'un investissement. Formule : (Bénéfice net / Coût) * 100.", 90, 'ROI');
    expect(fr).toBe("Une mesure utilisée pour évaluer l'efficacité d'un investissement.");
    expect(shortDefinition('Business to Business. Marketing and sales from one company to another company.', 90, 'B2B')).toBe('Marketing and sales from one company to another company.');
    expect(shortDefinition('Le nombre total de personnes uniques qui voient ton contenu (Portée).', 90, 'Portée')).toBe('Le nombre total de personnes uniques qui voient ton contenu.');
    // Un sigle entre parenthèses qui n'abrège pas le terme est un contexte : on ne le masque pas.
    expect(shortDefinition('Dans GA4, le pourcentage de sessions sans engagement.', 90, 'Taux de rebond (GA4)')).toBe('Dans GA4, le pourcentage de sessions sans engagement.');
    expect(shortDefinition('Dynamic Creative Optimization assemble la publicité à la volée.', 90, 'Dynamic Creative Optimization (DCO)')).toBe('___ assemble la publicité à la volée.');
    const cut = shortDefinition(`${'mot '.repeat(40)}fin.`, 90, 'Terme');
    expect(cut.endsWith('…')).toBe(true);
    expect(cut).not.toMatch(/[.,:;]…$/);
    expect(cut.length).toBeLessThanOrEqual(91);
  });
});
