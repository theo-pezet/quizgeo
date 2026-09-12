/**
 * Les sons de récompense. Courts, synthétisés (tools/make_sounds.py), joués
 * via expo-audio sur Android comme sur le web. Respectent le réglage « Sons ».
 * Aucun échec de lecture ne doit jamais remonter à l'écran.
 */

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { useSettings } from '@/store/progress';

export type SoundName = 'correct' | 'wrong' | 'crown' | 'levelup' | 'badge' | 'perfect' | 'timeup' | 'goal';

const SOURCES: Record<SoundName, number> = {
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  crown: require('../../assets/sounds/crown.wav'),
  levelup: require('../../assets/sounds/levelup.wav'),
  badge: require('../../assets/sounds/badge.wav'),
  perfect: require('../../assets/sounds/perfect.wav'),
  timeup: require('../../assets/sounds/timeup.wav'),
  goal: require('../../assets/sounds/goal.wav'),
};

const players = new Map<SoundName, AudioPlayer>();
let modeReady = false;

function playerFor(name: SoundName): AudioPlayer | null {
  try {
    let p = players.get(name);
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      players.set(name, p);
    }
    return p;
  } catch {
    return null;
  }
}

export const sounds = {
  play(name: SoundName): void {
    if (!useSettings.getState().sound) return;
    if (!modeReady) {
      modeReady = true;
      // Jouer même si le téléphone est en mode silencieux « médias autorisés » ; sans bloquer.
      void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    }
    const p = playerFor(name);
    if (!p) return;
    try {
      p.seekTo(0);
      p.play();
    } catch {
      // Lecture impossible (autoplay bloqué sur le web avant un geste) : on ignore.
    }
  },
};
