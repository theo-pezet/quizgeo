# Signature Android — la clé de release

Sans clé de release, l'APK est signé avec la clé de **debug** d'Android,
la même sur tous les ordinateurs du monde : Chrome bloque le téléchargement
(« fichier dangereux ») et Play Protect avertit. Avec ta propre clé, ces
alertes disparaissent ou se réduisent au simple « Conserver » de Chrome.

## Une seule chose à faire (une fois, 2 minutes)

1. Ouvre https://github.com/theo-pezet/quizgeo/settings/secrets/actions
2. **New repository secret**
3. Name : `ANDROID_KEYSTORE_BASE64`
4. Secret : colle le contenu du fichier `ANDROID_KEYSTORE_BASE64.txt`
   (une seule longue ligne, sans espace ni retour à la ligne)
5. **Add secret**

Le prochain build (`Actions → Android APK → Run workflow`) est signé avec
cette clé. Le nom du fichier ne change pas.

## Garde ce fichier précieusement

`quizgeo-release.jks` est **la** clé : toute mise à jour doit être signée
avec elle, sinon Android refuse l'installation par-dessus l'ancienne
version. Garde-en une copie hors de GitHub (disque, gestionnaire de mots
de passe). Ne la commite jamais dans le dépôt.

| | |
|---|---|
| Fichier | `quizgeo-release.jks` |
| Alias | `quizgeo` |
| Mot de passe (keystore et clé) | `quizgeo-android` |
| Validité | jusqu'en 2054 |

Le mot de passe n'est pas secret : ce qui protège, c'est le fichier, qui
ne vit que dans le secret GitHub et dans ta sauvegarde.

## Et le Play Store ?

Le Play Store utilise **sa propre** clé (Play App Signing, gérée par Google)
avec une clé d'upload gérée par EAS. Cette clé-ci ne sert qu'aux APK
distribués hors Play Store. Les deux peuvent coexister : un téléphone qui
a l'APK GitHub devra désinstaller avant d'installer la version Play Store
(signatures différentes), c'est normal.

## Si la clé est perdue

On en génère une nouvelle (`tools/` : voir la commande ci-dessous), mais
les utilisateurs de l'ancienne devront désinstaller / réinstaller.

```
keytool -genkeypair -v -keystore quizgeo-release.jks -alias quizgeo \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass quizgeo-android -keypass quizgeo-android \
  -dname "CN=Skilltrail, O=Cite par l IA, C=FR"
base64 -w0 quizgeo-release.jks > ANDROID_KEYSTORE_BASE64.txt
```
