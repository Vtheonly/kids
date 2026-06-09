import { logger } from '../core/logger.js';
import { audioEngine } from '../core/audio.js';
import { gameState, rowsData } from '../core/state.js';

export class ShapesComponent {
  constructor(panelEl) {
    this.panel = panelEl;
    this.paletteWrapper = panelEl.querySelector('#shapes-palette-wrapper');
    this.sequenceContainer = panelEl.querySelector('#pattern-sequence-container');
    this.unsubscribeState = null;
  }

  mount() {
    logger.info('ShapesWorksheet', 'Mounting Shapes Worksheet Component...');
    this.renderPalette();
    this.renderReferenceCard();
    this.resetShapes();
    this.renderSequence();

    this.unsubscribeState = gameState.subscribe((state) => {
      if (state.activeTab !== 'shapes') return;
      this.syncUIWithState();
    });

    audioEngine.speak(
      "لوّن مجسمات الأشكال المنقسمة واستكمل السلسلة المتكررة!",
      'ar',
      null,
      () => audioEngine.speak("Paint the split shapes and complete the repeating pattern!", 'en')
    );
  }

  unmount() {
    logger.info('ShapesWorksheet', 'Unmounting Shapes Worksheet Component...');
    if (this.unsubscribeState) {
      this.unsubscribeState();
    }
  }

  renderPalette() {
    this.paletteWrapper.innerHTML = '';

    rowsData.forEach(row => {
      const pot = document.createElement('div');
      pot.className = 'color-pot';
      pot.style.backgroundColor = row.hex;
      pot.dataset.hex = row.hex;

      pot.addEventListener('click', () => {
        this.paletteWrapper.querySelectorAll('.color-pot').forEach(p => p.classList.remove('active'));
        pot.classList.add('active');

        gameState.selectColor(row.hex, 'shapes');
        audioEngine.playGrab();

        const arVoice = `اخترت اللون ${row.ar}`;
        const enVoice = `You selected ${row.en}`;
        this.updateAssistantText(arVoice, enVoice);
        audioEngine.speak(arVoice, 'ar', null, () => audioEngine.speak(enVoice, 'en'));
      });

      this.paletteWrapper.appendChild(pot);
    });
    logger.debug('ShapesWorksheet', 'Shapes sheet paint palette rendered.');
  }

  renderReferenceCard() {
    const container = this.panel.querySelector('.reference-shapes-container');
    if (!container) return;

    // Static examples matching the paper worksheets:
    // Rectangle: Red/White, Circle: Green/Blue, Oval: Green/Yellow, Triangle: Blue/Yellow, Pentagon: White/Black
    container.innerHTML = `
      <div class="ref-shape-wrapper">
        <svg class="ref-svg" viewBox="0 0 100 100">
          <rect x="10" y="25" width="40" height="50" fill="#D21B1B" stroke="#333" stroke-width="2"/>
          <rect x="50" y="25" width="40" height="50" fill="#FFFFFF" stroke="#333" stroke-width="2"/>
        </svg>
        <span class="ref-title">مستطيل (Rectangle)</span>
      </div>
      <div class="ref-shape-wrapper">
        <svg class="ref-svg" viewBox="0 0 100 100">
          <path d="M 50,10 A 40,40 0 0,0 50,90 Z" fill="#2B803E" stroke="#333" stroke-width="2"/>
          <path d="M 50,10 A 40,40 0 0,1 50,90 Z" fill="#0A5EA5" stroke="#333" stroke-width="2"/>
        </svg>
        <span class="ref-title">دائرة (Circle)</span>
      </div>
      <div class="ref-shape-wrapper">
        <svg class="ref-svg" viewBox="0 0 100 100">
          <path d="M 10,50 C 10,32 28,18 50,18 C 72,18 90,32 90,50 Z" fill="#2B803E" stroke="#333" stroke-width="2"/>
          <path d="M 10,50 C 10,68 28,82 50,82 C 72,82 90,68 90,50 Z" fill="#FBC507" stroke="#333" stroke-width="2"/>
        </svg>
        <span class="ref-title">بيضاوي (Oval)</span>
      </div>
      <div class="ref-shape-wrapper">
        <svg class="ref-svg" viewBox="0 0 100 100">
          <polygon points="50,12 14,88 50,88" fill="#0A5EA5" stroke="#333" stroke-width="2"/>
          <polygon points="50,12 50,88 86,88" fill="#FBC507" stroke="#333" stroke-width="2"/>
        </svg>
        <span class="ref-title">مثلث (Triangle)</span>
      </div>
      <div class="ref-shape-wrapper">
        <svg class="ref-svg" viewBox="0 0 100 100">
          <polygon points="50,12 14,38 28,82 50,82" fill="#FFFFFF" stroke="#333" stroke-width="2"/>
          <polygon points="50,12 50,82 72,82 86,38" fill="#1A1A1D" stroke="#333" stroke-width="2"/>
        </svg>
        <span class="ref-title">خماسي (Pentagon)</span>
      </div>
    `;
    logger.debug('ShapesWorksheet', 'Reference cards drawn.');
  }

  resetShapes() {
    const segments = this.panel.querySelectorAll('.paintable-segment');
    segments.forEach(seg => {
      seg.style.fill = '#ffffff';
    });
    logger.debug('ShapesWorksheet', 'Split shape colors reset.');
  }

  renderSequence() {
    this.sequenceContainer.innerHTML = '';

    // Pattern: Red -> Yellow -> Red -> [?] -> Red -> Yellow
    const pattern = [
      { color: '#D21B1B', interactive: false },
      { color: '#FBC507', interactive: false },
      { color: '#D21B1B', interactive: false },
      { color: '#FFFFFF', interactive: true, id: 3 },
      { color: '#D21B1B', interactive: false },
      { color: '#FBC507', interactive: false }
    ];

    pattern.forEach(cell => {
      const cellEl = document.createElement('div');
      cellEl.className = 'sequence-cell';
      
      if (cell.interactive) {
        cellEl.className = 'sequence-cell question-mark';
        cellEl.textContent = '؟';
        
        cellEl.addEventListener('click', () => this.paintSequenceCell(cell.id, cellEl));
      } else {
        cellEl.style.backgroundColor = cell.color;
      }

      this.sequenceContainer.appendChild(cellEl);
    });
    logger.debug('ShapesWorksheet', 'Sequence pattern rendered.');
  }

  paintSegment(segmentKey, segmentEl) {
    const selectedColor = gameState.shapesSelectedColor;
    if (!selectedColor) {
      this.warnSelectColor();
      return;
    }

    segmentEl.style.fill = selectedColor;
    gameState.colorSplitShapeSegment(segmentKey, selectedColor);
    audioEngine.playSuccess();

    this.checkCompletion();
  }

  paintSequenceCell(index, cellEl) {
    const selectedColor = gameState.shapesSelectedColor;
    if (!selectedColor) {
      this.warnSelectColor();
      return;
    }

    cellEl.style.backgroundColor = selectedColor;
    cellEl.textContent = '';
    cellEl.classList.remove('question-mark');

    gameState.setSequenceAnswer(index, selectedColor);
    audioEngine.playSuccess();

    this.checkCompletion();
  }

  warnSelectColor() {
    audioEngine.playIncorrect();
    const arMsg = "الرجاء اختيار لون من الفرشاة أولاً!";
    const enMsg = "Please select a color from the palette first!";
    this.updateAssistantText(arMsg, enMsg);
    audioEngine.speak(arMsg, 'ar', null, () => audioEngine.speak(enMsg, 'en'));
  }

  syncUIWithState() {
    // Active palette color
    const activeColor = gameState.shapesSelectedColor;
    this.paletteWrapper.querySelectorAll('.color-pot').forEach(pot => {
      pot.classList.toggle('active', pot.dataset.hex === activeColor);
    });

    // Sync split shapes
    for (const [key, color] of Object.entries(gameState.shapesSplitColors)) {
      const segmentEl = this.panel.querySelector(`[data-segment-key="${key}"]`);
      if (segmentEl) {
        segmentEl.style.fill = color || '#ffffff';
      }
    }

    // Sync sequence cell
    const seqCell = this.sequenceContainer.querySelector('.sequence-cell:nth-child(4)');
    const cellAnswer = gameState.sequenceAnswers[3];
    if (seqCell) {
      if (cellAnswer) {
        seqCell.style.backgroundColor = cellAnswer;
        seqCell.textContent = '';
        seqCell.classList.remove('question-mark');
      } else {
        seqCell.style.backgroundColor = '#ffffff';
        seqCell.textContent = '؟';
        seqCell.classList.add('question-mark');
      }
    }
  }

  checkCompletion() {
    const report = gameState.validateShapesSheet();
    if (report.isComplete) {
      logger.success('ShapesWorksheet', 'Shapes worksheet validation passed!');
      const event = new CustomEvent('shapes-victory');
      window.dispatchEvent(event);
    } else {
      const allSegmentsFilled = Object.values(gameState.shapesSplitColors).every(c => c !== null);
      const seqFilled = gameState.sequenceAnswers[3] !== null;

      if (allSegmentsFilled && seqFilled) {
        logger.warn('ShapesWorksheet', 'All slots colored, but validation failed.');
        audioEngine.playIncorrect();
        const arMsg = "بعض الألوان خاطئة، انظر إلى نماذج ورقة العمل!";
        const enMsg = "Some colors are incorrect. Check the worksheet examples!";
        this.updateAssistantText(arMsg, enMsg);
        audioEngine.speak(arMsg, 'ar', null, () => audioEngine.speak(enMsg, 'en'));
      }
    }
  }

  updateAssistantText(arText, enText) {
    const arEl = document.getElementById('text-ar');
    const enEl = document.getElementById('text-en');
    if (arEl) arEl.textContent = arText;
    if (enEl) enEl.textContent = enText;

    const waves = document.querySelectorAll('.audio-wave');
    waves.forEach(w => w.classList.add('animating'));
    setTimeout(() => {
      waves.forEach(w => w.classList.remove('animating'));
    }, 1800);
  }
}
