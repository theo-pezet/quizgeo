/**
 * Comparaison tolérante d'une réponse tapée : casse, accents, ponctuation,
 * parenthèses et espaces ne comptent pas ; une faute de frappe est tolérée
 * sur les mots assez longs.
 */

export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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
    const expected = normalizeAnswer(candidate);
    if (given === expected) return true;
    if (editDistance(given, expected) <= toleranceFor(expected)) return true;
  }
  return false;
}
