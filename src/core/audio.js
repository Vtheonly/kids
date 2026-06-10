import { logger } from './logger.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.ttsEnabled = true;
    this.arabicVoice = null;
    this.englishVoice = null;

    this.rightFiles = [
      'assets/Voice/Right/silma-tts-audio-1781071832492.wav',
      'assets/Voice/Right/silma-tts-audio-1781071845963.wav',
      'assets/Voice/Right/silma-tts-audio-1781071863250.wav',
      'assets/Voice/Right/silma-tts-audio-1781071875546.wav',
      'assets/Voice/Right/silma-tts-audio-1781071888713.wav',
      'assets/Voice/Right/silma-tts-audio-1781071899513.wav',
      'assets/Voice/Right/silma-tts-audio-1781071909032.wav'
    ];

    this.wrongFiles = [
      'assets/Voice/Wrong/silma-tts-audio-1781071944983.wav',
      'assets/Voice/Wrong/silma-tts-audio-1781071955134.wav',
      'assets/Voice/Wrong/silma-tts-audio-1781071971486.wav',
      'assets/Voice/Wrong/silma-tts-audio-1781071980166.wav',
      'assets/Voice/Wrong/silma-tts-audio-1781071990773.wav',
      'assets/Voice/Wrong/silma-tts-audio-1781072004004.wav'
    ];

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
      this._loadVoices();
    }
  }

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
    this.arabicVoice = voices.find(v => v.lang.startsWith('ar')) || null;
    this.englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                         voices.find(v => v.lang.startsWith('en')) || null;
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

  _playLocalWav(fileUrl) {
    if (this.isMuted) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        const audio = new Audio(fileUrl);
        audio.preload = 'auto';
        audio.play()
          .then(() => {
            logger.info('Audio', `Playing custom audio track: ${fileUrl}`);
            resolve(true);
          })
          .catch((err) => {
            logger.warn('Audio', `Failed playing custom file ${fileUrl}: ${err.message}`);
            resolve(false);
          });
      } catch (e) {
        logger.warn('Audio', `Error initializing audio for ${fileUrl}: ${e.message}`);
        resolve(false);
      }
    });
  }

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
      logger.warn('Audio', 'Oscillator fallback failed.', e.message);
    }
  }

  playGrab() {
    this.init();
    this._synth(600, 'sine', 0.05, 0.15, 300);
  }

  playSuccess() {
    this.init();
    const randomWav = this.rightFiles[Math.floor(Math.random() * this.rightFiles.length)];
    this._playLocalWav(randomWav).then((played) => {
      // Play a fast sparkling game pop sound as a secondary layer
      this._synth(880, 'sine', 0.15, 0.1); 
      setTimeout(() => this._synth(1320, 'sine', 0.2, 0.08), 80);

      if (!played) {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, index) => {
          setTimeout(() => {
            this._synth(freq, 'triangle', 0.25, 0.12);
          }, index * 90);
        });
      }
    });
  }

  playIncorrect() {
    this.init();
    const randomWav = this.wrongFiles[Math.floor(Math.random() * this.wrongFiles.length)];
    this._playLocalWav(randomWav).then((played) => {
      if (!played) {
        this._synth(180, 'sawtooth', 0.35, 0.15, 90);
      }
    });
  }

  playCloseTry() {
    this.init();
    this._synth(380, 'triangle', 0.12, 0.12);
    setTimeout(() => {
      this._synth(440, 'triangle', 0.18, 0.12);
    }, 100);
  }

  playSlideBack() {
    this.init();
    this._synth(400, 'sine', 0.3, 0.15, 150);
  }

  speak(text, lang = 'ar', onStart = null, onEnd = null) {
    if (lang === 'en') {
      if (onStart) onStart();
      if (onEnd) onEnd();
      return;
    }

    if (this.isMuted || !this.ttsEnabled || !('speechSynthesis' in window)) {
      if (onStart) onStart();
      if (onEnd) setTimeout(onEnd, 1500);
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      
      if (this.arabicVoice) {
        utterance.voice = this.arabicVoice;
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1.15; 

      if (onStart) utterance.onstart = onStart;
      if (onEnd) utterance.onend = onEnd;
      utterance.onerror = (e) => {
        logger.warn('Audio', 'Speech synthesis error event.', e);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
      logger.info('Audio', `Speaking (ar): "${text}"`);
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