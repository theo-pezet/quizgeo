# Skilltrail

Application mobile (Android, et web) pour apprendre le marketing digital,
l'IA, Python et HTML / CSS / JavaScript. Un chemin d'unités par matière,
découpé en **mondes** thématiques (comme Duolingo), un deck de vocabulaire en
répétition espacée (comme Anki), et des cas pratiques. Interface et contenu
en **français, anglais et espagnol** (choix au premier lancement, puis dans
le Profil).

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
- **Le deck et le chemin se parlent** : les leçons nourrissent la révision espacée.
- **Des cas pratiques** à plusieurs décisions, avec un retour à chaque étape.
- **Cinq couronnes par unité** : le chemin avance à 3, la maîtrise va à 5,
  et sans révision une couronne se fissure tous les 14 jours.
- **Énergie** (25, une leçon en coûte 5, une erreur 1, un sans-faute en
  rembourse 2, +1 toutes les 12 min) — les révisions restent gratuites.
- **Gemmes** et boutique (recharge, gel de série, boost XP ×2), **quêtes du
  jour**, **ligue hebdomadaire** (30 joueurs, 10 divisions ; adversaires
  simulés hors ligne, remplaçables par un service en ligne).
- Série quotidienne avec gels, 17 badges, niveaux, sessions libres par matière.
- **Blitz** (60 s, XP ×2), **test de sortie** (8/10 sur une unité verrouillée
  valide les précédentes), **rappels locaux** (série en danger, énergie
  rechargée, Android uniquement), trois **rivaux** récurrents en ligue.
- **Trois langues.** Le classeur Excel (anglais) est traduit vers le français
  et l'espagnol (`src/data/i18n/deck.*.json`), les cartes et exercices écrits
  à la main (français) vers l'anglais et l'espagnol (`xcards.*.json`,
  `extras.*.json`). Les identifiants ne changent jamais : la progression
  survit à un changement de langue. Textes d'interface : `src/i18n/`.
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
npm test              # 380 tests ; src/game/ doit rester à 100 % de couverture
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
