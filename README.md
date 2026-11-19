# Skilltrail

Application mobile (Android, et web) pour apprendre le marketing digital,
l'IA, Python et HTML / CSS / JavaScript. Un chemin d'unités par matière,
découpé en **mondes** thématiques (comme Duolingo), un deck de vocabulaire en
répétition espacée (comme Anki), et des cas pratiques. Interface et contenu
**en anglais uniquement** (depuis la 1.3), avec les termes exacts du métier.

- **Web** : https://theo-pezet.github.io/quizgeo/ (publié à chaque push sur `main`)
- **APK Android** : onglet *Releases* (construit et signé par GitHub Actions ;
  *Actions → Android APK → Run workflow* avec le nom de version). Chrome
  affiche « fichier dangereux » pour tout APK hors Play Store : **Conserver**,
  puis **Installer**. La clé de signature : `docs/play-store/signature.md`.

## Ce qui est différent de Duolingo

- **Pas de cœurs.** Une erreur ne punit pas : l'exercice revient en fin de
  session (rattrapage), entre dans la file « à revoir » jusqu'à deux bonnes
  réponses d'affilée, et la carte du deck correspondante est replanifiée.
- **Une explication à chaque réponse**, juste ou fausse, avec un exemple.
  Pas compris ? **Ask Claude** ouvre Claude (l'app sur Android, un nouvel
  onglet sur le web) avec la question, ta réponse, la bonne réponse et
  l'explication déjà écrites ; **Share** envoie le même texte ailleurs
  (`src/lib/askClaude.ts`).
- **Le deck et le chemin se parlent** : les leçons nourrissent la révision espacée.
- **Des cas pratiques** à plusieurs décisions, avec un retour à chaque étape.
- **Cinq couronnes par unité** : la 1re ouvre l'unité suivante (dès une leçon
  réussie à 8/10, ou 6/10 une fois toutes les questions vues), le chemin
  avance à 3, la maîtrise va à 5, et sans révision une couronne se fissure
  tous les 14 jours.
- **Énergie** (30, une leçon en coûte 5, une erreur 1, un sans-faute en
  rembourse 2, +1 toutes les 12 min) — les révisions restent gratuites.
  **Bonus de ligue** : la ligue actuelle relève le plafond (+5 Argent,
  +10 Or… +30 Diamant) ; une relégation le fait redescendre.
- **Une carte, plusieurs visages** (deck) : après deux révisions, une carte
  se présente tantôt par son terme, tantôt par sa définition, un exemple ou
  un texte à trou (terme masqué), jamais deux fois de suite pareil. Une carte
  qui rechute passe en **duel** contre la notion qu'on confond avec elle.
  Règles : `src/game/faces.ts` ; matière : `src/content/faces.ts`.
- **Science de l'apprentissage** (`src/game/learning.ts`) : **prétest**
  (une unité jamais commencée s'ouvre sur deux questions à deviner, sans
  conséquence, reposées en fin de leçon), **« I'm sure »** avant de valider
  (juste et sûr : la réponse compte double et sort de la file « à revoir » ;
  faux et sûr : en tête de la file, effet d'hypercorrection ; jamais proposé
  quand la réponse est encore fraîche : rattrapage, prétest, erreur du jour),
  **leçons ciblées** (la première leçon d'une unité suit l'ordre de rédaction,
  les suivantes posent d'abord le jamais vu et les erreurs),
  **révisions entrelacées** par matière (file d'erreurs et deck), et
  **réapprentissage jusqu'au critère** (une erreur revient dans la même séance,
  jusqu'à deux fois, en leçon comme au deck).
- **Fiches « New »** : la première leçon d'une unité intercale ses notions
  (définition, exemple, bouton écouter) entre les questions : on voit un
  exemple avant d'être interrogé (effet de l'exemple résolu).
- **Voix** (`expo-speech`, synthèse du téléphone, hors ligne) : écouter un
  terme ou une définition, et **mode écoute** du deck, mains libres : le terme
  est lu, une pause laisse le temps de dire la réponse à voix haute, puis la
  réponse est lue. Le deck invite aussi à dire la réponse à voix haute avant
  de retourner la carte (effet de production).
- **Bac à sable** (`/sandbox`, WebView ou iframe) : « Try it » ouvre le code
  d'un exercice HTML, CSS ou JavaScript, modifiable, avec le rendu en direct et
  la console.
- **File « à revoir » espacée** : une erreur revient le lendemain, une
  première bonne réponse la repousse de 3 jours (`REVIEW_GAPS`).
- **Pourquoi ?** : une bonne réponse sur trois cache l'explication derrière un
  champ « explique-le en une phrase » (auto-explication).
- **Question précédente** : pendant une leçon, un petit bouton ↶ réaffiche la
  question d'avant, telle qu'elle a été répondue, avec son explication.
- **Gemmes** et boutique (recharge, gel de série, boost XP ×2), **quêtes du
  jour**, **ligue hebdomadaire** (30 joueurs, 10 divisions ; adversaires
  simulés hors ligne, remplaçables par un service en ligne).
- Série quotidienne avec gels, 17 badges, niveaux, sessions libres par matière.
  Un rattrapage ne rapporte pas d'XP, et les petits événements (niveau,
  quêtes, badges, série) tiennent sur l'écran de résumé : seules la couronne
  (avec ce qui est maîtrisé) et le monde terminé ont leur page.
- **Blitz** (60 s, XP ×2), **test de sortie** (8/10 sur une unité verrouillée
  valide les précédentes), **rappels locaux** (série en danger, énergie
  rechargée, Android uniquement), trois **rivaux** récurrents en ligue.
- **Anglais uniquement (1.3).** Le marketing, l'IA et le code se pratiquent en
  anglais : l'app n'a plus de français ni d'espagnol. Contenu : `deck.json`
  (classeur Excel), `cards.manual.json` et `exercises.manual.json` (cartes et
  exercices écrits à la main), `units.extra.json`, `code.extra.json`. Les
  identifiants n'ont pas changé : la progression est conservée, et
  `src/content/__tests__/keys-v1.2.json` garantit que chaque unité garde
  exactement ses clés d'exercice (donc ses couronnes).
- **Mondes.** `src/content/worlds.ts` regroupe les unités en sections avec
  nom, couleur et emblème ; un monde est terminé quand toutes ses unités ont
  3 couronnes (écran dédié en fin de leçon).
- **Six matières au choix** (marketing, IA, Python, HTML, CSS, JavaScript) :
  l'utilisateur coche celles qu'il veut au premier lancement ou dans le
  Profil, et seules celles-là apparaissent dans le parcours, le deck et
  l'entraînement.
- **Test de niveau** par matière (`src/game/placement.ts`) : dix QCM pris
  dans les premiers 70 % du chemin, une auto-évaluation sur 10, et un
  placement qui valide les premières unités à 3 couronnes. Un score faible ne
  saute rien ; un sans-faute ne dépasse jamais 70 % du chemin.
- **Mini-tuto** en quatre cartes au premier parcours (parcours, énergie,
  objectif et quêtes, couronnes).

## Architecture

```
src/
├── game/       le cœur de règles, pur, testé à 100 % (XP, série, couronnes,
│               révision, badges, répétition espacée, politique de pub)
├── content/    matières, unités, génération d'exercices depuis le deck,
│               exercices écrits à la main (GEO, culture IA, HTML/CSS/JS, code)
├── data/       deck.json (généré depuis docs/deck-source.xlsx) ;
│               les cartes écrites à la main sont dans content/cards.extra.ts
├── features/   la session (machine à états + rendu des 5 types d'exercices)
├── store/      zustand + AsyncStorage : progression et réglages
├── ui/         jetons de design et composants de base
├── lib/        frontières plateforme : pub (vide en v1), haptique, confirm
└── app/        routes expo-router : (tabs)/, session/, deck/
tools/build_deck.py   régénère src/data/deck.json depuis le classeur
```

Types d'exercices : QCM (2 à 4 choix), texte à trous, association, remise en
ordre, cas pratique.

## Développer

```
npm install
npm run typecheck
npm test              # 389 tests ; src/game/ doit rester à 100 % de couverture
npx expo start        # puis w (web), a (Android)
npx expo export --platform web   # build statique dans dist/
```

Régénérer le deck après modification du classeur :

```
python3 tools/build_deck.py docs/deck-source.xlsx src/data/deck.json
```

## Play Store

Tout est dans `docs/play-store/` : la fiche (`fiche.md`), le mode d'emploi
(`publier.md`), les captures 1080×1920 (`screenshots/`), l'image de
présentation (`feature-graphic.png`). L'icône et ses déclinaisons se
régénèrent avec `python3 tools/make_icons.py assets/images`, les sons avec
`python3 tools/make_sounds.py assets/sounds`. La signature passe par EAS
(`eas.json`, profil `production`).

## Publicité (plus tard)

La règle d'affichage existe déjà (`src/game/ads.ts`, testée) : jamais pendant
un exercice, seulement après une session d'unité, jamais sur les 5 premières
sessions, au plus une fois toutes les 3 sessions et 20 minutes. Le SDK n'est
pas installé : `FEATURES.ads = false` dans `src/config/features.ts`, et
`src/lib/ads.ts` est la seule frontière à remplacer (AdMob + consentement UMP).
AdMob exigeant une fiche Play Store, l'ordre sera : app → Play Store → pubs.
Le `package` Android `fr.citeparlia.quizgeo` ne doit jamais changer.
