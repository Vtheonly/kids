import { logger, LogLevels } from '../core/logger.js';
import { audioEngine } from '../core/audio.js';
import { gameState } from '../core/state.js';

export class UIComponent {
  constructor() {
    this.tabs = document.querySelectorAll('.tab-btn');
    this.panels = document.querySelectorAll('.worksheet-panel');
    this.modeSelectorWrapper = document.getElementById('mode-selector-wrapper');
    this.btnChallenge = document.getElementById('btn-challenge');
    this.btnFree = document.getElementById('btn-free');
    
    this.btnMute = document.getElementById('btn-mute');
    this.btnTts = document.getElementById('btn-tts');

    // Victory Dialog Elements
    this.successDialog = document.getElementById('success-dialog');
    this.successHeadline = document.getElementById('success-headline');
    this.successSub = document.getElementById('success-sub');
    this.btnPlayAgain = document.getElementById('btn-play-again');

    // Collapsible Log Panel
    this.logPanel = document.getElementById('dev-log-panel');
    this.logHeader = document.getElementById('dev-log-header');
    this.logBody = document.getElementById('dev-log-body');
    this.logContent = document.getElementById('dev-log-content');
    this.btnLogClear = document.getElementById('dev-log-clear');
    this.btnLogClose = document.getElementById('dev-log-toggle');
  }

  init() {
    logger.info('UI', 'Initializing UI Component...');
    
    this.bindTabEvents();
    this.bindModeEvents();
    this.bindControlEvents();
    this.bindLogEvents();
    this.bindVictoryEvents();

    // Subscribe to state to update active tabs
    gameState.subscribe(state => this.onStateUpdate(state));
  }

  bindTabEvents() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        gameState.setTab(tabName);
      });
    });
  }

  bindModeEvents() {
    if (this.btnChallenge) {
      this.btnChallenge.addEventListener('click', () => {
        gameState.setMode('challenge');
      });
    }
    if (this.btnFree) {
      this.btnFree.addEventListener('click', () => {
        gameState.setMode('free');
      });
    }
  }

  bindControlEvents() {
    if (this.btnMute) {
      this.btnMute.addEventListener('click', () => {
        const isMuted = audioEngine.toggleMute();
        this.btnMute.classList.toggle('active', isMuted);
        this.btnMute.innerHTML = isMuted ? '🔇' : '🔊';
        logger.info('UI', `Mute button clicked. Sound is now ${isMuted ? 'OFF' : 'ON'}.`);
      });
    }

    if (this.btnTts) {
      this.btnTts.addEventListener('click', () => {
        const isTtsEnabled = audioEngine.toggleTts();
        this.btnTts.classList.toggle('active', !isTtsEnabled);
        this.btnTts.innerHTML = isTtsEnabled ? '💬' : '🔕';
        logger.info('UI', `TTS button clicked. Voice prompts are now ${isTtsEnabled ? 'ENABLED' : 'DISABLED'}.`);
      });
    }

    if (this.btnPlayAgain) {
      this.btnPlayAgain.addEventListener('click', () => {
        logger.info('UI', 'Play again clicked. Resetting workspace...');
        this.hideVictory();
        
        // Dispatch global reset event
        window.dispatchEvent(new CustomEvent('game-reset'));
      });
    }
  }

  bindVictoryEvents() {
    window.addEventListener('board-victory', () => {
      this.showVictory(
        "عمل رائع! لقد أكملت اللوحة التفاعلية!",
        "Excellent work! You matched all the board shapes!"
      );
    });

    window.addEventListener('colors-victory', () => {
      this.showVictory(
        "أحسنت! لقد لونت ورقة الألوان بنجاح!",
        "Great job! You colored the geometry sheet successfully!"
      );
    });

    window.addEventListener('shapes-victory', () => {
      this.showVictory(
        "رائع! لقد أكملت سلسلة الأشكال والأنماط!",
        "Fantastic! You solved the split shapes and sequence puzzle!"
      );
    });
  }

  bindLogEvents() {
    // Toggle collapsible log
    if (this.logHeader) {
      this.logHeader.addEventListener('click', () => {
        const isExpanded = this.logBody.classList.toggle('expanded');
        if (this.btnLogClose) {
          this.btnLogClose.textContent = isExpanded ? '▼' : '▲';
        }
        logger.debug('UI', `Logger console panel ${isExpanded ? 'expanded' : 'collapsed'}.`);
      });
    }

    if (this.btnLogClear) {
      this.btnLogClear.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent expanding/collapsing
        logger.clear();
        this.logContent.innerHTML = '';
        logger.info('UI', 'Local console logs cleared.');
      });
    }

    // Subscribe to logger events to show real-time logs
    logger.subscribe((logEntry) => {
      if (logEntry.type === 'clear') {
        this.logContent.innerHTML = '';
        return;
      }
      this.appendLogLine(logEntry);
    });
  }

  appendLogLine(logEntry) {
    if (!this.logContent) return;

    const line = document.createElement('div');
    line.className = 'log-line';
    line.style.borderLeft = `3px solid ${logEntry.level.color}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = logEntry.timestamp.toLocaleTimeString();

    const moduleSpan = document.createElement('span');
    moduleSpan.className = 'log-module';
    moduleSpan.textContent = `[${logEntry.module}]`;

    const msgSpan = document.createElement('span');
    msgSpan.className = 'log-message';
    msgSpan.textContent = logEntry.message;
    if (logEntry.level === LogLevels.ERROR) {
      msgSpan.style.color = LogLevels.ERROR.color;
    } else if (logEntry.level === LogLevels.SUCCESS) {
      msgSpan.style.color = LogLevels.SUCCESS.color;
    }

    line.appendChild(timeSpan);
    line.appendChild(moduleSpan);
    line.appendChild(msgSpan);

    this.logContent.appendChild(line);

    // Scroll to bottom
    this.logContent.scrollTop = this.logContent.scrollHeight;
  }

  onStateUpdate(state) {
    // Update active tab styles
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === state.activeTab);
    });

    // Update active panel display
    this.panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${state.activeTab}`);
    });

    // Show mode selector only for board
    if (this.modeSelectorWrapper) {
      this.modeSelectorWrapper.style.display = state.activeTab === 'board' ? 'flex' : 'none';
    }

    // Update active mode button state
    if (this.btnChallenge && this.btnFree) {
      this.btnChallenge.classList.toggle('active', state.mode === 'challenge');
      this.btnFree.classList.toggle('active', state.mode === 'free');
    }
  }

  showVictory(arTitle, enTitle) {
    this.successHeadline.textContent = arTitle;
    this.successSub.textContent = enTitle;
    this.successDialog.classList.add('show');
    
    // Play celebratory sound effects loop
    audioEngine.playSuccess();
    this.victoryTimer = setInterval(() => {
      window.dispatchEvent(new CustomEvent('celebration-burst'));
    }, 450);

    // Speak victory prompts
    audioEngine.speak(arTitle, 'ar', null, () => audioEngine.speak(enTitle, 'en'));
  }

  hideVictory() {
    this.successDialog.classList.remove('show');
    if (this.victoryTimer) {
      clearInterval(this.victoryTimer);
      this.victoryTimer = null;
    }
  }
}
