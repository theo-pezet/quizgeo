# Publier sur le Play Store — mode d'emploi

Tout est prêt côté code. Il reste trois comptes à ouvrir (une fois) et une
commande à lancer par version.

## 1. Les comptes (une fois)

1. **Google Play Console** — https://play.google.com/console — 25 $ une fois
   pour la vie. Créer l'application « Quiz GEO », langue par défaut français,
   type application, gratuite.
2. **Expo (EAS)** — https://expo.dev — gratuit. C'est le service qui compile
   et **signe** l'application. Il génère et garde la clé de signature : ne
   jamais la perdre, c'est elle qui permet les mises à jour.
3. Rien d'autre. Pas de Mac, pas d'Android Studio.

## 2. Le premier build signé

Dans une session Claude Code (ou Codespaces), à la racine du dépôt :

```
npm install -g eas-cli
eas login                       # compte Expo
eas build:configure             # lie le projet (une fois)
eas build -p android --profile production
```

- EAS propose de générer la clé de signature : **oui**, et la laisser gérée
  par EAS (« Let EAS manage »).
- Le build produit un **.aab** (App Bundle), le format exigé par Google.
- `versionCode` s'incrémente tout seul à chaque build de production
  (`autoIncrement` dans `eas.json`).


## Sans EAS : l'App Bundle produit par GitHub Actions

Le workflow *Android APK* (Actions → Run workflow, avec un nom de version)
produit aussi `quizgeo-vX.Y.Z.aab`, signé avec la clé de release du dépôt
(secret `ANDROID_KEYSTORE_BASE64`, voir `signature.md`). Ce fichier se dépose
tel quel dans la Play Console (Tests → Test interne → Créer une version).

- À la création de l'application dans la Play Console, accepte la **signature
  d'application par Google Play** : la clé du dépôt devient la *clé de
  téléversement* (upload key) et Google signe les APK distribués.
- Le `versionCode` (app.config.ts) doit augmenter à chaque envoi : il est
  incrémenté à chaque version dans ce dépôt.
- targetSdk / compileSdk suivent Expo SDK 57 (Android 16, API 36), minSdk 24
  (Android 7). Le manifeste ne contient que INTERNET, VIBRATE et
  POST_NOTIFICATIONS (rappels locaux) ; les permissions inutiles sont bloquées
  dans app.config.ts.

## 3. Premier envoi

Play Console → Tests → **Test interne** → Créer une version → déposer le .aab.
Ajouter ton adresse comme testeur, installer via le lien. Vérifier :
onboarding, une leçon, les rappels (notifications), le deck.

Puis remplir la fiche (textes dans `fiche.md`), les captures
(`screenshots/`), le questionnaire de classification, la section « Sécurité
des données » (aucune collecte), la politique de confidentialité (URL).

Passage en **Production** : Google relit l'app, sous 1 à 7 jours pour une
première publication.

## 4. Les versions suivantes

```
eas build -p android --profile production
eas submit -p android           # envoie le dernier .aab en test interne
```

Ou tout en un : `eas build -p android --profile production --auto-submit`.

## 5. Ce qu'il ne faut jamais changer

- `android.package` = `fr.citeparlia.quizgeo` (app.config.ts). Le Play
  Store, la clé de signature et plus tard AdMob y sont liés.
- La clé de signature gérée par EAS. En cas de doute :
  `eas credentials -p android`.

## 6. Plus tard : AdMob

Quand l'app est en production : compte AdMob → lier à la fiche Play →
un identifiant d'app et un par emplacement → `react-native-google-mobile-ads`
avec le consentement UMP → `FEATURES.ads = true`. La politique de
confidentialité et le formulaire « Sécurité des données » seront à mettre à
jour (identifiant publicitaire).
