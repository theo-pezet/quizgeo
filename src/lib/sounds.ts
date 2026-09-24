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

/**
 * Mode audio : jouer même en mode silencieux « médias autorisés », et SE
 * MÉLANGER aux autres applis. Sans `mixWithOthers`, Android demande le focus
 * audio à chaque son : la musique ou le podcast de l'utilisateur se met en
 * pause à chaque bonne réponse. Réglé une fois, au premier son ; les sons
 * attendent que ce soit fait.
 */
let mode: Promise<void> | null = null;
let modeReady = false;

function ensureMode(): Promise<void> {
  if (mode === null) {
    mode = setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' })
      .catch(() => undefined)
      .then(() => {
        modeReady = true;
      });
  }
  return mode;
}

function start(p: AudioPlayer): void {
  try {
    p.seekTo(0);
    p.play();
  } catch {
    // Lecture impossible (autoplay bloqué sur le web avant un geste) : on ignore.
  }
}

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
    const p = playerFor(name);
    if (!p) return;
    if (modeReady) start(p);
    else void ensureMode().then(() => start(p));
  },
};
