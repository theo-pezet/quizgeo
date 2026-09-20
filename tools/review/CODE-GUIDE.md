# Rédiger des exercices « lis le code » (Skilltrail v1.1)

Tu rédiges, pour UNE unité existante, une dizaine d'exercices où l'apprenant
lit du code et prédit ce qu'il fait. C'est la méthode qui apprend vraiment un
langage : pas « qu'est-ce qu'une liste ? » mais « qu'affiche ce code ? ». Le
public : marketeurs et débutants motivés, francophones d'abord ; contenu en
fr / en / es.

## Formats (le code est identique dans les trois langues, seule la prose change)

1. **qcm « Qu'affiche ce code ? »** (au moins 6 sur 10) : un snippet de 1 à 6
   lignes, 4 choix, la bonne réponse est la sortie exacte. `output` = la sortie
   exacte (ce qui s'affiche, tel quel). Pour chaque mauvais choix, `whyWrong`
   explique EN UNE PHRASE pourquoi quelqu'un pourrait le croire et pourquoi
   c'est faux (« C'est le résultat de 7 / 2 ; le double slash change
   l'opération »). Les choix sont des sorties plausibles : le piège classique,
   l'erreur d'indice, le type voisin (2 contre 2.0, "34" contre 7).
   Variante : `prompt` personnalisé (« Quelle valeur a x à la fin ? »,
   « Que renvoie cette fonction ? », « Quelle règle CSS s'applique ? »,
   « Que voit l'utilisateur ? »).
2. **qcm « trou »** : le code contient `___` et on choisit ce qui le remplit
   pour obtenir la sortie annoncée dans le prompt. Pas d'`output`.
3. **vf** : une affirmation précise sur un comportement du langage, vraie ou
   fausse, jamais discutable.
4. **bugline** : 3 à 6 lignes dont UNE seule provoque une erreur (ou le bug
   décrit dans le prompt). `answer` = son index (0 = première ligne).
5. **compose** : assembler une ligne qui produit le résultat annoncé.
   `tokens` = la solution dans l'ordre (3 à 9 morceaux : mots-clés,
   parenthèses, opérateurs, littéraux), `extra` = 1 à 4 intrus qui rendent
   l'assemblage non trivial mais dont l'usage donnerait un autre résultat.
   Aucun intrus égal à un morceau de la solution.

Répartition conseillée pour 10 exercices : 6 qcm sortie, 1 trou, 1 vf,
1 bugline, 1 compose. Difficulté croissante : les 3 premiers sont faciles.

## Règles absolues

- **Exécute le code** (python3, node) avant d'écrire la sortie : `output`
  et la bonne réponse doivent être EXACTEMENT ce que le code affiche (espaces,
  guillemets, `.0`, ordre des clés). Pour CSS/HTML, raisonne à partir de la
  spécification et reste sur des cas non ambigus (spécificité, cascade, box
  model, valeur calculée, rendu d'une balise).
- Une seule réponse défendable. Si un distracteur peut être juste selon la
  version ou le contexte, change-le.
- Le code est le sujet de l'unité (respecte son titre et sa description), en
  situation marketing quand c'est naturel (taux de clic, leads, budget, UTM,
  panier), sans forcer.
- Pas de commentaires dans le code (ils devraient être traduits). Noms de
  variables en anglais neutre (`total`, `clicks`, `price`) pour rester
  identiques dans les trois langues.
- `explain` (« à retenir ») : 1 à 2 phrases, la règle générale derrière la
  question, pas la répétition de la réponse.
- Prose : tutoiement, aucun tiret cadratin (—), pas de « ... » (utiliser « … »),
  fragments de code dans la prose entre « » en français, entre "guillemets
  droits" en anglais et en espagnol. Traductions naturelles, pas mot à mot.
- `key` : `<unitId>:w:<n>`, n de 1 à 10. `unitId` : celui donné. `priority`
  est ajouté par l'outil, ne pas le mettre.

## Format de sortie : un fichier JSON {"exercises": [...]}

```json
{"exercises": [
 {"key": "py-2:w:1", "unitId": "py-2", "kind": "qcm",
  "prompt": {"fr": "Qu’affiche ce code ?", "en": "What does this code print?", "es": "¿Qué muestra este código?"},
  "code": {"lang": "python", "src": "clicks = 120\nviews = 4000\nprint(clicks / views * 100)"},
  "choices": [{"fr": "3.0", "en": "3.0", "es": "3.0"}, {"fr": "3", "en": "3", "es": "3"}, {"fr": "0.03", "en": "0.03", "es": "0.03"}, {"fr": "30.0", "en": "30.0", "es": "30.0"}],
  "answer": 0, "output": "3.0",
  "whyWrong": [null,
    {"fr": "La division « / » renvoie toujours un flottant, même quand le résultat tombe juste.", "en": "Division with \"/\" always returns a float, even when the result is a whole number.", "es": "La división con \"/\" siempre devuelve un flotante, incluso cuando el resultado es exacto."},
    {"fr": "C’est le taux avant la multiplication par 100.", "en": "That is the rate before multiplying by 100.", "es": "Es la tasa antes de multiplicar por 100."},
    {"fr": "Il faudrait 1 200 clics pour 30 %.", "en": "You would need 1,200 clicks for 30%.", "es": "Harían falta 1 200 clics para el 30 %."}],
  "explain": {"fr": "Un taux se calcule en divisant puis en multipliant par 100 ; « / » donne un flottant, d’où le « .0 ».", "en": "A rate is a division then a multiplication by 100; \"/\" yields a float, hence the \".0\".", "es": "Una tasa se calcula dividiendo y multiplicando por 100; \"/\" da un flotante, de ahí el \".0\"."}},
 {"key": "py-2:w:2", "unitId": "py-2", "kind": "vf", "prompt": {"fr": "…", "en": "…", "es": "…"}, "isTrue": false, "explain": {"fr": "…", "en": "…", "es": "…"}},
 {"key": "py-2:w:3", "unitId": "py-2", "kind": "bugline", "prompt": {"fr": "Une seule ligne provoque une erreur. Laquelle ?", "en": "One line raises an error. Which one?", "es": "Una sola línea provoca un error. ¿Cuál?"}, "lang": "python", "lines": ["price = 19.9", "qty = \"3\"", "print(price * qty)"], "answer": 2, "explain": {"fr": "…", "en": "…", "es": "…"}},
 {"key": "py-2:w:4", "unitId": "py-2", "kind": "compose", "prompt": {"fr": "Assemble une ligne qui affiche 12.", "en": "Build a line that prints 12.", "es": "Construye una línea que muestre 12."}, "lang": "python", "tokens": ["print", "(", "3", "*", "4", ")"], "extra": ["+", "/", "2"], "explain": {"fr": "…", "en": "…", "es": "…"}}
]}
```

Langues de code acceptées : `python`, `js`, `html`, `css`, `text`.
Vérifie ton JSON (`python3 -c "import json; json.load(open(...))"`) puis
`python3 tools/integrate_code.py <fichier>` DOIT afficher « ajoutés » sans
« refusés » (lance-le depuis /home/user/quizgeo ; il écrit dans
src/data/code.extra.json, c'est attendu).
