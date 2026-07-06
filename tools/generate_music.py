#!/usr/bin/env python3
"""
generate_music.py — Bikin jingle iklan yang FUN (bukan dengung sinus).

Menghasilkan 3 lagu loop 16 detik untuk assets/music/{upbeat,trendy,soft}:
  - melodi plucky (ada nada naik-turun, bukan chord ditahan)
  - bassline mengikuti progresi I–V–vi–IV (khas jingle pop/iklan)
  - drum sederhana (kick + hihat + clap) biar ada groove

Butuh: numpy. Output WAV -> dikonversi ke mp3 pakai ffmpeg oleh script pemanggil.
Jalankan: python3 tools/generate_music.py
"""

import numpy as np
import wave, struct, os, subprocess

SR = 44100

# ----- catatan nada (Hz) -----
NOTE = {}
_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
for octave in range(1, 7):
    for i, n in enumerate(_names):
        freq = 440.0 * 2 ** ((octave - 4) + (i - 9) / 12.0)
        NOTE[f"{n}{octave}"] = freq
REST = None


def adsr(n, a=0.005, d=0.08, s=0.0, r=0.05, sustain=0.5):
    """Envelope plucky: attack cepat, decay ke level sustain, lalu release."""
    env = np.zeros(n)
    ai = int(a * SR); di = int(d * SR); ri = int(r * SR)
    ai = max(1, min(ai, n))
    env[:ai] = np.linspace(0, 1, ai)
    if di > 0 and ai + di < n:
        env[ai:ai + di] = np.linspace(1, sustain, di)
        env[ai + di:] = sustain
    else:
        env[ai:] = sustain
    if ri > 0 and ri < n:  # release di ujung
        env[-ri:] *= np.linspace(1, 0, ri)
    return env


def pluck(freq, dur, gain=0.5, harmonics=(1.0, 0.5, 0.28, 0.12), decay=0.6):
    """Nada dengan beberapa harmonik + envelope decay -> terdengar seperti petikan/marimba."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    wave_ = np.zeros(n)
    for i, amp in enumerate(harmonics, start=1):
        wave_ += amp * np.sin(2 * np.pi * freq * i * t)
    env = np.exp(-t / (dur * decay)) * adsr(n, sustain=0.6)
    return gain * wave_ * env


def bass(freq, dur, gain=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    # segitiga-ish (sin + sedikit harmonik ganjil) biar hangat & 'bulat'
    w = np.sin(2 * np.pi * freq * t) + 0.2 * np.sin(2 * np.pi * freq * 3 * t)
    env = np.exp(-t / (dur * 0.9)) * adsr(n, a=0.004, d=0.05, sustain=0.7, r=0.03)
    return gain * w * env


def kick(dur=0.18, gain=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 120 * np.exp(-t / 0.03) + 45     # pitch turun cepat -> "dum"
    w = np.sin(2 * np.pi * np.cumsum(f) / SR)
    env = np.exp(-t / 0.09)
    return gain * w * env


def hihat(dur=0.05, gain=0.28):
    n = int(dur * SR)
    t = np.arange(n) / SR
    w = np.random.uniform(-1, 1, n)
    env = np.exp(-t / 0.015)
    return gain * w * env


def clap(dur=0.14, gain=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    w = np.random.uniform(-1, 1, n)
    env = np.exp(-t / 0.045)
    return gain * w * env


def place(track, sample, at_sec):
    i = int(at_sec * SR)
    if i >= len(track) or i < 0:
        return
    end = min(len(track), i + len(sample))
    track[i:end] += sample[:end - i]


def build(mood):
    """Return float array (mono) 16 detik."""
    np.random.seed({"upbeat": 1, "trendy": 2, "soft": 3}[mood])
    bpm = {"upbeat": 124, "trendy": 128, "soft": 96}[mood]
    beat = 60.0 / bpm
    bar = beat * 4
    total = 16.0
    track = np.zeros(int(total * SR))

    # Progresi akord: I - V - vi - IV (C - G - Am - F), diulang
    prog = [("C", "C4"), ("G", "G3"), ("A", "A3"), ("F", "F3")]
    chord_notes = {
        "C": ["C4", "E4", "G4"], "G": ["G3", "B3", "D4"],
        "A": ["A3", "C4", "E4"], "F": ["F3", "A3", "C4"],
    }

    n_bars = int(total / bar) + 1
    for b in range(n_bars):
        t0 = b * bar
        if t0 >= total:
            break
        chord, bass_root = prog[b % 4]

        # --- Bass: root tiap ketukan (upbeat/trendy) atau tiap 2 ketukan (soft) ---
        step = beat if mood != "soft" else beat * 2
        k = 0
        while k * step < bar:
            place(track, bass(NOTE[bass_root], step * 0.9, gain=0.55), t0 + k * step)
            k += 1

        # --- Melodi: arpeggio/motif dari nada akord, pola ceria ---
        cn = [NOTE[x] for x in chord_notes[chord]]
        if mood == "soft":
            pattern = [0, 2, 1, 2]            # lembut, mengalun
            nlen = beat
            gains = 0.4
        elif mood == "trendy":
            pattern = [0, 1, 2, 1, 2, 1, 0, 2]  # rapat, catchy
            nlen = beat / 2
            gains = 0.42
        else:  # upbeat
            pattern = [0, 2, 1, 2, 0, 2, 1, 2]  # bouncy
            nlen = beat / 2
            gains = 0.45
        for j, deg in enumerate(pattern):
            octshift = 2.0 if (mood != "soft" and j % 4 == 0) else 1.0
            place(track, pluck(cn[deg] * octshift, nlen * 0.95, gain=gains), t0 + j * nlen)

        # --- Drum ---
        if mood != "soft":
            for beat_i in range(4):
                place(track, kick(gain=0.85), t0 + beat_i * beat)          # four-on-floor
                place(track, hihat(gain=0.22), t0 + beat_i * beat + beat / 2)  # offbeat hat
            place(track, clap(gain=0.5), t0 + beat)     # clap di ketukan 2
            place(track, clap(gain=0.5), t0 + 3 * beat) # dan 4
        else:
            for beat_i in range(4):
                place(track, hihat(gain=0.10), t0 + beat_i * beat + beat / 2)
            place(track, kick(gain=0.5), t0)            # kick lembut di awal bar

    # Normalisasi ke -1..1 dengan headroom
    peak = np.max(np.abs(track)) or 1.0
    track = 0.89 * track / peak
    # fade in/out kecil biar loop mulus
    fi = int(0.02 * SR); fo = int(0.25 * SR)
    track[:fi] *= np.linspace(0, 1, fi)
    track[-fo:] *= np.linspace(1, 0, fo)
    return track


def write_wav(path, mono):
    stereo = np.stack([mono, mono], axis=1)
    data = (stereo * 32767).astype(np.int16)
    with wave.open(path, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == "__main__":
    base = os.path.join(os.path.dirname(__file__), "..", "assets", "music")
    for mood in ["upbeat", "trendy", "soft"]:
        d = os.path.join(base, mood)
        os.makedirs(d, exist_ok=True)
        wav = os.path.join(d, f"jingle_{mood}_01.wav")
        mp3 = os.path.join(d, f"jingle_{mood}_01.mp3")
        write_wav(wav, build(mood))
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                        "-i", wav, "-c:a", "libmp3lame", "-b:a", "192k", mp3], check=True)
        os.remove(wav)
        print("OK", mp3)
