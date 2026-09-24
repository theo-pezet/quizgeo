/**
 * Comparaison tolérante d'une réponse tapée : casse, accents, ponctuation,
 * parenthèses et espaces ne comptent pas ; une faute de frappe est tolérée
 * sur les mots assez longs.
 *
 * Exception : quand la réponse attendue est une expression avec des
 * opérateurs (« x + y », « a != b », « x // y »), les opérateurs comptent,
 * sinon « x - y » vaudrait « x + y ».
 */

const OPERATOR_CHARS = '+\\-*/%<>=!';
const OPERATOR_RUN = new RegExp(`[${OPERATOR_CHARS}]+`, 'g');

/** La réponse attendue contient-elle des opérateurs qui comptent ? (« A/B testing » ou « E-E-A-T » : non.) */
export function hasOperators(answer: string): boolean {
  const s = answer.replace(/\([^)]*\)/g, ' ');
  return /\s[+\-*/%<>=!]{1,3}\s/.test(s) || /[+*%<>=!]|\/\//.test(s);
}

export function normalizeAnswer(text: string, keepOperators = false): string {
  const s = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (keepOperators) {
    return s
      .replace(OPERATOR_RUN, (op) => ` ${op} `)
      .replace(new RegExp(`[^a-z0-9${OPERATOR_CHARS}]+`, 'g'), ' ')
      .trim();
  }
  return s
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Distance de Levenshtein, bornée pour rester bon marché. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev = Array.from({ length: cols }, (_, j) => j);
  for (let i = 1; i < rows; i += 1) {
    const cur = [i];
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[cols - 1];
}

export function toleranceFor(answer: string): number {
  if (answer.length >= 12) return 2;
  if (answer.length >= 6) return 1;
  return 0;
}

/** La saisie vaut-elle la réponse attendue (ou l'une des variantes acceptées) ? */
export function answerMatches(input: string, answer: string, accept: readonly string[] = []): boolean {
  const given = normalizeAnswer(input);
  if (given === '') return false;
  for (const candidate of [answer, ...accept]) {
    if (hasOperators(candidate)) {
      // Les opérateurs doivent être exactement ceux attendus ; la tolérance ne porte que sur le reste.
      const ops = (t: string) => (normalizeAnswer(t, true).match(OPERATOR_RUN) ?? []).join(' ');
      if (ops(input) !== ops(candidate)) continue;
    }
    const expected = normalizeAnswer(candidate);
    if (given === expected) return true;
    if (editDistance(given, expected) <= toleranceFor(expected)) return true;
  }
  return false;
}
