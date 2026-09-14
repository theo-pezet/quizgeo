#!/usr/bin/env python3
"""Génère les sons de l'app (WAV 44,1 kHz mono 16 bits), sans échantillon externe.

    python3 tools/make_sounds.py assets/sounds

Timbre unique pour toute l'app : une « cloche douce » (sinus fondamental,
quelques harmoniques qui s'éteignent plus vite que la fondamentale, un
léger désaccord pour la chaleur), enveloppe exponentielle sans clic, une
petite réverbération, et une normalisation à -6 dBFS pour ne jamais agresser.
"""

import math
import struct
import sys
from pathlib import Path

import numpy as np

RATE = 44100


def bell(freq: float, duration: float, volume: float = 1.0, brightness: float = 1.0, attack: float = 0.004) -> np.ndarray:
    """Une note de cloche douce : la fondamentale tient, les harmoniques s'estompent vite."""
    n = int(RATE * duration)
    t = np.arange(n) / RATE
    partials = [
        (1.0, 1.0, 1.0),  # ratio, amplitude, vitesse d'extinction
        (2.0, 0.28 * brightness, 2.2),
        (3.0, 0.10 * brightness, 3.5),
        (4.02, 0.05 * brightness, 5.0),
    ]
    out = np.zeros(n)
    for ratio, amp, speed in partials:
        env = np.exp(-t * (4.2 / duration) * speed)
        out += amp * env * np.sin(2 * math.pi * freq * ratio * t)
    # Léger chorus : une seconde voix désaccordée, très discrète, pour la chaleur.
    out += 0.12 * np.exp(-t * (4.2 / duration)) * np.sin(2 * math.pi * freq * 1.0018 * t)
    # Attaque douce (pas de clic) et queue ramenée à zéro.
    ramp = np.minimum(1.0, t / attack)
    tail = np.minimum(1.0, (duration - t) / 0.02)
    return volume * out * ramp * tail


def thump(freq: float, duration: float, volume: float = 1.0, drop: float = 0.85) -> np.ndarray:
    """Un « boum » feutré : sinus qui descend légèrement, pour le « faux »."""
    n = int(RATE * duration)
    t = np.arange(n) / RATE
    f = freq * (drop + (1 - drop) * np.exp(-t * 18))
    phase = 2 * math.pi * np.cumsum(f) / RATE
    env = np.exp(-t * (5.5 / duration))
    out = np.sin(phase) + 0.18 * np.sin(2 * phase)
    ramp = np.minimum(1.0, t / 0.003)
    tail = np.minimum(1.0, (duration - t) / 0.02)
    return volume * out * env * ramp * tail


def tick(volume: float = 0.5) -> np.ndarray:
    """Un tic de chrono : très court, sans bruit blanc."""
    return bell(2400, 0.05, volume=volume, brightness=0.4, attack=0.001)


def sequence(*events: tuple[float, np.ndarray]) -> np.ndarray:
    """Superpose des notes à des instants donnés (en secondes)."""
    length = max(int(at * RATE) + len(s) for at, s in events)
    buf = np.zeros(length)
    for at, s in events:
        start = int(at * RATE)
        buf[start : start + len(s)] += s
    return buf


def reverb(x: np.ndarray, delay_s: float = 0.055, decay: float = 0.28, taps: int = 3) -> np.ndarray:
    d = int(delay_s * RATE)
    out = np.concatenate([x, np.zeros(d * taps)])
    for k in range(1, taps + 1):
        out[d * k : d * k + len(x)] += x * (decay**k)
    return out


def finish(x: np.ndarray, peak: float = 0.5) -> np.ndarray:
    x = reverb(x)
    m = float(np.max(np.abs(x))) or 1.0
    return x / m * peak


def write(path: Path, samples: np.ndarray) -> None:
    pcm = (np.clip(samples, -1, 1) * 32767).astype(np.int16)
    data = pcm.tobytes()
    with open(path, "wb") as f:
        f.write(b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVE")
        f.write(b"fmt " + struct.pack("<IHHIIHH", 16, 1, 1, RATE, RATE * 2, 2, 16))
        f.write(b"data" + struct.pack("<I", len(data)) + data)


# Notes (Hz) : do majeur, registre médium-aigu.
C5, D5, E5, G5, A5, C6, D6, E6, G6, C7 = 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1568.0, 2093.0


def main(out_dir: str) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # Juste : deux petites cloches montantes, très courtes.
    write(out / "correct.wav", finish(sequence((0.0, bell(G5, 0.28, 0.9)), (0.09, bell(C6, 0.42)))))

    # Faux : un « boum » feutré puis un second plus bas. Jamais agressif.
    write(out / "wrong.wav", finish(sequence((0.0, thump(230, 0.22)), (0.13, thump(180, 0.32, 0.9))), peak=0.42))

    # Couronne : arpège majeur, cloche claire.
    write(out / "crown.wav", finish(sequence((0.0, bell(C5, 0.5, 0.8)), (0.1, bell(E5, 0.5, 0.8)), (0.2, bell(G5, 0.6, 0.9)), (0.3, bell(C6, 1.0)))))

    # Montée de niveau : fanfare en quatre notes + accord tenu.
    write(
        out / "levelup.wav",
        finish(
            sequence(
                (0.0, bell(C5, 0.35, 0.8)),
                (0.12, bell(E5, 0.35, 0.8)),
                (0.24, bell(G5, 0.35, 0.8)),
                (0.36, bell(C6, 1.2)),
                (0.36, bell(E6, 1.2, 0.5)),
                (0.36, bell(G6, 1.2, 0.3)),
            )
        ),
    )

    # Badge : accord doux qui s'ouvre, avec un scintillement aigu.
    write(
        out / "badge.wav",
        finish(sequence((0.0, bell(A5, 0.9, 0.7)), (0.05, bell(C6, 0.9, 0.7)), (0.1, bell(E6, 0.9, 0.7)), (0.35, bell(C7, 0.5, 0.35, 0.6)))),
    )

    # Sans-faute : arpège rapide sur deux octaves qui finit haut.
    write(
        out / "perfect.wav",
        finish(sequence(*[(i * 0.07, bell(f, 0.3, 0.75)) for i, f in enumerate((C5, E5, G5, C6, E6))], (0.35, bell(G6, 1.0)), (0.35, bell(C7, 1.0, 0.4)))),
    )

    # Fin de Blitz : trois tics qui accélèrent, puis une cloche grave.
    write(out / "timeup.wav", finish(sequence((0.0, tick()), (0.18, tick()), (0.31, tick()), (0.4, bell(C5, 0.9, 1.0, 0.6)), (0.4, bell(G5, 0.9, 0.4, 0.6)))))

    # Objectif du jour atteint : deux notes gaies, répétées un ton plus haut.
    write(out / "goal.wav", finish(sequence((0.0, bell(G5, 0.3, 0.8)), (0.1, bell(C6, 0.3, 0.8)), (0.24, bell(A5, 0.3, 0.8)), (0.34, bell(D6, 0.7)))))

    for f in sorted(out.glob("*.wav")):
        print(f.name, f.stat().st_size, "octets")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "assets/sounds")
