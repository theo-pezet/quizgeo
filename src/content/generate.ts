/**
 * Génère les exercices d'une unité à partir de ses cartes du deck.
 *
 * Déterministe : la graine est dérivée de l'identifiant de l'unité, donc les
 * clés d'exercice sont stables d'un lancement à l'autre (la progression y est
 * rattachée). Les distracteurs viennent du même sous-thème quand il en a
 * assez, puis des autres sous-thèmes de l'unité, puis de la même matière.
 *
 * Les textes affichés passent par cardText.ts : le terme, son sigle et son
 * développement sont retirés ou masqués (« ___ ») pour ne pas donner la
 * réponse, et la bonne réponse et les distracteurs sont mis en forme de la
 * même façon. Les exercices qu'on ne peut pas poser proprement (définition
 * trop courte une fois masquée, texte à trou sans distracteurs) ne sont pas
 * générés, et cette décision est la même dans les trois langues pour que les
 * clés restent identiques.
 */

import confusablesJson from '@/data/confusables.json';
import type { Exercise, MatchExercise, QcmExercise } from '@/game';
import { hashString, mulberry32 } from '@/lib/random';

import {
  MASK,
  STOP,
  displayDefinition,
  explainDefinition,
  foldKey,
  isAcronym,
  isCompoundTerm,
  termBase,
  termParens,
  termVariants,
  truncate,
  wholeTermOnly,
  type CardLang,
  type DisplayedDefinition,
  type TermVariants,
} from './cardText';
import { localizedCards } from './localize';
import type { Card, CardSlice, Unit } from './types';

/** Les textes des exercices générés, dans la langue de l'utilisateur. */
export interface GenTexts {
  whatMeans: (term: string) => string;
  whichTerm: string;
  match: string;
  example: (text: string) => string;
  /** Langue du contenu : typographie de « Terme : définition », variantes acceptées en mode tapé. Français par défaut. */
  lang?: CardLang;
}

export const GEN_TEXTS_FR: GenTexts = {
  whatMeans: (term) => `Que signifie « ${term} » ?`,
  whichTerm: 'Quel terme correspond à cette définition ?',
  match: 'Associe chaque terme à sa définition',
  example: (text) => `Exemple : ${text}`,
  lang: 'fr',
};

const LANGS: readonly CardLang[] = ['fr', 'en', 'es'];
const CLOZE = /\{\{c\d+::(.*?)(?:::.*?)?\}\}/g;
const FIRST_CLOZE = /\{\{c\d+::(.*?)(?:::.*?)?\}\}/;

/** Longueur minimale (hors trous) d'une définition posée dans « Quel terme… ? ». */
const MIN_TERM_PROMPT = 40;
/** Au-delà, une réponse tapée mot pour mot est une dictée : pas de mode tapé. */
const MAX_TYPED = 30;
/** Longueur visée d'une définition dans une association. */
const MATCH_MAX = 90;

/** « Terme : définition » selon la langue : espace insécable avant « : » en français, pas d'espace en anglais et en espagnol. */
export function head(term: string, text: string, lang: CardLang = 'fr'): string {
  return lang === 'fr' ? `${term} : ${text}` : `${term}: ${text}`;
}

export function resolveUnitCards(unit: Unit, deck: readonly Card[]): Card[] {
  if (unit.cards.length === 0) return [];
  if (typeof unit.cards[0] === 'string') {
    const byId = new Map(deck.map((c) => [c.id, c]));
    return (unit.cards as string[]).map((id) => byId.get(id)).filter((c): c is Card => c !== undefined);
  }
  const out: Card[] = [];
  for (const slice of unit.cards as CardSlice[]) {
    const topic = deck.filter((c) => c.subject === unit.subjectId && c.topic === slice.topic);
    out.push(...topic.slice(slice.from, slice.to));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Terme anglais de chaque carte (variante acceptée, parenthèse à retirer).

let EN_TERMS: ReadonlyMap<string, string> | undefined;

function enTermOf(id: string): string | undefined {
  if (!EN_TERMS) EN_TERMS = new Map(localizedCards('en').map((c) => [c.id, c.term]));
  return EN_TERMS.get(id);
}

function variantsOf(card: Card, lang: CardLang): TermVariants {
  const en = lang === 'en' ? undefined : enTermOf(card.id);
  return termVariants(card.term, en && foldKey(en) !== foldKey(card.term) ? [en] : [], card.definition);
}

/** « prompt » : énoncé de « Quel terme… ? » et associations, tout le terme masqué ; « choice » : choix de « Que signifie… ? », où le terme est affiché. */
export type DefinitionUse = 'prompt' | 'choice';

const SHOWN = new WeakMap<Card, Partial<Record<string, DisplayedDefinition>>>();

/** La définition d'une carte telle qu'affichée dans les exercices générés (voir displayDefinition). */
export function shownDefinition(card: Card, lang: CardLang = 'fr', use: DefinitionUse = 'prompt'): DisplayedDefinition {
  let cache = SHOWN.get(card);
  if (!cache) {
    cache = {};
    SHOWN.set(card, cache);
  }
  const key = `${lang}:${use}`;
  let d = cache[key];
  if (!d) {
    const v = variantsOf(card, lang);
    d = displayDefinition(card.definition, use === 'choice' ? wholeTermOnly(v) : v);
    cache[key] = d;
  }
  return d;
}

/** La définition raccourcie d'une carte, pour une association. */
export function matchDefinition(card: Card, lang: CardLang = 'fr'): string {
  return truncate(shownDefinition(card, lang).text, MATCH_MAX);
}

/**
 * La définition sans son amorce (développement du sigle, terme répété),
 * terme masqué, coupée proprement. Sans `term`, seule une amorce courte
 * « Xxx: » est retirée.
 */
export function shortDefinition(definition: string, max = MATCH_MAX, term?: string): string {
  if (term !== undefined) return truncate(displayDefinition(definition, termVariants(term, [], definition)).text, max);
  let text = definition;
  const colon = text.indexOf(': ');
  if (colon > 0 && colon < 40) text = text.slice(colon + 2);
  return truncate(text, max);
}

function termPromptOk(text: string): boolean {
  return text.split(MASK).join('').replace(/\s+/g, ' ').trim().length >= MIN_TERM_PROMPT;
}

// ---------------------------------------------------------------------------
// Textes à trou.

type Nature = 'formula' | 'list' | 'word';

function natureOf(answer: string): Nature {
  if (/[/*×÷=]|\s[-+]\s|%/.test(answer)) return 'formula';
  if (/,\s/.test(answer)) return 'list';
  return 'word';
}

function containsAnswer(hay: string, answer: string): boolean {
  const a = foldKey(answer);
  if (a.replace(/ /g, '').length < 3) return a !== '' && hay.includes(answer);
  return ` ${foldKey(hay)} `.includes(` ${a} `);
}

interface ClozeParts {
  text: string;
  answer: string;
  /** Distracteurs possibles, de même nature que la réponse, sans doublon. */
  candidates: string[];
}

function clozeParts(card: Card, subjectCards: readonly Card[], lang: CardLang): ClozeParts | undefined {
  if (!card.cloze) return undefined;
  const answers: string[] = [];
  const text = card.cloze.replace(CLOZE, (_m, answer: string) => {
    answers.push(answer);
    return MASK;
  });
  if (answers.length !== 1) return undefined;
  const answer = answers[0];
  if (containsAnswer(text.split(MASK).join(' '), answer)) return undefined;
  const nature = natureOf(answer);
  const seen = new Set([foldKey(answer)]);
  const candidates: string[] = [];
  for (const c of subjectCards) {
    if (!c.cloze || c.id === card.id || isConfusable(card.id, c.id)) continue;
    const m = FIRST_CLOZE.exec(c.cloze);
    if (!m || natureOf(m[1]) !== nature) continue;
    const k = foldKey(m[1]);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    candidates.push(m[1]);
  }
  if (candidates.length < 2) return undefined;
  return { text: containsAnswer(card.term, answer) ? text : head(card.term, text, lang), answer, candidates };
}

// ---------------------------------------------------------------------------
// Ce qu'on génère pour chaque carte : la même décision dans les trois langues.

interface LangCards {
  byId: ReadonlyMap<string, Card>;
  bySubject: ReadonlyMap<string, Card[]>;
}

const LANG_CARDS: Partial<Record<CardLang, LangCards>> = {};

function langCards(lang: CardLang): LangCards {
  let lc = LANG_CARDS[lang];
  if (!lc) {
    const cards = localizedCards(lang);
    const bySubject = new Map<string, Card[]>();
    for (const c of cards) {
      const list = bySubject.get(c.subject);
      if (list) list.push(c);
      else bySubject.set(c.subject, [c]);
    }
    lc = { byId: new Map(cards.map((c) => [c.id, c])), bySubject };
    LANG_CARDS[lang] = lc;
  }
  return lc;
}

const PLAN = new Map<string, boolean>();

/**
 * Pose-t-on cette carte dans ce sens ? Oui seulement si c'est possible dans
 * les trois langues (une carte inconnue du contenu, dans un test, n'est jugée
 * que dans sa langue).
 */
function planned(kind: 'term' | 'cloze', card: Card, subjectCards: readonly Card[], lang: CardLang): boolean {
  const ok = (c: Card, subject: readonly Card[], l: CardLang) =>
    kind === 'term' ? termPromptOk(shownDefinition(c, l).text) : clozeParts(c, subject, l) !== undefined;
  if (!ok(card, subjectCards, lang)) return false;
  const key = `${kind}\u0000${card.id}`;
  let res = PLAN.get(key);
  if (res === undefined) {
    res = true;
    for (const l of LANGS) {
      if (l === lang) continue;
      const lc = langCards(l);
      const other = lc.byId.get(card.id);
      if (other && !ok(other, lc.bySubject.get(other.subject) ?? [], l)) res = false;
    }
    PLAN.set(key, res);
  }
  return res;
}

// ---------------------------------------------------------------------------
// Distracteurs.

/**
 * Cartes qu'on ne propose jamais comme distracteur d'une carte donnée, parce
 * qu'un apprenant pourrait légitimement les confondre (« Domain Authority »
 * et « Domain Rating »…). Construit par tools/build_confusables.py.
 */
const CONFUSABLES: Record<string, readonly string[]> = confusablesJson as Record<string, string[]>;

export function isConfusable(a: string, b: string): boolean {
  return CONFUSABLES[a]?.includes(b) ?? false;
}

interface Candidate {
  card: Card;
  /** 0 : même sous-thème ou même unité ; 10 : reste de la matière (repli) ; 100 : dernier recours. */
  tier: number;
}

interface Tier {
  tier: number;
  /** Construit à la demande : on ne parcourt la matière entière que si les paliers proches ne suffisent pas. */
  cards: () => readonly Card[];
}

const BY_TOPIC = new WeakMap<readonly Card[], Map<string, Card[]>>();

function byTopic(subjectCards: readonly Card[]): Map<string, Card[]> {
  let m = BY_TOPIC.get(subjectCards);
  if (!m) {
    m = new Map();
    for (const c of subjectCards) {
      const list = m.get(c.topic);
      if (list) list.push(c);
      else m.set(c.topic, [c]);
    }
    BY_TOPIC.set(subjectCards, m);
  }
  return m;
}

/**
 * Le même sous-thème s'il a assez de cartes, sinon les sous-thèmes de
 * l'unité, puis le reste de la matière. Les cartes confondables sont exclues.
 */
function distractorTiers(card: Card, unitTopics: ReadonlySet<string>, subjectCards: readonly Card[]): Tier[] {
  const ok = (c: Card) => c.id !== card.id && !isConfusable(card.id, c.id);
  const topics = byTopic(subjectCards);
  const t0 = (topics.get(card.topic) ?? []).filter(ok);
  const t1 = [...unitTopics].filter((t) => t !== card.topic).flatMap((t) => (topics.get(t) ?? []).filter(ok));
  const rest = () => subjectCards.filter((c) => c.topic !== card.topic && !unitTopics.has(c.topic) && ok(c));
  if (t0.length >= 6) return [{ tier: 0, cards: () => t0 }, { tier: 100, cards: () => [...t1, ...rest()] }];
  if (t0.length + t1.length >= 6) return [{ tier: 0, cards: () => [...t0, ...t1] }, { tier: 100, cards: rest }];
  return [{ tier: 0, cards: () => [...t0, ...t1] }, { tier: 10, cards: rest }];
}

const RANK_SAMPLE = 48;

/** Tire n éléments : mélange déterministe, puis les mieux classés d'abord, en sautant ceux que `accept` refuse. */
function pickRanked<T>(items: readonly T[], n: number, rng: () => number, rank: (t: T) => number, accept: (t: T) => boolean): T[] {
  // Mélange de Fisher-Yates limité aux RANK_SAMPLE premières places : le reste ne sert qu'en dernier recours.
  const shuffled = [...items];
  for (let i = 0; i < Math.min(RANK_SAMPLE, shuffled.length - 1); i += 1) {
    const j = i + Math.floor(rng() * (shuffled.length - i));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // On ne classe qu'un échantillon (déjà mélangé) : assez pour trouver de bons distracteurs, sans tout parcourir.
  const ranked = shuffled
    .slice(0, RANK_SAMPLE)
    .map((t, i) => ({ t, r: rank(t), i }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.t);
  const out: T[] = [];
  for (const t of [...ranked, ...shuffled.slice(RANK_SAMPLE)]) {
    if (out.length >= n) break;
    if (accept(t)) out.push(t);
  }
  return out;
}

/** Comme pickRanked, palier par palier : on ne va chercher plus loin que si le palier précédent ne suffit pas. */
function pickTiered(tiers: readonly Tier[], n: number, rng: () => number, rank: (c: Candidate) => number, accept: (c: Candidate) => boolean): Card[] {
  const out: Card[] = [];
  for (const { tier, cards } of tiers) {
    if (out.length >= n) break;
    const group = cards().map((card) => ({ card, tier }));
    out.push(...pickRanked(group, n - out.length, rng, rank, accept).map((c) => c.card));
  }
  return out;
}

const STEMS = new Map<string, ReadonlySet<string>>();

/** Racines des mots significatifs (6 premières lettres), pour repérer un mot partagé. */
function stemsOf(text: string): ReadonlySet<string> {
  let out = STEMS.get(text);
  if (!out) {
    const set = new Set<string>();
    for (const w of foldKey(text).split(' ')) {
      if (w.length < 4 || STOP.has(w)) continue;
      set.add(w.length > 6 ? w.slice(0, 6) : w.replace(/s$/, ''));
    }
    STEMS.set(text, set);
    out = set;
  }
  return out;
}

function sharesStem(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  for (const s of a) if (b.has(s)) return true;
  return false;
}

const HEADS = new Map<string, string | undefined>();

/** Premier mot significatif du terme : « Lien mort » → « lien ». */
function headWord(term: string): string | undefined {
  if (!HEADS.has(term)) {
    HEADS.set(
      term,
      foldKey(termBase(term))
        .split(' ')
        .find((w) => w.length >= 3 && !STOP.has(w)),
    );
  }
  return HEADS.get(term);
}

/** « IA » / « AI » dans un terme : un distracteur qui l'a aussi empêche d'éliminer à vue. */
function genericTag(term: string): string | undefined {
  return /(?:^|[^A-Za-z])(IA|AI)(?:[^A-Za-z]|$)/.exec(term)?.[1];
}

function lengthRatio(a: number, b: number): number {
  return Math.max(a, b) / Math.max(1, Math.min(a, b));
}

// ---------------------------------------------------------------------------
// Mode tapé.

/** Réponse tapée : le terme, ses formes courtes (sigle entre parenthèses) et le terme anglais. Rien pour un terme composé ou trop long. */
function typedFor(card: Card, lang: CardLang, trailing: string | undefined): QcmExercise['typed'] {
  if (isCompoundTerm(card.term)) return undefined;
  const base = termBase(card.term);
  const shortForms = termParens(card.term).filter((p) => !/,\s/.test(p) && p.length <= MAX_TYPED);
  if (base.length > MAX_TYPED && shortForms.length === 0) return undefined;
  const accept: string[] = [...(base.length <= MAX_TYPED ? [base] : []), ...shortForms];
  if (lang !== 'en') {
    const en = enTermOf(card.id);
    if (en && !isCompoundTerm(en)) {
      accept.push(en, termBase(en));
      for (const p of termParens(en)) if (isAcronym(p)) accept.push(p);
    }
  }
  if (trailing && !/,\s/.test(trailing)) accept.push(trailing);
  const seen = new Set([foldKey(card.term)]);
  const unique = accept.filter((a) => {
    const k = foldKey(a);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return unique.length > 0 ? { answer: card.term, accept: unique } : { answer: card.term };
}

function explainFor(card: Card, texts: GenTexts, lang: CardLang): string {
  const text = head(card.term, explainDefinition(card.term, card.definition), lang);
  return card.example ? `${text}\n\n${texts.example(card.example)}` : text;
}

// ---------------------------------------------------------------------------

export function generateExercises(
  unit: Unit,
  unitCards: readonly Card[],
  subjectCards: readonly Card[],
  texts: GenTexts = GEN_TEXTS_FR,
): Exercise[] {
  const lang: CardLang = texts.lang ?? 'fr';
  const rng = mulberry32(hashString(unit.id));
  const out: Exercise[] = [];
  const unitTopics = new Set(unitCards.map((c) => c.topic));

  unitCards.forEach((card, index) => {
    const pool = distractorTiers(card, unitTopics, subjectCards);
    const shown = shownDefinition(card, lang);
    // On alterne les deux sens : terme → définition, définition → terme.
    if (index % 2 === 0) {
      const mine = shownDefinition(card, lang, 'choice').text;
      const termStems = stemsOf(termBase(card.term));
      const hinted = sharesStem(termStems, stemsOf(mine));
      const rank = ({ card: c, tier }: Candidate) => {
        const text = shownDefinition(c, lang, 'choice').text;
        let r = tier;
        if (lengthRatio(text.length, mine.length) > 1.4) r += 1;
        if (hinted && !sharesStem(termStems, stemsOf(text))) r += 2;
        return r;
      };
      // Pas deux fois la même définition ni deux homonymes (cartes en double du deck).
      const keys = (c: Card) => [foldKey(shownDefinition(c, lang, 'choice').text), `term:${foldKey(termBase(c.term))}`];
      const taken = new Set(keys(card));
      const wrong = pickTiered(pool, 3, rng, rank, ({ card: c }) => {
        if (c.definition === card.definition || keys(c).some((k) => taken.has(k))) return false;
        for (const k of keys(c)) taken.add(k);
        return true;
      });
      const qcm: QcmExercise = {
        kind: 'qcm',
        key: `${unit.id}:def:${card.id}`,
        unitId: unit.id,
        cardId: card.id,
        prompt: texts.whatMeans(card.term),
        choices: [mine, ...wrong.map((c) => shownDefinition(c, lang, 'choice').text)],
        answer: 0,
        explain: explainFor(card, texts, lang),
      };
      out.push(qcm);
    } else if (planned('term', card, subjectCards, lang)) {
      const defStems = stemsOf(shown.text);
      const myHead = headWord(card.term);
      const myGeneric = genericTag(card.term);
      const hinted = sharesStem(stemsOf(card.term), defStems);
      const rank = ({ card: c, tier }: Candidate) => {
        const sameHead = myHead !== undefined && headWord(c.term) === myHead;
        const sameTag = myGeneric !== undefined && genericTag(c.term) === myGeneric;
        const alike = sameHead || sameTag || (hinted && sharesStem(stemsOf(c.term), defStems));
        return tier + (alike ? 0 : 1) + (lengthRatio(c.term.length, card.term.length) > 2.5 ? 0.5 : 0);
      };
      const taken = new Set([foldKey(card.term), foldKey(termBase(card.term))]);
      const wrong = pickTiered(pool, 3, rng, rank, ({ card: c }) => {
        const ks = [foldKey(c.term), foldKey(termBase(c.term))];
        if (ks.some((k) => taken.has(k))) return false;
        for (const k of ks) taken.add(k);
        return true;
      });
      const typed = typedFor(card, lang, shown.trailing);
      const qcm: QcmExercise = {
        kind: 'qcm',
        key: `${unit.id}:term:${card.id}`,
        unitId: unit.id,
        cardId: card.id,
        prompt: `${texts.whichTerm}\n\n${shown.text}`,
        choices: [card.term, ...wrong.map((c) => c.term)],
        answer: 0,
        explain: explainFor(card, texts, lang),
        ...(typed ? { typed } : {}),
      };
      out.push(qcm);
    }

    if (card.cloze && planned('cloze', card, subjectCards, lang)) {
      const parts = clozeParts(card, subjectCards, lang);
      if (parts) {
        out.push({
          kind: 'cloze',
          key: `${unit.id}:cloze:${card.id}`,
          unitId: unit.id,
          cardId: card.id,
          text: parts.text,
          answer: parts.answer,
          bank: pickRanked(parts.candidates, 3, rng, () => 0, () => true),
          explain: explainFor(card, texts, lang),
        });
      }
    }
  });

  // Associations par groupes de 4 (le dernier groupe peut en avoir 3).
  for (let i = 0; i + 3 <= unitCards.length; i += 4) {
    const group = unitCards.slice(i, i + 4);
    const match: MatchExercise = {
      kind: 'match',
      key: `${unit.id}:match:${i / 4}`,
      unitId: unit.id,
      prompt: texts.match,
      pairs: group.map((c) => ({ left: c.term, right: matchDefinition(c, lang) })),
    };
    out.push(match);
  }

  return out;
}
