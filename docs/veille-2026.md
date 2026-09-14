# Veille concurrentielle et rétention, septembre 2026

Ce document répond à trois questions : que font les concurrents en 2026, quelles
idées valent la peine d'être reprises, et comment garder nos utilisateurs (le
terme est la **rétention** : part des utilisateurs qui reviennent à J+1, J+7,
J+30 après l'installation).

## 1. Les chiffres qui comptent

Ordres de grandeur 2026 pour une app Android, toutes catégories confondues :
environ 20 % des installs reviennent à J+1, 8 % à J+7, 4 % à J+30. La catégorie
Éducation est la plus dure : 14 à 15 % à J+1, 2 à 3 % à J+30. Duolingo tourne
autour de 35 % à J+7, soit le double de la catégorie, et revendique 50 millions
d'utilisateurs quotidiens fin 2025, avec un churn ramené à 28 % sur ses marchés
occidentaux.

Trois moments décident de tout :

- **J+1** : l'onboarding a-t-il amené à la valeur en moins d'une minute ?
- **J+2 à J+7** : une habitude se forme-t-elle (boucle déclencheur, action,
  récompense) ?
- **J+30** : l'app apporte-t-elle encore quelque chose (progression visible,
  nouveauté, statut) ?

## 2. Ce que font les concurrents en 2026

**Duolingo.** Le système d'énergie remplace les cœurs (on l'a déjà). Le
Streak Society (club à partir de 7 jours de série, paliers), le Friend Streak
(série partagée avec jusqu'à cinq amis), le badge mensuel (accomplir un
certain nombre de quêtes dans le mois), le Duolingo Score exportable sur
LinkedIn, des cours hors langues (échecs, maths, musique) pour retenir plus
longtemps, des retours d'erreur générés par IA qui expliquent le « pourquoi »,
et une personnalisation de la difficulté et des récompenses.

**Codédex.** Un monde pixel-art et une histoire façon RPG, des chapitres
courts où l'on écrit du vrai code, un éditeur intégré, des projets à publier,
un assistant IA (Lumi) pour débloquer, une communauté Discord avec défis
mensuels et hackathons. Ce qui retient : le sentiment d'aventure et la
communauté, plus que la mécanique de quiz.

**Mimo.** Leçons de moins de 5 minutes, série très mise en avant,
programme rafraîchi (SQL, TypeScript), et depuis 2025 un mode où l'on
construit une vraie application avec l'IA et la publie.

**Sololearn.** 20 langages, un assistant IA (Kodie), du code partagé et de la
compétition entre apprenants, un parcours adaptatif.

**Brilliant.** Positionnement « tuteur superintelligent » pour les maths et
le code, offre premium avec tuteur.

## 3. Ce qu'on a déjà, et ce qui manquait

Déjà en place dans Skilltrail : énergie, série avec gels, ligue hebdomadaire,
quêtes du jour, objectif du jour, couronnes avec usure, test de niveau,
révision espacée liée aux leçons, cas pratiques, Blitz, rappels locaux,
trois langues, mondes thématiques.

Ajouté dans cette version (v1.0) à la suite de cette veille :

1. **Défi du mois** : 20 leçons dans le mois civil, une médaille de
   collection et 100 gemmes. C'est l'objectif à moyen terme qui manquait entre
   la série (jour) et les couronnes (long terme). Carte sur le parcours, page
   dédiée en fin de leçon, collection dans le Profil.
2. **Relances après inactivité** : notifications locales 3, 7 et 14 jours
   après la dernière session (en plus du rappel de série du soir). Les relances
   déclenchées par le comportement convertissent 3 à 5 fois mieux que les
   envois en masse.

## 4. Feuille de route rétention, par ordre de rentabilité

Chaque ligne indique l'effort (S, M, L) et ce que cela vise.

1. **Streak Society** (S, J+7 à J+30) : un statut visible à partir de 7 jours
   de série, avec paliers 7 / 30 / 100 / 365 et une petite récompense à chaque
   palier (gel offert, icône). Le moteur a déjà les paliers de gemmes ; il
   manque l'écran et l'icône de statut sur l'accueil.
2. **Retour d'erreur personnalisé** (M, J+1) : quand une réponse est fausse,
   proposer « Pourquoi ? » avec une explication plus longue tirée de la carte
   (définition + exemple) et la carte concurrente qu'on a confondue. Sans IA en
   ligne, on peut le faire avec les données du deck.
3. **Défis hebdomadaires à thème** (M, J+7) : « la semaine SEO », avec un
   bonus de XP sur un monde donné, pour donner une raison de revenir chaque
   semaine. Purement local.
4. **Récap hebdomadaire** (S, J+7) : chaque lundi, une page « ta semaine » :
   XP, leçons, précision, cartes acquises, classement de ligue. Duolingo le
   fait par e-mail ; en local, une notification et une page suffisent.
5. **Projets guidés** (L, J+30) : à la Codédex et Mimo, un mini-projet par
   monde (écrire une fiche produit, construire une landing page en HTML/CSS,
   scripter un rapport pandas) avec vérification par étapes. C'est le contenu
   qui fait passer du quiz à la compétence réelle.
6. **Score partageable** (M, notoriété) : un « score Skilltrail » par matière
   (0 à 100, dérivé des couronnes et de la précision) exportable en image pour
   LinkedIn. Duolingo l'a fait avec LinkedIn en 2025.
7. **Ligue en ligne et Friend Streak** (L, J+30) : nécessitent un service
   (compte, serveur). Le moteur de ligue est déjà conçu pour remplacer les
   adversaires simulés par de vrais joueurs ; c'est la première brique à
   brancher si un backend arrive un jour.
8. **Assistant IA** (L, J+1 à J+30) : expliquer une réponse, générer des
   exercices à la demande. Demande une API payante et un consentement ; à
   réserver à une version premium.
9. **Widget d'écran d'accueil et raccourci « leçon en 2 minutes »** (M,
   J+2 à J+7) : réduire le coût de reprise. Sur Android : un widget qui montre
   la série et ouvre directement une leçon.
10. **Personnalisation de la difficulté** (M, J+30) : monter la part de
    questions à réponse tapée quand la précision dépasse 90 %, la baisser en
    dessous de 60 %. Le mode maîtrise existe déjà à partir de 3 couronnes ;
    il suffit de rendre le seuil adaptatif.

## 5. Ce qu'il ne faut pas copier

- Les cœurs (punition à l'erreur) : abandonnés par Duolingo lui-même.
- Les notifications culpabilisantes à répétition : une par jour au plus, à
  l'heure choisie, et un arrêt après 14 jours de silence.
- L'IA générative sans garde-fous dans le contenu pédagogique : le contenu
  de Skilltrail est relu ; garder cette exigence si un assistant arrive.

## Sources

- StriveCloud, « Duolingo gamification explained » : https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo
- 925 Studios, « Duolingo UX Breakdown 2026 » : https://www.925studios.co/blog/duolingo-design-breakdown
- Ludaxis, « The Psychology of Gamification, Duolingo case study 2026 » : https://www.ludaxis.io/blog/gamification-in-apps-duolingo-case-study-2026
- Duolingo, Duocon 2025 (Score sur LinkedIn, énergie, échecs) : https://investors.duolingo.com/news-releases/news-release-details/duolingo-unveils-major-product-updates-turn-learning-real-world
- Duolingo, Friend Streak : https://blog.duolingo.com/friend-streak/
- Lingoly, badge mensuel et Streak Society : https://lingoly.io/duolingo-monthly-badge/ et https://lingoly.io/duolingo-streak-society/
- Codédex, teardown 2025 : https://rohan-singhs-blog.typeflo.io/posts/codedex-teardown-gamified-coding-platform-edtech
- Codédex, avis 2026 : https://coddy.tech/vs/codedex
- Mimo vs Sololearn 2026 : https://www.coursefacts.com/guides/mimo-vs-sololearn-2026
- Benchmarks de rétention 2026 : https://uxcam.com/blog/mobile-app-retention-benchmarks/ , https://semnexus.com/day-1-day-7-day-30-retention-benchmarks-app-category-2026 , https://userpilot.com/blog/mobile-app-retention/
- Stratégies de rétention 2026 : https://userpilot.com/blog/app-retention-strategies/ , https://www.pushwoosh.com/blog/increase-user-retention-rate/
- ASO Google Play 2026 : https://appfollow.io/blog/app-store-optimization-title , https://theionproject.com/blog/google-play-aso-guide-2026/
