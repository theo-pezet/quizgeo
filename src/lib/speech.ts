/**
 * La voix de l'appli : synthèse vocale du téléphone (expo-speech), en anglais.
 * Gratuite et hors ligne sur Android ; sur le web, l'API du navigateur.
 *
 * Usage ciblé (voir docs : effet de modalité et de redondance) : faire
 * entendre un terme, une définition, un exemple, ou réviser le deck sans
 * regarder l'écran. Jamais de lecture automatique d'un texte déjà affiché.
 */

import * as Speech from 'expo-speech';

const VOICE: Speech.SpeechOptions = { language: 'en-US', rate: 0.95 };

/** Lit `text` (en coupant la lecture en cours). `onEnd` est appelé à la fin, à l'arrêt ou en cas d'erreur. */
export function speak(text: string, onEnd?: () => void): void {
  void Speech.stop();
  Speech.speak(text, { ...VOICE, onDone: onEnd, onStopped: onEnd, onError: onEnd });
}

export function stopSpeaking(): void {
  void Speech.stop();
}
