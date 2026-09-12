/**
 * Types du domaine.
 *
 * Ce module, comme tout src/game/, ne dépend NI de React, NI d'Expo,
 * NI d'AsyncStorage. Il ne fait que transformer un état en un autre état.
 *
 * Le moteur ne connaît pas les matières par leur nom : il reçoit un
 * `Catalog` (la liste ordonnée des unités de chaque matière) et des
 * `Exercise` rattachés à une unité. Le contenu vit dans src/content/.
 */

/** Jour local au format "2026-09-09". Jamais un instant, jamais UTC. */
export type DayKey = string;

/** Instant ISO 8601. */
export type IsoDate = string;

/** Générateur injectable — permet des tests déterministes. */
export type Rng = () => number;

/** "marketing", "ia", "python", "web"… */
export type SubjectId = string;

/** "marketing/seo-1". Unique sur tout le catalogue. */
export type UnitId = string;

// ---------------------------------------------------------------------------
// Catalogue : le squelette du chemin, sans les titres ni les exercices.
// ---------------------------------------------------------------------------

export interface CatalogUnit {
  id: UnitId;
  subjectId: SubjectId;
  /** Position dans le chemin de la matière, à partir de 0. */
  index: number;
}

export interface Catalog {
  units: readonly CatalogUnit[];
}

/** Construit un catalogue : l'ordre d'apparition fixe l'index dans chaque matière. */
export function catalogFrom(
  units: readonly { id: UnitId; subjectId: SubjectId }[],
): Catalog {
  const counters = new Map<SubjectId, number>();
  const out: CatalogUnit[] = [];
  for (const unit of units) {
    const index = counters.get(unit.subjectId) ?? 0;
    counters.set(unit.subjectId, index + 1);
    out.push({ id: unit.id, subjectId: unit.subjectId, index });
  }
  return { units: out };
}

export function subjectIds(catalog: Catalog): SubjectId[] {
  const seen = new Set<SubjectId>();
  const out: SubjectId[] = [];
  for (const unit of catalog.units) {
    if (!seen.has(unit.subjectId)) {
      seen.add(unit.subjectId);
      out.push(unit.subjectId);
    }
  }
  return out;
}

/** Les unités d'une matière, dans l'ordre du chemin. */
export function subjectUnits(catalog: Catalog, subjectId: SubjectId): CatalogUnit[] {
  return catalog.units
    .filter((u) => u.subjectId === subjectId)
    .sort((a, b) => a.index - b.index);
}

export function findUnit(catalog: Catalog, unitId: UnitId): CatalogUnit | undefined {
  return catalog.units.find((u) => u.id === unitId);
}

/** L'unité qui précède `unitId` dans son chemin ; `null` pour la première ou une inconnue. */
export function previousUnit(catalog: Catalog, unitId: UnitId): CatalogUnit | null {
  const unit = findUnit(catalog, unitId);
  if (unit === undefined || unit.index === 0) return null;
  return subjectUnits(catalog, unit.subjectId)[unit.index - 1];
}

// ---------------------------------------------------------------------------
// Exercices : ce qui est posé à l'utilisateur.
// ---------------------------------------------------------------------------

export interface ExerciseBase {
  /** Clé stable, unique sur tout le contenu. La progression y est rattachée. */
  key: string;
  unitId: UnitId;
  /** Affiché après la réponse, juste ou fausse. */
  explain?: string;
  source?: { title: string; url: string };
}

export interface CodeBlock {
  lang: 'python' | 'html' | 'css' | 'js' | 'text';
  src: string;
}

/** Choix multiple, 2 à 4 propositions (2 = vrai/faux). */
export interface QcmExercise extends ExerciseBase {
  kind: 'qcm';
  prompt: string;
  code?: CodeBlock;
  choices: string[];
  /** Index de la bonne réponse. */
  answer: number;
}

/** Texte à trou : `text` contient un `___` à remplir depuis la banque de mots. */
export interface ClozeExercise extends ExerciseBase {
  kind: 'cloze';
  text: string;
  answer: string;
  /** Distracteurs, sans la bonne réponse. */
  bank: string[];
}

/** Associer chaque élément de gauche à son pendant de droite. */
export interface MatchExercise extends ExerciseBase {
  kind: 'match';
  prompt?: string;
  pairs: { left: string; right: string }[];
}

/** Remettre des étapes dans l'ordre. `steps` est l'ordre correct. */
export interface OrderExercise extends ExerciseBase {
  kind: 'order';
  prompt: string;
  steps: string[];
}

export interface CaseStep {
  prompt: string;
  choices: string[];
  answer: number;
  feedback: string;
}

/** Cas pratique : un scénario, plusieurs décisions. Juste si toutes le sont. */
export interface CaseExercise extends ExerciseBase {
  kind: 'case';
  title: string;
  scenario: string;
  steps: CaseStep[];
}

export type Exercise =
  | QcmExercise
  | ClozeExercise
  | MatchExercise
  | OrderExercise
  | CaseExercise;

export type ExerciseKind = Exercise['kind'];

// ---------------------------------------------------------------------------
// Progression : ce qui est persisté.
// ---------------------------------------------------------------------------

/** Nombre de couronnes d'une unité, 0..3. */
export type Traits = 0 | 1 | 2 | 3;

export interface QuestionProgress {
  key: string;
  seen: number;
  correct: number;
  /** Bonnes réponses CONSÉCUTIVES, plafonné à 3. */
  streak: number;
  lastAnswerCorrect: boolean | null;
  lastSeenAt: IsoDate | null;
  /**
   * Présence dans la file « À revoir ». Non dérivable des autres champs : une
   * question ayant fait faux puis juste et une question juste du premier coup
   * ont le même streak, et pourtant l'une est dans la file et l'autre non.
   */
  inReview: boolean;
}

export interface UnitProgress {
  unitId: UnitId;
  sessionsPlayed: number;
  bestScore: number;
  /** A déjà fait 10/10. Irréversible. */
  perfect: boolean;
  unlockedAt: IsoDate | null;
  /**
   * Verrou de la première couronne. Sa condition parle du score de la
   * DERNIÈRE session (≥ 6/10) tout en interdisant de redescendre sous 1 une
   * fois acquise : un prédicat recalculé ne peut pas tenir les deux promesses,
   * on latche donc l'acquisition.
   */
  firstTraitEarned: boolean;
  /** Animation de déverrouillage jouée (une seule fois). */
  unlockAnimationPlayed: boolean;
}

export interface StreakState {
  current: number;
  best: number;
  lastActiveDay: DayKey | null;
  /** Gels en réserve, 0..2. */
  freezes: number;
  freezeUsedOn: DayKey[];
}

/** État de répétition espacée d'une carte du deck (voir srs.ts). */
export interface CardState {
  id: string;
  phase: 'new' | 'learning' | 'review';
  /** Facteur de facilité, ×1000 pour rester entier (2500 = 250 %). */
  ease: number;
  intervalDays: number;
  /** Jour local à partir duquel la carte est due. */
  due: DayKey | null;
  reps: number;
  lapses: number;
  lastReviewedAt: IsoDate | null;
}

export interface AdsState {
  /** Sessions terminées depuis la dernière publicité. */
  sessionsSinceLastAd: number;
  lastAdAt: IsoDate | null;
  adsShown: number;
}

export interface Counters {
  sessionsCompleted: number;
  /** Questions sorties de la file de révision. */
  reviewRecovered: number;
  sourcesOpened: number;
  chronoPerfects: number;
  /** Nécessaires pour évaluer les badges depuis le seul état Progress. */
  perfectSessions: number;
  earlySessions: number;
  nightSessions: number;
  /** Cartes du deck révisées (toutes réponses confondues). */
  cardsReviewed: number;
}

export interface Progress {
  schemaVersion: 1;
  xp: number;
  questions: Record<string, QuestionProgress>;
  units: Record<string, UnitProgress>;
  cards: Record<string, CardState>;
  streak: StreakState;
  /** badgeId → date ISO d'obtention. */
  badges: Record<string, IsoDate>;
  counters: Counters;
  ads: AdsState;
}

export type SessionMode = 'unit' | 'review' | 'free' | 'deck';

export function emptyQuestionProgress(key: string): QuestionProgress {
  return {
    key,
    seen: 0,
    correct: 0,
    streak: 0,
    lastAnswerCorrect: null,
    lastSeenAt: null,
    inReview: false,
  };
}

export function emptyUnitProgress(unitId: UnitId): UnitProgress {
  return {
    unitId,
    sessionsPlayed: 0,
    bestScore: 0,
    perfect: false,
    unlockedAt: null,
    firstTraitEarned: false,
    unlockAnimationPlayed: false,
  };
}

export function emptyProgress(): Progress {
  return {
    schemaVersion: 1,
    xp: 0,
    questions: {},
    units: {},
    cards: {},
    streak: {
      current: 0,
      best: 0,
      lastActiveDay: null,
      freezes: 0,
      freezeUsedOn: [],
    },
    badges: {},
    counters: {
      sessionsCompleted: 0,
      reviewRecovered: 0,
      sourcesOpened: 0,
      chronoPerfects: 0,
      perfectSessions: 0,
      earlySessions: 0,
      nightSessions: 0,
      cardsReviewed: 0,
    },
    ads: { sessionsSinceLastAd: 0, lastAdAt: null, adsShown: 0 },
  };
}
