#!/usr/bin/env python3
"""Génère les sons de l'app (WAV 22 kHz mono 16 bits), sans échantillon externe.

    python3 tools/make_sounds.py assets/sounds

Chaque son est une courte synthèse : notes sinusoïdales avec harmoniques et
enveloppe, pour rester léger (< 60 Ko) et propre à l'écoute.
"""

import math
import struct
import sys
import wave
from pathlib import Path

RATE = 22050


def tone(freq: float, duration: float, volume: float = 0.5, attack: float = 0.005, release: float = 0.08, harmonics=(1.0, 0.35, 0.12)):
    n = int(RATE * duration)
    out = []
    for i in range(n):
        t = i / RATE
        env = min(1.0, t / attack) * min(1.0, max(0.0, (duration - t) / release))
        v = 0.0
        for k, a in enumerate(harmonics, start=1):
            v += a * math.sin(2 * math.pi * freq * k * t)
        out.append(volume * env * v / sum(harmonics))
    return out


def noise(duration: float, volume: float = 0.3):
    import random
    rnd = random.Random(7)
    n = int(RATE * duration)
    return [volume * (rnd.random() * 2 - 1) * (1 - i / n) for i in range(n)]


def mix(*parts):
    """Concatène des séquences ; une partie peut être (offset_s, samples) pour superposer."""
    length = 0
    layers = []
    for p in parts:
        if isinstance(p, tuple):
            off, s = p
            layers.append((int(off * RATE), s))
            length = max(length, int(off * RATE) + len(s))
        else:
            layers.append((length, p))
            length += len(p)
    buf = [0.0] * length
    for off, s in layers:
        for i, v in enumerate(s):
            buf[off + i] += v
    peak = max(1e-6, max(abs(v) for v in buf))
    return [v / peak * 0.9 for v in buf]


def write(path: Path, samples):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v)) * 32767)) for v in samples))


def main(out_dir: str) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    # Juste : deux notes montantes, claires.
    write(out / "correct.wav", mix(tone(659.25, 0.09), tone(987.77, 0.16)))
    # Faux : une note grave et courte, un peu rugueuse.
    write(out / "wrong.wav", mix(tone(196.0, 0.22, harmonics=(1.0, 0.6, 0.3, 0.15))))
    # Couronne : arpège majeur.
    write(out / "crown.wav", mix(tone(523.25, 0.1), tone(659.25, 0.1), tone(783.99, 0.1), tone(1046.5, 0.3)))
    # Montée de niveau : fanfare courte.
    write(out / "levelup.wav", mix(tone(392.0, 0.12), tone(523.25, 0.12), tone(659.25, 0.12), tone(783.99, 0.36, harmonics=(1.0, 0.5, 0.25, 0.1))))
    # Badge : accord tenu avec scintillement.
    write(out / "badge.wav", mix((0.0, tone(523.25, 0.5)), (0.0, tone(659.25, 0.5)), (0.0, tone(783.99, 0.5)), (0.25, tone(1567.98, 0.25, volume=0.25))))
    # Sans-faute : arpège rapide et long.
    write(out / "perfect.wav", mix(*[tone(f, 0.07) for f in (523.25, 659.25, 783.99, 1046.5, 1318.5)], tone(1568.0, 0.4)))
    # Fin de Blitz : tic-tac accéléré puis gong.
    write(out / "timeup.wav", mix(noise(0.05), tone(880.0, 0.06), noise(0.05), tone(880.0, 0.06), tone(440.0, 0.4, harmonics=(1.0, 0.4, 0.2))))
    # Objectif du jour atteint.
    write(out / "goal.wav", mix(tone(783.99, 0.1), tone(1046.5, 0.1), tone(783.99, 0.1), tone(1046.5, 0.3)))
    for f in sorted(out.glob("*.wav")):
        print(f.name, f.stat().st_size, "octets")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "assets/sounds")
