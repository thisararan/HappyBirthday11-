/* =========================================================
   CELEBRATION AUDIO SYNTHESIZER (Web Audio API)
   Multi-tone celebratory birthday music engine
   Completely offline, zero external dependencies or broken links
   ========================================================= */

class BirthdayAudio {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.isMuted = false;
        this.currentNotesTimeout = [];
        this.previewingTune = null;
        this.customSrc = null;   // data URL / URL of a user-uploaded audio track
        this.customEl = null;    // <audio> element currently playing that track
    }

    // ---------- Custom (uploaded) audio track ----------
    setCustomAudio(src) {
        this.customSrc = src || null;
        if (!this.customSrc) this._stopCustom();
    }

    _stopCustom() {
        if (this.customEl) {
            try { this.customEl.pause(); this.customEl.removeAttribute('src'); this.customEl.load(); } catch (e) {}
            this.customEl = null;
        }
    }

    _playCustom(onEndCallback) {
        this._stopCustom();
        const el = new Audio(this.customSrc);
        el.muted = this.isMuted;
        const finish = () => {
            if (this.customEl !== el) return;
            this.isPlaying = false;
            this.previewingTune = null;
            this.customEl = null;
            if (onEndCallback) onEndCallback();
        };
        el.addEventListener('ended', finish);
        el.addEventListener('error', finish);
        this.customEl = el;
        const pr = el.play();
        if (pr && pr.catch) pr.catch(finish);
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this._buildMasterChain();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Master output: soft compressor + gentle echo/reverb so synth notes sound fuller
    _buildMasterChain() {
        const c = this.ctx;
        this.master = c.createGain();
        this.master.gain.value = 0.9;
        const comp = c.createDynamicsCompressor();
        this.comp = comp;
        comp.threshold.value = -18;
        comp.ratio.value = 4;
        this.master.connect(comp);
        comp.connect(c.destination);

        // Simple feedback-delay reverb
        const delay = c.createDelay(0.6);
        delay.delayTime.value = 0.16;
        const fb = c.createGain();
        fb.gain.value = 0.28;
        const damp = c.createBiquadFilter();
        damp.type = 'lowpass';
        damp.frequency.value = 2600;
        const wet = c.createGain();
        wet.gain.value = 0.22;
        this.master.connect(delay);
        delay.connect(damp);
        damp.connect(fb);
        fb.connect(delay);
        damp.connect(wet);
        wet.connect(comp);
    }

    // opts: { attack, filter, vibrato }
    playTone(freq, duration, type = 'triangle', startTime = 0, gainLevel = 0.15, opts = {}) {
        if (this.isMuted || !this.ctx || !freq) return;

        const t0 = this.ctx.currentTime + startTime;
        const attack = opts.attack || 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);

        if (opts.vibrato) {
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.value = 5.5;
            lfoGain.gain.value = freq * 0.006;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(t0);
            lfo.stop(t0 + duration);
        }

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.exponentialRampToValueAtTime(gainLevel, t0 + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(duration - 0.02, attack + 0.02));

        let out = gain;
        osc.connect(gain);
        if (opts.filter) {
            const f = this.ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = opts.filter;
            gain.connect(f);
            out = f;
        }
        out.connect(this.master || this.ctx.destination);

        osc.start(t0);
        osc.stop(t0 + duration);
    }

    // Sound effect: Party Popper / Confetti Burst
    playPartyPopper() {
        this.init();
        if (this.isMuted || !this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1400;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();

        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            this.playTone(freq, 0.3, 'sine', i * 0.06, 0.12);
        });
    }

    // Sound effect: Candle Blow Out
    playCandleBlow() {
        this.init();
        if (this.isMuted || !this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.4);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();

        setTimeout(() => {
            [880, 1174.66, 1396.91, 1760].forEach((freq, idx) => {
                this.playTone(freq, 0.4, 'sine', idx * 0.08, 0.1);
            });
        }, 300);
    }

    playUnwrapSound() {
        this.init();
        if (this.isMuted || !this.ctx) return;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            this.playTone(freq, 0.35, 'sine', i * 0.07, 0.15);
        });
    }

    // Stop currently playing tune
    stopMelody() {
        this.isPlaying = false;
        this.previewingTune = null;
        this.currentNotesTimeout.forEach(clearTimeout);
        this.currentNotesTimeout = [];
        this._stopCustom();
        // Cut audio that is already sounding (notes + echo tail) right away
        if (this.ctx && this.master) {
            try { this.master.disconnect(); } catch (e) {}
            try { if (this.comp) this.comp.disconnect(); } catch (e) {}
            this._buildMasterChain();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.customEl) {
            this.customEl.muted = this.isMuted;   // uploaded track: just mute / unmute it
        } else if (this.isMuted) {
            this.stopMelody();
        }
        return this.isMuted;
    }

    // ---------- Tune library ----------
    static get TUNES() {
        const HB = 'C4:.75 C4:.25 D4:1 C4:1 F4:1 E4:2 C4:.75 C4:.25 D4:1 C4:1 G4:1 F4:2 ' +
                   'C4:.75 C4:.25 C5:1 A4:1 F4:1 E4:1 D4:1.5 Bb4:.75 Bb4:.25 A4:1 F4:1 G4:1 F4:2.5';
        const HB_CHORDS = [['C', 6], ['G7', 3], ['C', 3], ['C', 2.5], ['F', 4], ['F', 3.25], ['C', 3.25]];
        return {
            classic: {
                tempo: 380, wave: 'triangle', gain: 0.18, harm: 0.5, melody: HB,
                chords: HB_CHORDS, backing: 'pad'
            },
            musicbox: {
                tempo: 350, wave: 'sine', gain: 0.16, harm: 0.5, attack: 0.01,
                melody: 'C5:.8 C5:.3 D5:1 C5:1 F5:1 E5:2 C5:.8 C5:.3 D5:1 C5:1 G5:1 F5:2 ' +
                        'C5:.8 C5:.3 C6:1 A5:1 F5:1 E5:1 D5:1.5 Bb5:.8 Bb5:.3 A5:1 F5:1 G5:1 F5:2.5',
                backing: 'none', harmVal: 2
            },
            party_beat: {
                tempo: 280, wave: 'sawtooth', gain: 0.10, harm: 0.25, filter: 2400,
                melody: 'C4:.5 C4:.5 D4:1 C4:1 F4:1 E4:1.5 C4:.5 C4:.5 D4:1 C4:1 G4:1 F4:1.5 ' +
                        'C4:.5 C4:.5 C5:1 A4:1 F4:1 E4:1 D4:1.5 Bb4:.5 Bb4:.5 A4:1 F4:1 G4:1 F4:2',
                chords: HB_CHORDS, backing: 'oompah'
            },
            fanfare: {
                tempo: 360, wave: 'triangle', gain: 0.18, harm: 0.4,
                melody: 'C4:.4 E4:.4 G4:.8 C5:1.5 C4:.75 C4:.25 D4:1 C4:1 F4:1 E4:2 ' +
                        'G4:.5 C5:.5 E5:1.2 C5:.75 C5:.25 C5:1 A4:1 F4:1 E4:1 D4:1.5 Bb4:.75 A4:1 G4:1 F4:3',
                chords: [['C', 4], ['C', 4], ['C', 4], ['F', 6], ['F', 6]], backing: 'pad'
            },
            // ---- New tunes ----
            waltz: {
                tempo: 420, wave: 'triangle', gain: 0.17, harm: 0.5, vibrato: true, melody: HB,
                chords: HB_CHORDS, backing: 'waltz'
            },
            chiptune: {
                tempo: 210, wave: 'square', gain: 0.07, harm: 2, filter: 3200, attack: 0.01,
                melody: HB.replace(/([A-G][b#]?)(\d)/g, (m, n, o) => n + (parseInt(o, 10) + 1)),  // one octave up for bright 8-bit feel
                chords: HB_CHORDS, backing: 'arp'
            },
            jazz: {
                tempo: 400, wave: 'sine', gain: 0.17, harm: 2, filter: 2200, attack: 0.02,
                melody: 'C4:.67 C4:.33 D4:1 C4:1 F4:1 E4:2 C4:.67 C4:.33 D4:1 C4:1 G4:1 F4:2 ' +
                        'C4:.67 C4:.33 C5:1 A4:1 F4:1 E4:1 D4:1.5 Bb4:.67 Bb4:.33 A4:1 F4:1 G4:1 F4:2.5',
                chords: HB_CHORDS, backing: 'walk'
            },
            rock: {
                tempo: 300, wave: 'sawtooth', gain: 0.11, harm: 0.5, filter: 1800, attack: 0.01,
                melody: HB, chords: HB_CHORDS, backing: 'power'
            },
            ode: {
                tempo: 400, wave: 'triangle', gain: 0.18, harm: 0.5,
                melody: 'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:.5 D4:2 ' +
                        'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:.5 C4:2',
                chords: [['C', 4], ['G7', 4], ['C', 4], ['G7', 2], ['C', 2], ['C', 4], ['G7', 4], ['C', 4], ['G7', 2], ['C', 2]],
                backing: 'oompah'
            },
            lullaby: {
                tempo: 520, wave: 'sine', gain: 0.17, harm: 0.5, attack: 0.06, vibrato: true,
                melody: 'E4:1 E4:1 G4:2 E4:1 E4:1 G4:2 E4:1 G4:1 C5:1.5 B4:.5 A4:1 A4:1 G4:2 ' +
                        'D4:1 E4:1 F4:2 D4:1 D4:1 E4:1 F4:1 D4:1 F4:1 B4:1.5 A4:.5 G4:1 G4:1 C4:3',
                chords: [['C', 6], ['C', 6], ['F', 3], ['C', 3], ['G7', 6], ['G7', 6], ['G7', 3], ['C', 3]],
                backing: 'pad'
            },
            elise: {
                tempo: 220, wave: 'triangle', gain: 0.2, harm: 2, attack: 0.008, filter: 3600,
                melody: 'E5:1 D#5:1 E5:1 D#5:1 E5:1 B4:1 D5:1 C5:1 A4:3 R:1 C4:1 E4:1 A4:1 B4:3 R:1 E4:1 G#4:1 B4:1 C5:3 R:1 ' +
                        'E4:1 E5:1 D#5:1 E5:1 D#5:1 E5:1 B4:1 D5:1 C5:1 A4:3 R:1 C4:1 E4:1 A4:1 B4:3 R:1 E4:1 C5:1 B4:1 A4:4',
                backing: 'none'
            }
        };
    }

    _noteFreq(name) {
        const m = /^([A-G])([b#]?)(\d)$/.exec(name);
        if (!m) return 0;
        const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
        const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
        const midi = 12 * (parseInt(m[3], 10) + 1) + base + acc;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    _parseMelody(str) {
        return str.trim().split(/\s+/).map(tok => {
            const [n, d] = tok.split(':');
            return { note: n === 'R' ? 0 : this._noteFreq(n), dur: parseFloat(d) };
        });
    }

    // Chord tones: [root/bass, third, fifth, (seventh)]
    _chord(name) {
        const C = {
            C:  ['C3', 'E3', 'G3', 'A3'],
            F:  ['F3', 'A3', 'C4', 'E4'],
            G7: ['G3', 'B3', 'D4', 'F4']
        };
        return (C[name] || C.C).map(n => this._noteFreq(n));
    }

    // Schedule the accompaniment (bass / chords / arpeggios) under the melody
    _scheduleBacking(cfg, totalBeats) {
        const style = cfg.backing || 'none';
        if (style === 'none' || !cfg.chords) return;
        const tempo = cfg.tempo;
        const beatSec = tempo / 1000;

        // Turn chord list into beat ranges
        const ranges = [];
        let pos = 0;
        cfg.chords.forEach(([name, beats]) => { ranges.push({ start: pos, end: pos + beats, tones: this._chord(name) }); pos += beats; });
        const chordAt = (b) => (ranges.find(r => b >= r.start && b < r.end) || ranges[ranges.length - 1]).tones;

        const at = (beat, fn) => {
            this.currentNotesTimeout.push(setTimeout(() => {
                if (this.isPlaying && !this.isMuted) fn();
            }, beat * tempo));
        };
        const bar3 = style === 'waltz';
        const step = style === 'arp' ? 0.5 : 1;

        for (let b = 0, i = 0; b < totalBeats; b += step, i++) {
            const t = chordAt(b);
            const beat = Math.round(b * 2) / 2;
            if (style === 'pad') {
                if (ranges.some(r => Math.abs(r.start - b) < 0.01)) {
                    const len = beatSec * 3;
                    at(b, () => t.slice(0, 3).forEach(f => this.playTone(f, len, 'sine', 0, 0.05, { attack: 0.15 })));
                }
            } else if (style === 'oompah') {
                at(b, () => {
                    if (beat % 2 === 0) this.playTone(t[0], beatSec * 0.9, 'triangle', 0, 0.16);
                    else t.slice(1, 3).forEach(f => this.playTone(f, beatSec * 0.5, 'triangle', 0, 0.07));
                });
            } else if (style === 'waltz') {
                at(b, () => {
                    if (beat % 3 === 0) this.playTone(t[0] * 0.5, beatSec * 1.1, 'sine', 0, 0.2);
                    else t.slice(1, 3).forEach(f => this.playTone(f, beatSec * 0.6, 'triangle', 0, 0.06));
                });
            } else if (style === 'walk') {
                const walk = [t[0], t[1], t[2], t[1]];
                at(b, () => {
                    this.playTone(walk[beat % 4], beatSec * 0.95, 'triangle', 0, 0.2, { filter: 700 });
                    if (beat % 2 === 1) t.slice(1).forEach(f => this.playTone(f * 2, beatSec * 0.4, 'sine', 0, 0.035));
                });
            } else if (style === 'arp') {
                const arp = [t[0], t[1], t[2], t[1]];
                at(b, () => this.playTone(arp[i % 4] * 2, beatSec * 0.45, 'square', 0, 0.03, { attack: 0.005 }));
            } else if (style === 'power') {
                at(b, () => {
                    this.playTone(t[0], beatSec * 0.9, 'sawtooth', 0, 0.09, { filter: 900 });
                    this.playTone(t[2], beatSec * 0.9, 'sawtooth', 0, 0.06, { filter: 900 });
                    if (beat % 2 === 0) this.playTone(t[0] * 0.5, beatSec * 0.4, 'sine', 0, 0.22); // kick-like thump
                });
            }
        }
    }

    // Play chosen tune by key (see BirthdayAudio.TUNES)
    playTune(tuneId = 'classic', onEndCallback) {
        this.init();
        this.stopMelody();
        this.isPlaying = true;

        if (tuneId === 'custom' && this.customSrc) {
            this._playCustom(onEndCallback);
            return;
        }

        const cfg = BirthdayAudio.TUNES[tuneId] || BirthdayAudio.TUNES.classic;
        const melody = this._parseMelody(cfg.melody);
        const totalBeats = melody.reduce((sum, m) => sum + m.dur, 0);

        this._runMelodyLoop(melody, cfg, onEndCallback);
        this._scheduleBacking(cfg, totalBeats);
    }

    _runMelodyLoop(melody, cfg, onEndCallback) {
        const tempo = cfg.tempo;
        const opts = { attack: cfg.attack, filter: cfg.filter, vibrato: cfg.vibrato };
        let elapsed = 0;
        melody.forEach((item, idx) => {
            const timeout = setTimeout(() => {
                if (this.isPlaying && !this.isMuted && item.note) {
                    const len = (item.dur * tempo) / 1000;
                    this.playTone(item.note, len, cfg.wave, 0, cfg.gain, opts);
                    if (cfg.harm) {
                        this.playTone(item.note * cfg.harm, len, 'sine', 0, cfg.gain * 0.4, { attack: cfg.attack });
                    }
                }
                if (idx === melody.length - 1) {
                    this.isPlaying = false;
                    this.previewingTune = null;
                    if (onEndCallback) onEndCallback();
                }
            }, elapsed);
            this.currentNotesTimeout.push(timeout);
            elapsed += item.dur * tempo;
        });
    }

    // Preview tune in the studio
    previewTune(tuneId, onEnd) {
        if (this.isPlaying && this.previewingTune === tuneId) {
            this.stopMelody();
            return false; // stopped
        }
        this.playTune(tuneId, onEnd);
        this.previewingTune = tuneId;
        return true; // playing
    }
}

window.birthdayAudio = new BirthdayAudio();
