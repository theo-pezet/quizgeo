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

/** Objectif quotidien par défaut, en XP (« Régulier »). */
export const DEFAULT_DAILY_GOAL = 50;
export const DAILY_GOALS = [20, 50, 100, 200] as const;

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
  /** Carte du deck dont l'exercice est tiré : une erreur la replanifie. */
  cardId?: string;
  /**
   * Exercice « cœur de leçon » (lecture de code, prédiction de sortie) : servi
   * en priorité dans les leçons de l'unité, avant les exercices de vocabulaire.
   */
  priority?: boolean;
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
  /** Pourquoi chaque mauvais choix est faux, aligné sur `choices` (null pour la bonne réponse). */
  whyWrong?: (string | null)[];
  /** Sortie réelle du code, révélée après la réponse. */
  output?: string;
  /**
   * Variante « taper la réponse », posée à la place des choix quand l'unité
   * a déjà 3 couronnes : la maîtrise se prouve sans béquille. Même clé, même
   * progression — seule la présentation durcit.
   */
  typed?: { answer: string; accept?: string[] };
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

/** Repérer la ligne fautive d'un extrait de code. `answer` est l'index de la ligne. */
export interface BugLineExercise extends ExerciseBase {
  kind: 'bugline';
  prompt: string;
  lang: CodeBlock['lang'];
  lines: string[];
  answer: number;
}

/**
 * Assembler une ligne de code à partir de morceaux mélangés. `tokens` est la
 * solution dans l'ordre ; `extra` sont les intrus ajoutés à la banque.
 */
export interface ComposeExercise extends ExerciseBase {
  kind: 'compose';
  prompt: string;
  lang: CodeBlock['lang'];
  tokens: string[];
  extra: string[];
}

export type Exercise =
  | QcmExercise
  | ClozeExercise
  | MatchExercise
  | OrderExercise
  | CaseExercise
  | BugLineExercise
  | ComposeExercise;

export type ExerciseKind = Exercise['kind'];

// ---------------------------------------------------------------------------
// Progression : ce qui est persisté.
// ---------------------------------------------------------------------------

/**
 * Nombre de couronnes d'une unité, 0..5. Le chemin avance à 3 ; 4 et 5 sont
 * la maîtrise, optionnelle, qui se fissure si on ne revient pas.
 */
export type Traits = 0 | 1 | 2 | 3 | 4 | 5;

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

/** Énergie : ce qui limite le nombre de leçons d'affilée (voir energy.ts). */
export interface EnergyState {
  value: number;
  /** Instant de la dernière mise à jour ; la régénération se calcule depuis. */
  updatedAt: IsoDate | null;
}

export type QuestKind = 'xp' | 'lessons' | 'perfect' | 'combo' | 'cards' | 'recover';

export interface Quest {
  id: string;
  kind: QuestKind;
  target: number;
  progress: number;
  /** Gemmes gagnées à l'accomplissement. */
  reward: number;
  done: boolean;
}

export interface QuestState {
  day: DayKey | null;
  items: Quest[];
}

export type LeagueResult = 'promoted' | 'stayed' | 'demoted';

export interface LeagueOutcome {
  weekKey: DayKey;
  tier: number;
  rank: number;
  result: LeagueResult;
  newTier: number;
}

export interface LeagueState {
  /** 0 = Bronze … 9 = Diamant. */
  tier: number;
  /** Lundi de la semaine en cours. */
  weekKey: DayKey | null;
  /** Graine des adversaires de la semaine. */
  seed: number;
  xpThisWeek: number;
  /** Bilan de la semaine passée, à afficher une fois. */
  pendingOutcome: LeagueOutcome | null;
  history: LeagueOutcome[];
  /** Graine des trois rivaux, stable d'une semaine à l'autre. 0 = pas encore tirés. */
  rivalSeed: number;
}

export interface BoostState {
  activeUntil: IsoDate | null;
}

/** L'objectif quotidien d'XP et son avancement, remis à zéro chaque jour. */
export interface DailyState {
  day: DayKey | null;
  xp: number;
  /** XP visés par jour ; se règle à l'onboarding et dans le Profil. */
  goal: number;
  /** Jour où l'objectif a été atteint pour la dernière fois (récompense une fois par jour). */
  metOn: DayKey | null;
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
  questsCompleted: number;
  /** Jours où l'objectif quotidien a été atteint. */
  goalDays: number;
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
  energy: EnergyState;
  gems: number;
  quests: QuestState;
  league: LeagueState;
  boost: BoostState;
  /** Meilleur score Blitz par matière. */
  blitz: Record<string, number>;
  daily: DailyState;
  monthly: MonthlyState;
}

/** Le défi du mois (voir monthly.ts). */
export interface MonthlyState {
  /** « AAAA-MM » du compteur courant ; null avant la première leçon. */
  month: string | null;
  lessons: number;
  claimed: boolean;
  /** Mois gagnés, « AAAA-MM », dans l'ordre. */
  medals: string[];
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
      questsCompleted: 0,
      goalDays: 0,
    },
    ads: { sessionsSinceLastAd: 0, lastAdAt: null, adsShown: 0 },
    energy: { value: 25, updatedAt: null },
    gems: 0,
    quests: { day: null, items: [] },
    league: { tier: 0, weekKey: null, seed: 0, xpThisWeek: 0, pendingOutcome: null, history: [], rivalSeed: 0 },
    boost: { activeUntil: null },
    blitz: {},
    daily: { day: null, xp: 0, goal: DEFAULT_DAILY_GOAL, metOn: null },
    monthly: { month: null, lessons: 0, claimed: false, medals: [] },
  };
}
