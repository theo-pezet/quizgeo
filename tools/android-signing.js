#!/usr/bin/env node
/**
 * Branche la clé de release dans android/app/build.gradle après `expo prebuild`.
 *
 *   node tools/android-signing.js android/app/build.gradle
 *
 * Attend android/app/release.keystore (déposé par le workflow depuis le secret
 * ANDROID_KEYSTORE_BASE64). Mot de passe et alias : variables d'environnement
 * ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_ALIAS / ANDROID_KEY_PASSWORD, avec des
 * valeurs par défaut — la protection, c'est le fichier, pas le mot de passe.
 */
const fs = require('node:fs');

const file = process.argv[2] ?? 'android/app/build.gradle';
const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD || 'quizgeo-android';
const keyAlias = process.env.ANDROID_KEY_ALIAS || 'quizgeo';
const keyPassword = process.env.ANDROID_KEY_PASSWORD || storePassword;

let gradle = fs.readFileSync(file, 'utf8');
if (gradle.includes("file('release.keystore')")) {
  console.log('Signature release déjà en place.');
  process.exit(0);
}

const releaseConfig = `signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword '${storePassword}'
            keyAlias '${keyAlias}'
            keyPassword '${keyPassword}'
        }`;
if (!gradle.includes('signingConfigs {')) throw new Error('signingConfigs introuvable dans ' + file);
gradle = gradle.replace('signingConfigs {', releaseConfig);

// Dans buildTypes.release, la signature debug devient la signature release.
const releaseBlock = /release\s*\{[^}]*?signingConfig signingConfigs\.debug/s;
if (!releaseBlock.test(gradle)) throw new Error('buildTypes.release signé en debug introuvable dans ' + file);
gradle = gradle.replace(releaseBlock, (block) => block.replace('signingConfigs.debug', 'signingConfigs.release'));

fs.writeFileSync(file, gradle);
console.log(`Signature release branchée (alias ${keyAlias}).`);
