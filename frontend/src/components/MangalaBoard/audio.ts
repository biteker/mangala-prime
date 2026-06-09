/**
 * Procedural Audio Synthesizer for Mangala Board Game
 * Uses Web Audio API to generate high-quality sound effects dynamically.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  /**
   * Initializes the AudioContext lazily on user interaction.
   */
  private initContext(): boolean {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch((e) => console.warn('Failed to resume AudioContext:', e));
      }
      return true;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API is not supported in this browser.');
      return false;
    }

    try {
      this.ctx = new AudioContextClass();
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.35, this.ctx.currentTime); // Default moderate volume
      this.masterVolume.connect(this.ctx.destination);
      return true;
    } catch (e) {
      console.error('Failed to create AudioContext:', e);
      return false;
    }
  }

  /**
   * Toggles mute state.
   */
  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterVolume && this.ctx) {
      this.masterVolume.gain.setValueAtTime(muted ? 0 : 0.35, this.ctx.currentTime);
    }
  }

  /**
   * Helper to create a noise buffer for scraping sounds.
   */
  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Sound 1: Gather Sound (Soft wooden scraping or rustling)
   */
  public playGather(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const master = this.masterVolume;
    
    // Create noise source
    const noiseBuffer = this.createNoiseBuffer();
    if (!noiseBuffer) return;
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Filter to simulate wooden texture (low-pass sweeps)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.0, now);
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(450, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.35);

    // Gain node for envelope
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.02, now + 0.2);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 0.35);

    // Sine undertone for solid wood weight
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.3);
    
    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    // Connections
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(master);

    osc.connect(oscGain);
    oscGain.connect(master);

    // Play
    noiseSource.start(now);
    noiseSource.stop(now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Sound 2: Intermediate Drop Sound (Crisp marble on wood/marble clink)
   */
  public playDrop(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const master = this.masterVolume;

    // We synthesize two main frequencies representing marble impact and wood resonance
    
    // High-pitched crystal clink (oscillator 1)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    // Metallic non-harmonic frequency combination
    osc1.frequency.setValueAtTime(2400, now);
    osc1.frequency.exponentialRampToValueAtTime(1600, now + 0.08);

    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // Secondary ring tone for marble weight (oscillator 2)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1950, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.12);

    gain2.gain.setValueAtTime(0.05, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    // Wood hollow resonance (oscillator 3)
    const osc3 = this.ctx.createOscillator();
    const gain3 = this.ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(280, now);
    osc3.frequency.linearRampToValueAtTime(220, now + 0.15);

    gain3.gain.setValueAtTime(0.12, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Bandpass filtered noise burst for initial impact click
    const noiseSource = this.ctx.createBufferSource();
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.02, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    noiseSource.buffer = noiseBuffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1800, now);
    noiseFilter.Q.setValueAtTime(10, now);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    // Connect and start
    osc1.connect(gain1);
    gain1.connect(master);

    osc2.connect(gain2);
    gain2.connect(master);

    osc3.connect(gain3);
    gain3.connect(master);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    osc1.start(now);
    osc1.stop(now + 0.1);
    osc2.start(now);
    osc2.stop(now + 0.15);
    osc3.start(now);
    osc3.stop(now + 0.18);
    noiseSource.start(now);
    noiseSource.stop(now + 0.02);
  }

  /**
   * Sound 3: Treasury Capture Sound (Rich crystal/metallic bell chime with delay and decay)
   */
  public playTreasuryCapture(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const master = this.masterVolume;

    // List of harmonic notes that form a beautiful sparkling major chord
    // C6 (1046.50Hz), E6 (1318.51Hz), G6 (1567.98Hz), C7 (2093.00Hz)
    const frequencies = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
    const gains = [0.06, 0.05, 0.05, 0.04, 0.03, 0.02, 0.01];

    // Simple feedback delay/echo simulator using Web Audio nodes
    const delay = this.ctx.createDelay(1.0);
    delay.delayTime.setValueAtTime(0.15, now);
    
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.45, now);

    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(2500, now);

    // Connect feedback loop
    delay.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delay);

    // Chime master gain node
    const chimeMasterGain = this.ctx.createGain();
    chimeMasterGain.gain.setValueAtTime(1.0, now);
    
    // Connect chime node to delay and output
    chimeMasterGain.connect(master);
    chimeMasterGain.connect(delay);
    delay.connect(master);

    // Spawn oscillators
    frequencies.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      // Add a slight frequency offset for chorus detune feel
      osc.frequency.setValueAtTime(freq + (Math.random() * 4 - 2), now);

      // Give each oscillator a slightly staggered start/attack
      const stagger = index * 0.015;
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(gains[index], now + stagger + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + stagger + 1.2 + index * 0.15);

      osc.connect(gainNode);
      gainNode.connect(chimeMasterGain);

      osc.start(now);
      osc.stop(now + 2.0);
    });
  }

  /**
   * Sound 4: Turn Start Sound (Soft notification chime: ascending major third)
   */
  public playTurnStart(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const master = this.masterVolume;

    // First note: C5 (523.25 Hz)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    // Second note: E5 (659.25 Hz) slightly delayed
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.08);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.001, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(master);
    osc2.connect(gain2);
    gain2.connect(master);

    osc1.start(now);
    osc1.stop(now + 0.3);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.4);
  }

  /**
   * Sound 5: Time Warning Sound (Rhythmic tick-tock woodblock sound)
   * @param tone 'tick' (high) or 'tock' (low)
   */
  public playTick(tone: 'tick' | 'tock' = 'tick'): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const master = this.masterVolume;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    const frequency = tone === 'tick' ? 440 : 350;
    osc.frequency.setValueAtTime(frequency, now);

    // Short woodblock envelope
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    // Add a tiny noise burst for the wood strike
    const noiseSource = this.ctx.createBufferSource();
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.01, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, now);
    noiseFilter.Q.setValueAtTime(5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.03, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

    osc.connect(gainNode);
    gainNode.connect(master);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    osc.start(now);
    osc.stop(now + 0.06);
    noiseSource.start(now);
    noiseSource.stop(now + 0.01);
  }

  /**
   * Sound 6: Game End Fanfares (Upbeat major arpeggio for win, descending minor chords for loss)
   */
  public playGameEnd(win: boolean): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const master = this.masterVolume;

    if (win) {
      // Victory: Ascending C-major arpeggio C4 - E4 - G4 - C5 - E5 - G5 - C6
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      const tempo = 0.08;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        // Bright triangle sound for fanfare feel
        osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * tempo);

        const startTime = now + idx * tempo;
        const duration = idx === notes.length - 1 ? 0.8 : 0.25;

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gainNode);
        gainNode.connect(master);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      });
    } else {
      // Loss: Descending minor sliding chords
      // Note roots: G4 (392.00), Eb4 (311.13), C4 (261.63), B3 (246.94)
      const roots = [392.00, 311.13, 261.63, 246.94];
      const tempo = 0.16;

      roots.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        // Sine wave for smooth somber tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * tempo);
        // Pitch bend downwards
        osc.frequency.linearRampToValueAtTime(freq * 0.96, now + idx * tempo + 0.4);

        const startTime = now + idx * tempo;
        const duration = 0.5;

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.linearRampToValueAtTime(0.07, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gainNode);
        gainNode.connect(master);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      });
    }
  }
}

// Export a singleton instance of the audio synthesizer
export const soundManager = new AudioSynthesizer();
