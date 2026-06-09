import { logger } from './logger.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.ttsEnabled = true;
    this.arabicVoice = null;
    this.englishVoice = null;

    // Initialize speech synthesis voices once loaded
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
      this._loadVoices();
    }
  }

  /**
   * Initializes the AudioContext upon user gesture.
   */
  async init() {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        logger.success('Audio', 'Web Audio API context initialized successfully.');
      } catch (err) {
        logger.error('Audio', 'Failed to initialize Web Audio API context.', err);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
      logger.info('Audio', 'Audio context resumed.');
    }
  }

  _loadVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    
    // Select best Arabic voice
    this.arabicVoice = voices.find(v => v.lang.startsWith('ar')) || null;
    
    // Select best English voice
    this.englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                         voices.find(v => v.lang.startsWith('en')) || null;

    logger.debug('Audio', 'Voices loaded.', {
      arabic: this.arabicVoice ? this.arabicVoice.name : 'None found',
      english: this.englishVoice ? this.englishVoice.name : 'None found'
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    logger.info('Audio', `Mute state toggled to: ${this.isMuted}`);
    return this.isMuted;
  }

  toggleTts() {
    this.ttsEnabled = !this.ttsEnabled;
    logger.info('Audio', `TTS state toggled to: ${this.ttsEnabled}`);
    return this.ttsEnabled;
  }

  /**
   * Synthesize sound using oscillators and envelope gain.
   */
  _synth(frequency, type, duration, gainVal = 0.12, sweepToFreq = null) {
    if (this.isMuted || !this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      if (sweepToFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(sweepToFreq, this.ctx.currentTime + duration);
      }

      gainNode.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      logger.warn('Audio', 'Oscillator synthesis failed.', e.message);
    }
  }

  playGrab() {
    this.init();
    // Short pop click sound
    this._synth(600, 'sine', 0.05, 0.15, 300);
  }

  playSuccess() {
    this.init();
    // Ascending arpeggio (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this._synth(freq, 'triangle', 0.25, 0.12);
      }, index * 90);
    });
  }

  playIncorrect() {
    this.init();
    // Buzz down frequency
    this._synth(180, 'sawtooth', 0.35, 0.15, 90);
  }

  playCloseTry() {
    this.init();
    // Double pulse alert
    this._synth(380, 'triangle', 0.12, 0.12);
    setTimeout(() => {
      this._synth(440, 'triangle', 0.18, 0.12);
    }, 100);
  }

  playSlideBack() {
    this.init();
    // Downward sweep representing piece sliding back to tray
    this._synth(400, 'sine', 0.3, 0.15, 150);
  }

  /**
   * Speak text in Arabic or English.
   * @param {string} text Text to read.
   * @param {string} lang Language code ('ar' or 'en').
   * @param {Function} onStart Callback on start of speech.
   * @param {Function} onEnd Callback on completion.
   */
  speak(text, lang = 'ar', onStart = null, onEnd = null) {
    if (this.isMuted || !this.ttsEnabled || !('speechSynthesis' in window)) {
      if (onStart) onStart();
      if (onEnd) setTimeout(onEnd, 1500);
      return;
    }

    try {
      // Cancel ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      
      const voice = lang === 'ar' ? this.arabicVoice : this.englishVoice;
      if (voice) {
        utterance.voice = voice;
      }
      
      // Speech speed, pitch parameters optimized for kids
      utterance.rate = lang === 'ar' ? 0.9 : 0.95;
      utterance.pitch = 1.15; 

      if (onStart) utterance.onstart = onStart;
      if (onEnd) utterance.onend = onEnd;
      utterance.onerror = (e) => {
        logger.warn('Audio', 'Speech synthesis error event.', e);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
      logger.info('Audio', `Speaking (${lang}): "${text}"`);
    } catch (e) {
      logger.error('Audio', 'Failed to speak text.', e);
      if (onEnd) onEnd();
    }
  }

  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const audioEngine = new AudioEngine();
