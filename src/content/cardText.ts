/**
 * Mise en forme des textes de cartes pour les exercices générés.
 *
 * Une définition du deck commence souvent par répéter son terme ou par le
 * développement du sigle (« Key Performance Indicator: … », « Retour sur
 * investissement (Return on Investment) : … ») et finit parfois par le terme
 * anglais entre parenthèses (« … (reach). »). Dans un QCM ou une association,
 * ces morceaux donnent la réponse. Ce module les repère, dans les trois
 * langues, et les retire ou les masque (« ___ »).
 *
 * Tout est déterministe et ne dépend que du texte de la carte.
 */

export type CardLang = 'fr' | 'en' | 'es';

export const MASK = '___';

/** Mots de liaison sautés quand on cherche le développement d'un sigle. */
const LINK = new Set('of to on for and the from with by in as at de du des la le d per y del en et a à par sur pour por para con'.split(' '));
const DIGIT: Record<string, readonly string[]> = { '2': ['to', 'two', 'a', 'de'], '4': ['for', 'four', 'pour', 'para'] };
/** Sigles trop génériques pour être masqués (« modèles d'IA »). */
const GENERIC_ACRONYMS = new Set(['IA', 'AI']);
/** Mots vides des trois langues. */
export const STOP = new Set(
  (
    'le la les l un une des du de d et ou a au aux en dans par pour sur avec sans ce cet cette ces son sa ses ton ta tes qui que quoi est sont ' +
    'the a an of and or to in on for with by from at as is are be your its it this that which what ' +
    'el la los las lo un una unos unas de del y o en por para con sin su sus tu tus que es son al se como'
  ).split(' '),
);

const WORD = /[A-Za-z0-9À-ɏ]+/g;
const ACRO = /^[A-Z0-9][A-Z0-9&.-]{1,7}s?$/;

// ---------------------------------------------------------------------------
// Repliement (minuscules, sans accents) avec correspondance des positions.

interface Folded {
  text: string;
  /** map[i] = position dans le texte d'origine du caractère replié i (map[text.length] = longueur d'origine). */
  map: number[];
}

function foldChar(c: string): string {
  const code = c.charCodeAt(0);
  if (code < 128) {
    if (code >= 65 && code <= 90) return String.fromCharCode(code + 32);
    return c === '-' ? ' ' : c; // « line-height » = « line height »
  }
  if (c === '’' || c === '‘') return "'";
  if (c === 'œ' || c === 'Œ') return 'oe';
  if (c === 'æ' || c === 'Æ') return 'ae';
  return c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function fold(s: string): Folded {
  if (/^[\x00-\x7f]*$/.test(s)) {
    const map = new Array<number>(s.length + 1);
    for (let i = 0; i <= s.length; i += 1) map[i] = i;
    return { text: s.toLowerCase().replace(/-/g, ' '), map };
  }
  const parts: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < s.length; i += 1) {
    const f = foldChar(s[i]);
    for (let k = 0; k < f.length; k += 1) map.push(i);
    parts.push(f);
  }
  map.push(s.length);
  return { text: parts.join(''), map };
}

const FOLDED_NEEDLES = new Map<string, string>();

function foldNeedle(s: string): string {
  let n = FOLDED_NEEDLES.get(s);
  if (n === undefined) {
    n = fold(s).text.trim();
    FOLDED_NEEDLES.set(s, n);
  }
  return n;
}

const FOLD_KEYS = new Map<string, string>();

/** Minuscules, sans accents, ponctuation réduite à des espaces. */
export function foldKey(s: string): string {
  let k = FOLD_KEYS.get(s);
  if (k === undefined) {
    k = fold(s)
      .text.replace(/[^a-z0-9]+/g, ' ')
      .trim();
    FOLD_KEYS.set(s, k);
  }
  return k;
}

const isAlnum = (ch: string | undefined): boolean => ch !== undefined && /[a-z0-9]/.test(ch);

export function isAcronym(t: string): boolean {
  return ACRO.test(t) && (t.match(/[A-Z]/g)?.length ?? 0) >= 2 && !GENERIC_ACRONYMS.has(t);
}

/** Sigle à casse mixte (« LoRA », « SaaS », « PMax ») : ses majuscules épellent un développement. */
function isMixedAcronym(t: string): boolean {
  return /^[A-Za-z0-9&-]{3,8}$/.test(t) && /^[A-Z]/.test(t) && (t.match(/[A-Z]/g)?.length ?? 0) >= 2 && /[a-z]/.test(t);
}

/**
 * Qualificatifs entre parenthèses à ne pas masquer : « Churn Rate (Formula) »
 * ne doit pas transformer « Formula: … » en « ___: … » dans sa définition.
 */
const QUALIFIERS = new Set(['formula', 'formule', 'simple']);

function isQualifier(p: string): boolean {
  const words = foldKey(p).split(' ').filter(Boolean);
  return words.length > 0 && words.every((w) => QUALIFIERS.has(w) || STOP.has(w));
}

/** Positions [début, fin) de `needle` dans `s`, en mots entiers (pluriel en s / x / es toléré). */
function findSpans(s: string, needle: string, folded: Folded = fold(s)): [number, number][] {
  const n = foldNeedle(needle);
  if (!n) return [];
  const hay = folded.text;
  const out: [number, number][] = [];
  let from = 0;
  for (;;) {
    const i = hay.indexOf(n, from);
    if (i < 0) break;
    from = i + 1;
    if (isAlnum(n[0]) && isAlnum(hay[i - 1])) continue;
    // Pas au milieu d'un mot composé : « box-shadow » ne contient pas « shadow ».
    const start = folded.map[i];
    if (isAlnum(n[0]) && s[start - 1] === '-') continue;
    let end = i + n.length;
    if (isAlnum(n[n.length - 1]) && isAlnum(hay[end])) {
      if (!/[a-z]/.test(n[n.length - 1]) || n.length < 3) continue;
      if (hay.startsWith('es', end) && !isAlnum(hay[end + 2])) end += 2;
      else if ((hay[end] === 's' || hay[end] === 'x') && !isAlnum(hay[end + 1])) end += 1;
      else continue;
    }
    // Dans un identifiant (« pd.to_datetime », « utm_source »), on masque l'identifiant entier, pas « to____ ».
    let a = start;
    let b = folded.map[end];
    if (s[a - 1] === '_' || s[b] === '_') {
      while (a > 0 && /[A-Za-z0-9_]/.test(s[a - 1])) a -= 1;
      while (b < s.length && /[A-Za-z0-9_]/.test(s[b])) b += 1;
    }
    out.push([a, b]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Variantes d'un terme : ce qu'il faut masquer dans sa définition.

const LIST_SEP = /\s*,\s+|\s+(?:et|and|y|ou|or|o|vs\.?|&)\s+|\s+\/\s+|\s?:\s/;

/**
 * Sépare un terme de ses parenthèses (imbrications comprises, mais pas les
 * parenthèses d'appel collées à un nom : « clamp() » reste entier).
 */
function parenGroups(term: string): { base: string; groups: string[] } {
  let base = '';
  let cur = '';
  let depth = 0;
  const groups: string[] = [];
  for (let i = 0; i < term.length; i += 1) {
    const c = term[i];
    if (depth === 0) {
      if (c === '(' && (i === 0 || /\s/.test(term[i - 1]))) {
        depth = 1;
        cur = '';
      } else base += c;
      continue;
    }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) {
        if (cur.trim()) groups.push(cur.trim());
        continue;
      }
    }
    cur += c;
  }
  if (depth > 0) base += `(${cur}`;
  return { base: base.replace(/\s+/g, ' ').trim() || term.trim(), groups };
}

/** Le terme sans ses parenthèses : « Dynamic Creative Optimization (DCO) » → « Dynamic Creative Optimization ». */
export function termBase(term: string): string {
  return parenGroups(term).base;
}

/** Le contenu des parenthèses d'un terme : « … (DCO) » → ['DCO'], « Taille fluide (clamp()) » → ['clamp()']. */
export function termParens(term: string): string[] {
  return parenGroups(term).groups;
}

/** Un terme composé (« A et B », « A, B et C », « A / B ») : rien à taper d'un seul mot. */
export function isCompoundTerm(term: string): boolean {
  return termBase(term).split(LIST_SEP).filter((p) => p.trim()).length >= 2;
}

export interface TermVariants {
  /** Le terme de la carte, sans parenthèses. */
  term: string;
  /** Formes à masquer, de la plus longue à la plus courte. */
  forms: string[];
  /** Sigles dont on cherche aussi le développement. */
  acronyms: string[];
  /** Mots-valises (« Regex » = « Regular Expression ») dont on masque aussi la forme longue. */
  blends: string[];
  /** Morceaux d'un terme composé, inclus dans `forms`. */
  pieces: string[];
}

/** Toutes les formes sous lesquelles le terme (et ses équivalents `extra`, ex. le terme anglais) peut apparaître. */
/**
 * `context` : la définition de la carte. Un sigle entre parenthèses dont le
 * développement y figure (« CMP : Consent Management Platform ») est bien
 * celui du terme.
 */
export function termVariants(term: string, extra: readonly string[] = [], context = ''): TermVariants {
  const raw: string[] = [];
  const add = (v: string) => {
    const t = v.trim();
    if (!t) return;
    raw.push(t);
    const call = /^(.+)\(\)$/.exec(t);
    if (call) {
      raw.push(call[1]);
      const seg = call[1].split('.').pop() ?? '';
      if (seg.length >= 4 && seg !== call[1]) raw.push(seg);
    }
    const tag = /^<([\w-]+)>$/.exec(t);
    if (tag) raw.push(`<${tag[1]}`);
    if (/^@\w{4,}/.test(t)) addPiece(t.slice(1)); // « @dataclass » → « dataclass(es) » (seulement dans « Quel terme… ? »)
  };
  // Un sigle entre parenthèses n'est masqué que s'il abrège le terme (« Dynamic Creative Optimization (DCO) ») :
  // dans « Taux de rebond (GA4) », GA4 est un contexte, et « Dans ___, le pourcentage… » serait absurde.
  const bases = [term, ...extra].filter(Boolean).map(termBase);
  const abbreviates = (acro: string) => [...bases, context].some((b) => expansionSpans(b, acro).length > 0);
  // Morceaux d'un terme composé (« A, B et C ») : masqués dans « Quel terme… ? », pas dans les choix de « Que signifie… ? ».
  const pieceRaw: string[] = [];
  const addPiece = (v: string) => {
    const before = raw.length;
    add(v);
    pieceRaw.push(...raw.splice(before));
  };
  for (const t of [term, ...extra]) {
    if (!t) continue;
    add(t);
    const base = termBase(t);
    add(base);
    add(base.replace(/\s+[^\w\s]+$/, '')); // « dict {} » → « dict »
    for (const p of termParens(t)) {
      if (isQualifier(p)) continue; // « (formule) », « (avancé) » : pas le terme lui-même
      if ((isAcronym(p) || isMixedAcronym(p) || GENERIC_ACRONYMS.has(p)) && !abbreviates(p)) continue;
      add(p);
      for (const q of p.split(LIST_SEP)) addPiece(q);
    }
    // Morceaux de code ou noms de marque dans un terme en prose : « Balise <picture> », « Lien DoFollow ».
    const compound = base.split(LIST_SEP).length >= 2;
    for (const raw0 of base.split(/\s+/)) {
      const tok = raw0.replace(/[,;]$/, '');
      if (tok === base) continue;
      if (/^(?:<[\w-]+>|[\w.]+\(\)|@\w{3,}|:[\w-]{3,}\(?\)?)$/.test(tok) || /^[A-Z]?[a-z]+[A-Z][A-Za-z]+$/.test(tok)) {
        if (compound) addPiece(tok);
        else add(tok);
      }
    }
    const pieces = base.split(LIST_SEP);
    if (pieces.length >= 2) for (const p of pieces) addPiece(p);
    // Les sigles restent masqués même dans un terme composé : « JSON » donnerait « Objet et JSON ».
    for (const tok of base.split(/[\s()/,:]+/)) if (tok !== t && isAcronym(tok)) add(tok);
  }
  const mainKeys = new Set(raw.map((v) => fold(v).text));
  raw.push(...pieceRaw);
  const seen = new Set<string>();
  const forms: string[] = [];
  for (const v of raw) {
    const key = fold(v).text;
    if (seen.has(key)) continue;
    const alnum = key.replace(/[^a-z0-9]/g, '');
    if (alnum.length < 3 && !isAcronym(v)) continue;
    if (GENERIC_ACRONYMS.has(v)) continue;
    seen.add(key);
    forms.push(v);
  }
  forms.sort((a, b) => b.length - a.length);
  const blends = bases.filter((b) => /^[A-Za-z]{4,10}$/.test(b) && !isAcronym(b) && !isMixedAcronym(b));
  const pieces = forms.filter((f) => !mainKeys.has(fold(f).text));
  return { term: termBase(term), forms, acronyms: forms.filter((f) => isAcronym(f) || isMixedAcronym(f)), blends, pieces };
}

interface Tok {
  t: string;
  start: number;
  end: number;
}

/**
 * Les mots à partir de toks[j] épellent-ils letters[k…] ? Un mot peut couvrir
 * plusieurs lettres quand c'est un sigle (« AI » dans « Reinforcement Learning
 * from AI Feedback ») ou le dernier mot (« Funnel » pour le « FU » de MOFU) ;
 * les mots de liaison peuvent être sautés ou compter (« of » dans MOFU).
 */
function spell(toks: readonly Tok[], letters: readonly string[], j: number, k: number, caps: number, started: boolean): { last: number; caps: number } | undefined {
  if (k === letters.length) return { last: j - 1, caps };
  if (j >= toks.length) return undefined;
  const t = toks[j].t;
  const cap = /[A-Z\u00C0-\u00DE]/.test(t[0]) ? 1 : 0;
  const rest = letters.slice(k).join('');
  if (t.length >= 2 && /^[A-Z0-9]+$/.test(t) && rest.toUpperCase().startsWith(t)) {
    const r = spell(toks, letters, j + 1, k + t.length, caps + 1, true);
    if (r) return r;
  }
  const L = letters[k];
  const ok = /\d/.test(L) ? (DIGIT[L] ?? []).includes(t.toLowerCase()) || t === L : foldChar(t[0]).toUpperCase() === L.toUpperCase();
  if (ok) {
    const r = spell(toks, letters, j + 1, k + 1, caps + cap, true);
    if (r) return r;
    if (started && rest.length >= 2 && rest.length <= 3 && fold(t).text.startsWith(rest.toLowerCase())) return { last: j, caps: caps + cap };
  }
  if (started && LINK.has(t.toLowerCase())) return spell(toks, letters, j + 1, k, caps, true);
  return undefined;
}

/** Le développement d'un sigle dans le texte (« Key Performance Indicator » pour KPI), en positions d'origine. */
function expansionSpans(text: string, acro: string): [number, number][] {
  let letters = acro.split('').filter((c) => (isMixedAcronym(acro) ? /[A-Z0-9]/ : /[A-Za-z0-9]/).test(c));
  if (acro.endsWith('s') && /^[A-Z0-9]+s$/.test(acro)) letters = letters.slice(0, -1);
  if (letters.length < 2) return [];
  const toks: Tok[] = [...text.matchAll(WORD)].map((m) => ({ t: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  const out: [number, number][] = [];
  for (let i = 0; i < toks.length; i += 1) {
    const r = spell(toks, letters, i, 0, 0, false);
    if (!r || r.last < i) continue;
    if (r.caps >= Math.max(2, letters.length - 1) || (letters.length >= 3 && r.caps >= 2)) {
      out.push([toks[i].start, toks[r.last].end]);
      i = r.last;
    }
  }
  return out;
}

/** « Regular Expression » pour « Regex » : le mot se forme avec le début de mots consécutifs (2 lettres au moins chacun). */
function blendSpans(text: string, word: string): [number, number][] {
  const w = word.toLowerCase();
  const toks: Tok[] = [...text.matchAll(WORD)].map((m) => ({ t: fold(m[0]).text, start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  const from = (j: number, pos: number, n: number): number => {
    if (pos === w.length) return n >= 2 ? j - 1 : -1;
    if (j >= toks.length) return -1;
    for (let k = Math.min(toks[j].t.length, w.length - pos); k >= 2; k -= 1) {
      if (toks[j].t.slice(0, k) !== w.slice(pos, pos + k)) continue;
      const r = from(j + 1, pos + k, n + 1);
      if (r >= 0) return r;
    }
    return -1;
  };
  const out: [number, number][] = [];
  for (let i = 0; i < toks.length; i += 1) {
    const last = from(i, 0, 0);
    if (last > i) {
      out.push([toks[i].start, toks[last].end]);
      i = last;
    }
  }
  return out;
}

function spansOf(text: string, v: TermVariants): [number, number][] {
  const folded = fold(text);
  const spans: [number, number][] = [];
  for (const f of v.forms) spans.push(...findSpans(text, f, folded));
  for (const a of v.acronyms) spans.push(...expansionSpans(text, a));
  for (const b of v.blends) spans.push(...blendSpans(text, b));
  spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: [number, number][] = [];
  for (const s of spans) {
    const lastSpan = merged[merged.length - 1];
    if (lastSpan && s[0] <= lastSpan[1]) lastSpan[1] = Math.max(lastSpan[1], s[1]);
    else merged.push([s[0], s[1]]);
  }
  return merged;
}

/** Le texte cite-t-il le terme (ou son sigle, son développement) ? */
export function mentionsTerm(text: string, v: TermVariants): boolean {
  return spansOf(text, v).length > 0;
}

/** Remplace chaque mention du terme par « ___ ». */
export function maskTerm(text: string, v: TermVariants): string {
  const spans = spansOf(text, v);
  if (spans.length === 0) return text;
  let out = '';
  let at = 0;
  for (const [s, e] of spans) {
    out += text.slice(at, s) + MASK;
    at = e;
  }
  out += text.slice(at);
  // « ___ (___) », « ___/___ » → un seul trou.
  return out.replace(/___(?:\s*[(/-]?\s*___(?:\s*\))?)+/g, MASK).replace(/\(\s*___\s*\)/g, MASK);
}

// ---------------------------------------------------------------------------
// Découpage « amorce : corps » et nettoyage de la définition affichée.

/** Parenthèses, accolades, crochets et guillemets équilibrés : « @media (prefers-color-scheme » n'est pas une amorce. */
function balanced(s: string): boolean {
  const count = (re: RegExp) => s.match(re)?.length ?? 0;
  return count(/\(/g) === count(/\)/g) && count(/\{/g) === count(/\}/g) && count(/\[/g) === count(/\]/g) && count(/"/g) % 2 === 0 && count(/«/g) === count(/»/g);
}

function wordCount(s: string): number {
  return s.match(WORD)?.length ?? 0;
}

/**
 * Sépare l'amorce qui répète le terme ou développe le sigle (« Click-Through
 * Rate: », « Balise canonique : », « Business to Business. ») du reste de la
 * définition. L'amorce est retirée quelle que soit sa longueur.
 */
export function splitLead(definition: string, v: TermVariants): { lead: string; body: string } {
  let body = definition.trim();
  const leads: string[] = [];
  for (let pass = 0; pass < 2; pass += 1) {
    const colon = /^([^\n]{1,160}?)\s?:\s+(?=\S)/.exec(body);
    if (colon) {
      const prefix = colon[1];
      const rest = body.slice(colon[0].length);
      const shortEnough = wordCount(prefix) <= 7 || /^[^()]+\([^()]+\)$/.test(prefix.trim());
      const clean = !/[.!?]\s/.test(prefix) && !/https?$/.test(prefix) && balanced(prefix) && rest.length >= 15;
      // Pour un sigle, une courte amorce en majuscule est son développement ou sa traduction (« Valeur vie client (Lifetime Value) : »).
      const acronymLead = v.acronyms.length > 0 && v.forms.length > 0 && v.acronyms.includes(v.term) && /^[A-Z\u00C0-\u00DE]/.test(prefix) && wordCount(prefix) <= 8;
      if (clean && ((shortEnough && mentionsTerm(prefix, v)) || acronymLead)) {
        leads.push(prefix.trim());
        body = rest;
        continue;
      }
    }
    const sentence = /^([^.:!?\n]{2,90})\.\s+(?=\S)/.exec(body);
    if (sentence) {
      const s = sentence[1];
      const rest = body.slice(sentence[0].length);
      const spans = spansOf(s, v);
      const covered = spans.reduce((n, [a, b]) => n + wordCount(s.slice(a, b)), 0);
      const outside = wordCount(s.replace(/\([^()]*\)/g, '')) - covered;
      if (spans.length > 0 && outside <= 0 && rest.length >= 15) {
        leads.push(s.trim());
        body = rest;
        continue;
      }
    }
    break;
  }
  return { lead: leads.join(' '), body };
}

/** Retire la parenthèse finale qui ne fait que redonner le terme (« … (reach). »). Renvoie aussi son contenu. */
export function stripTrailingTerm(text: string, v: TermVariants): { text: string; removed?: string } {
  const m = /\s*\(([^()]{2,80})\)(\s*[.!?]?\s*)$/.exec(text);
  if (!m || !mentionsTerm(m[1], v)) return { text };
  return { text: text.slice(0, m.index) + m[2].trim(), removed: m[1].trim() };
}

function capitalise(text: string): string {
  return /^[a-zß-ÿ][a-zß-ÿ]*(?:[\s'’,]|$)/.test(text) ? text[0].toUpperCase() + text.slice(1) : text;
}

function withPeriod(text: string): string {
  const t = text.replace(/[\s,;:]+$/, '');
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

/** Longueur utile : sans les trous, les espaces et la ponctuation. */
export function usefulLength(text: string): number {
  return text.replace(/___/g, '').replace(/[^A-Za-z0-9À-ɏ]/g, '').length;
}

export interface DisplayedDefinition {
  /** La définition affichée : sans amorce, sans parenthèse finale redondante, terme masqué, majuscule et point final. */
  text: string;
  /** Amorce retirée (développement du sigle, terme répété). */
  lead: string;
  /** Parenthèse finale retirée (le terme anglais, en général). */
  trailing?: string;
}

/** La définition telle qu'on la montre dans un QCM (choix ou énoncé) : même traitement pour la bonne réponse et les distracteurs. */
/** Sans les morceaux d'un terme composé : pour les choix de « Que signifie… ? », où le terme est déjà affiché. */
export function wholeTermOnly(v: TermVariants): TermVariants {
  if (v.pieces.length === 0) return v;
  const keep = (f: string) => !v.pieces.includes(f);
  return { ...v, forms: v.forms.filter(keep), acronyms: v.acronyms.filter(keep), pieces: [] };
}

export function displayDefinition(definition: string, v: TermVariants): DisplayedDefinition {
  const { lead, body } = splitLead(definition, v);
  const stripped = stripTrailingTerm(body, v);
  const text = withPeriod(capitalise(maskTerm(stripped.text, v).replace(/\s+/g, ' ').trim()));
  return { text, lead, trailing: stripped.removed };
}

/** Définition complète pour l'explication, sans l'amorce qui ne ferait que répéter le terme (« Balise canonique : »). */
export function explainDefinition(term: string, definition: string): string {
  const v = termVariants(term, [], definition);
  const { lead, body } = splitLead(definition, v);
  if (!lead) return definition;
  const same = v.forms.some((f) => foldKey(f) === foldKey(lead.replace(/\([^()]*\)/g, '')));
  return same ? capitalise(body) : definition;
}

/**
 * Coupe un texte pour une carte d'association : de préférence à une fin de
 * phrase, sinon à un espace, sans « … » après une ponctuation.
 */
export function truncate(text: string, max = 90, minUseful = 40): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const re = /[.!?](?=\s+[A-ZÀ-Þ0-9«"“_¿¡])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const end = m.index + 1;
    if (end > max + 25) break;
    if (usefulLength(t.slice(0, end)) >= minUseful) return t.slice(0, end);
  }
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  let s = cut.slice(0, lastSpace > minUseful ? lastSpace : max);
  s = s.replace(/[\s,;:.!?(«"“'’-]+$/, '');
  s = s.replace(/\s+(?:de|du|des|la|le|les|l'|d'|un|une|et|ou|à|au|aux|en|the|a|an|of|and|or|to|in|el|los|las|y|o|con|por|para|que|with|for)$/i, '');
  s = s.replace(/[\s,;:.!?(«"“'’-]+$/, '');
  return `${s}…`;
}
