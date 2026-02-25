
// Sound Engine for Monocle
// Uses Web Audio API for generative noise and SFX

class SoundEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private ambientMasterGain: GainNode | null = null;
    private volume: number = 0.5;
    private ambientVolume: number = 0.5;
    private ribbitBuffer: AudioBuffer | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();

    // Track active noise layers
    private activeLayers: Map<string, {
        source: AudioNode, // Can be BufferSource or Oscillator
        gain: GainNode,
        extraNodes: AudioNode[]
    }> = new Map();

    constructor() {
        if (typeof window !== 'undefined') {
            // Lazy init to comply with autoplay policies
            // this.init(); 
        }
    }

    private init() {
        if (!this.ctx) {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            this.ctx = new AudioContextClass();

            // UI SFX master
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            // Ambient backgrounds master
            this.ambientMasterGain = this.ctx.createGain();
            this.ambientMasterGain.connect(this.ctx.destination);

            this.setVolume(this.volume);
            this.setAmbientVolume(this.ambientVolume);
            this.loadRibbit();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    private async loadRibbit() {
        if (this.ribbitBuffer || !this.ctx) return;
        try {
            const response = await fetch('/frog.wav');
            const arrayBuffer = await response.arrayBuffer();
            this.ribbitBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (err) {
            console.error("Failed to play ribbit sound", err);
        }
    }



    public playSkip() {
        this.init();
        const now = 0;
        // Quick downward sweep (like sweeping away)
        this.playTone(300, 'sine', 0.15, now);
        this.playTone(200, 'sine', 0.15, now + 0.05);
        this.playTone(100, 'sine', 0.15, now + 0.1);
    }

    public playHold() {
        this.init();
        const now = 0;
        // Soft muffled double pop
        this.playTone(400, 'triangle', 0.1, now);
        this.playTone(350, 'triangle', 0.1, now + 0.15);
    }

    public playDiceRattle() {
        this.init();
        if (!this.ctx || !this.masterGain) return;

        // Subtler, wooden "click" effect using filtered noise bursts
        const playClick = (timeOffset: number) => {
            if (!this.ctx || !this.masterGain) return;
            const bufferSize = this.ctx.sampleRate * 0.05; // 50ms buffer
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noiseSource = this.ctx.createBufferSource();
            noiseSource.buffer = buffer;

            // Bandpass filter to make it sound "wooden" and less harsh
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1200 + Math.random() * 400;
            filter.Q.value = 1.5;

            // Very tight gain envelope for a sharp click
            const gainNode = this.ctx.createGain();
            const start = this.ctx.currentTime + timeOffset;

            gainNode.gain.setValueAtTime(0, start);
            gainNode.gain.linearRampToValueAtTime(0.4, start + 0.005); // low volume
            gainNode.gain.exponentialRampToValueAtTime(0.01, start + 0.04);

            noiseSource.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);

            noiseSource.start(start);
            noiseSource.stop(start + 0.05);
        };

        // Trigger 3 quick clicks
        let timeOffset = 0;
        for (let i = 0; i < 3; i++) {
            playClick(timeOffset);
            timeOffset += 0.06 + Math.random() * 0.04;
        }
    }
    public setVolume(val: number) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain) {
            // Exponential ramp for natural volume perception
            this.masterGain.gain.setTargetAtTime(this.volume, this.ctx?.currentTime || 0, 0.1);
        }
    }

    public getVolume() {
        return this.volume;
    }

    public setAmbientVolume(val: number) {
        this.ambientVolume = Math.max(0, Math.min(1, val));
        if (this.ambientMasterGain && this.ctx) {
            this.ambientMasterGain.gain.setTargetAtTime(this.ambientVolume, this.ctx.currentTime, 0.1);
        }
    }

    public getAmbientVolume() {
        return this.ambientVolume;
    }

    // --- Mobile Autoplay Unlock ---

    public async unlock(): Promise<void> {
        // Core mobile unlock pattern:
        // 1. Create/Resume Context inside a user event
        // 2. Play a brief silent buffer
        this.init();
        if (!this.ctx || !this.masterGain) return;

        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.masterGain);
        source.start(0);

        // Cleanup prevents memory leaks from thousands of unlocks
        setTimeout(() => {
            if (source) {
                source.stop();
                source.disconnect();
            }
        }, 100);
    }

    public getState(): AudioContextState | 'uninitialized' {
        return this.ctx ? this.ctx.state : 'uninitialized';
    }

    // --- Noise Generators (Layers) ---

    public async toggleNoiseLayer(type: 'white' | 'pink' | 'brown' | 'rain' | 'space' | 'cafe' | 'forest' | 'train', targetVolume: number = 0.5) {
        this.init();
        if (!this.ctx || !this.masterGain) return;

        if (this.activeLayers.has(type)) {
            this.stopNoiseLayer(type);
            return;
        }

        // Setup the new layer
        let extraNodes: AudioNode[] = [];
        let sourceNode: AudioNode;
        let finalNode: AudioNode;
        const layerGain = this.ctx.createGain();

        // Standard noise generation for synthetic types
        if (['white', 'pink', 'brown', 'rain', 'space'].includes(type)) {
            const bufferSize = 2 * this.ctx.sampleRate;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = buffer.getChannelData(0);

            if (type === 'white') {
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
            } else if (type === 'pink') {
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + 0.0555179 * white;
                    b1 = 0.99332 * b1 + 0.0750759 * white;
                    b2 = 0.96900 * b2 + 0.1538520 * white;
                    b3 = 0.86650 * b3 + 0.3104856 * white;
                    b4 = 0.55000 * b4 + 0.5329522 * white;
                    b5 = -0.7616 * b5 - 0.0168980 * white;
                    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                    output[i] *= 0.11;
                    b6 = white * 0.115926;
                }
            } else if (type === 'brown' || type === 'rain' || type === 'space') {
                let lastOut = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    output[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = output[i];
                    output[i] *= 3.5;
                }
            }

            const bufferSource = this.ctx.createBufferSource();
            bufferSource.buffer = buffer;
            bufferSource.loop = true;
            sourceNode = bufferSource;

            const filter = this.ctx.createBiquadFilter();
            bufferSource.connect(filter);
            finalNode = filter;

            if (type === 'white') {
                filter.type = 'lowpass';
                filter.frequency.value = 1000;
            } else if (type === 'pink') {
                filter.type = 'lowpass';
                filter.frequency.value = 800;
            } else if (type === 'brown') {
                filter.type = 'lowpass';
                filter.frequency.value = 400;
            } else if (type === 'rain') {
                filter.type = 'lowpass';
                filter.frequency.value = 400;
                const hp = this.ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 250;
                filter.connect(hp);
                finalNode = hp;
                extraNodes.push(hp);
                targetVolume = targetVolume * 1.5; // Rain needs a boost
            } else if (type === 'space') {
                filter.type = 'lowpass';
                filter.frequency.value = 100;
                filter.Q.value = 5;

                const osc = this.ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 55;
                const oscGain = this.ctx.createGain();
                oscGain.gain.value = 0.3;
                osc.connect(oscGain);
                oscGain.connect(layerGain);
                osc.start();
                extraNodes.push(osc, oscGain);
                targetVolume = targetVolume * 1.5;
            }

            finalNode.connect(layerGain);
            layerGain.connect(this.ambientMasterGain || this.masterGain!);

            layerGain.gain.setValueAtTime(0, this.ctx.currentTime);
            layerGain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.5);

            bufferSource.start();

            this.activeLayers.set(type, { source: sourceNode, gain: layerGain, extraNodes });
        } else if (['cafe', 'forest', 'train'].includes(type)) {
            let buffer = this.buffers.get(type);

            if (!buffer) {
                try {
                    const response = await fetch(`/audio/${type}.mp3`);
                    const arrayBuffer = await response.arrayBuffer();
                    buffer = await this.ctx.decodeAudioData(arrayBuffer);
                    this.buffers.set(type, buffer);
                } catch (err) {
                    console.error(`Failed to load ${type} sample:`, err);
                    return;
                }
            }

            // By the time it loads, the user might have clicked stop
            if (this.activeLayers.has(type)) return;

            const bufferSource = this.ctx.createBufferSource();
            bufferSource.buffer = buffer;
            bufferSource.loop = true;
            sourceNode = bufferSource;

            finalNode = bufferSource;

            finalNode.connect(layerGain);
            layerGain.connect(this.ambientMasterGain || this.masterGain!);

            layerGain.gain.setValueAtTime(0, this.ctx.currentTime);
            layerGain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.5);

            bufferSource.start();

            this.activeLayers.set(type, { source: sourceNode, gain: layerGain, extraNodes });
        } else {
            return;
        }
    }

    public setNoiseLayerVolume(type: string, volume: number) {
        if (!this.ctx) return;
        const layer = this.activeLayers.get(type);
        if (layer) {
            // Clamp 0-1
            const safeVol = Math.max(0, Math.min(1, volume));
            layer.gain.gain.setTargetAtTime(safeVol, this.ctx.currentTime, 0.1);
        }
    }

    public stopNoiseLayer(type: string) {
        if (!this.ctx) return;
        const layer = this.activeLayers.get(type);
        if (!layer) return;

        layer.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
        setTimeout(() => {
            try {
                if (layer.source instanceof AudioBufferSourceNode || layer.source instanceof OscillatorNode) {
                    layer.source.stop();
                }
                layer.source.disconnect();
                layer.extraNodes.forEach(node => {
                    if (node instanceof OscillatorNode) {
                        try { node.stop(); } catch (e) { }
                    }
                    node.disconnect();
                });
            } catch (e) { }
        }, 1000);

        this.activeLayers.delete(type);
    }

    public stopAllNoise() {
        if (!this.ctx) return;
        Array.from(this.activeLayers.keys()).forEach(type => this.stopNoiseLayer(type));
    }

    public getActiveLayers() {
        return Array.from(this.activeLayers.keys());
    }



    // --- Sound Effects ---

    private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration + 0.1);
    }

    public playComplete() {
        this.init();
        // Major Chord Arpeggio (C Major)
        const now = 0;
        this.playTone(523.25, 'sine', 0.6, now);       // C5
        this.playTone(659.25, 'sine', 0.6, now + 0.1); // E5
        this.playTone(783.99, 'sine', 0.8, now + 0.2); // G5
        this.playTone(1046.50, 'sine', 1.0, now + 0.3);// C6
    }

    public playPromote() {
        this.init();
        // Fast ascending sweep (D Major arpeggio)
        const now = 0;
        this.playTone(587.33, 'sine', 0.4, now);        // D5
        this.playTone(739.99, 'sine', 0.4, now + 0.08); // F#5
        this.playTone(880.00, 'sine', 0.5, now + 0.16); // A5
        this.playTone(1174.66, 'sine', 0.6, now + 0.24);// D6
    }

    public playAlarm() {
        this.init();
        if (!this.ctx || !this.masterGain) return;

        // Majestic, resonant bell sound (layered sines with long decay)
        const playBell = (timeOffset: number) => {
            if (!this.ctx || !this.masterGain) return;
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const osc3 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            const start = this.ctx.currentTime + timeOffset;

            // Frequencies for a rich bell tone (A4 base + harmonics)
            osc1.frequency.setValueAtTime(440, start); // Fundamental
            osc2.frequency.setValueAtTime(880, start); // Octave
            osc3.frequency.setValueAtTime(1320, start); // Perfect Fifth above octave

            // Strike envelope
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.4, start + 0.02); // Sharp attack
            gain.gain.exponentialRampToValueAtTime(0.05, start + 1.0); // Ring out
            gain.gain.exponentialRampToValueAtTime(0.001, start + 3.0); // Fade to silence

            osc1.connect(gain);
            osc2.connect(gain);
            osc3.connect(gain);
            gain.connect(this.masterGain);

            osc1.start(start);
            osc2.start(start);
            osc3.start(start);

            osc1.stop(start + 3.0);
            osc2.stop(start + 3.0);
            osc3.stop(start + 3.0);
        };

        // Ring three times
        playBell(0);
        playBell(0.8);
        playBell(1.6);
    }

    public async playRibbit() {
        this.init();
        if (!this.ctx || !this.masterGain) return;

        if (!this.ribbitBuffer) {
            await this.loadRibbit();
        }

        if (this.ribbitBuffer) {
            const source = this.ctx.createBufferSource();
            source.buffer = this.ribbitBuffer;
            const gain = this.ctx.createGain();
            gain.gain.value = 0.6;
            source.connect(gain);
            gain.connect(this.masterGain);
            source.start(0);
        }
    }

    public playStart() {
        this.init();
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    public playAdd() {
        this.init();
        if (!this.ctx || !this.masterGain) return;
        // Bright rising pop
        const now = 0;
        this.playTone(600, 'sine', 0.05, now);
        this.playTone(850, 'sine', 0.1, now + 0.05);
    }

    public playTick() {
        // Mechanical Watch Escapement
        this.init();
        if (!this.ctx || !this.masterGain) return;

        const bufferSize = this.ctx.sampleRate * 0.05; // 50ms buffer
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;

        // Highpass filter to make it sound tiny and metallic
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 4000;
        filter.Q.value = 1.0;

        const gainNode = this.ctx.createGain();
        const start = this.ctx.currentTime;

        gainNode.gain.setValueAtTime(0, start);
        gainNode.gain.linearRampToValueAtTime(0.05, start + 0.002); // Very low volume, sharp click
        gainNode.gain.exponentialRampToValueAtTime(0.001, start + 0.02); // Instant decay

        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        noiseSource.start(start);
        noiseSource.stop(start + 0.05);
    }
}

// Singleton Pattern
export const soundEngine = new SoundEngine();
