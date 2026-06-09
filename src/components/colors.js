import { logger } from '../core/logger.js';
import { audioEngine } from '../core/audio.js';
import { gameState, rowsData } from '../core/state.js';

export class ColorsComponent {
  constructor(panelEl) {
    this.panel = panelEl;
    this.paletteWrapper = panelEl.querySelector('#colors-palette-wrapper');
    this.stripsContainer = panelEl.querySelector('.strips-coloring-section');
    this.unsubscribeState = null;
  }

  mount() {
    logger.info('ColorsWorksheet', 'Mounting Colors Worksheet Component...');
    this.renderStrips();
    this.renderPalette();
    this.resetShapes();

    this.unsubscribeState = gameState.subscribe((state) => {
      if (state.activeTab !== 'colors') return;
      this.syncUIWithState();
    });

    audioEngine.speak(
      "لوّن الأشرطة والأشكال حسب لوحتك التفاعلية!",
      'ar',
      null,
      () => audioEngine.speak("Paint the strips and geometric shapes according to your board lanes!", 'en')
    );
  }

  unmount() {
    logger.info('ColorsWorksheet', 'Unmounting Colors Worksheet Component...');
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
        // Toggle active selection
        this.paletteWrapper.querySelectorAll('.color-pot').forEach(p => p.classList.remove('active'));
        pot.classList.add('active');

        gameState.selectColor(row.hex, 'colors');
        audioEngine.playGrab();

        const arVoice = `اخترت اللون ${row.ar}`;
        const enVoice = `You selected ${row.en}`;
        this.updateAssistantText(arVoice, enVoice);
        audioEngine.speak(arVoice, 'ar', null, () => audioEngine.speak(enVoice, 'en'));
      });

      this.paletteWrapper.appendChild(pot);
    });
    logger.debug('ColorsWorksheet', 'Color palette rendered.');
  }

  renderStrips() {
    this.stripsContainer.innerHTML = '';

    // Render 6 vertical strips
    for (let i = 0; i < 6; i++) {
      const stripItem = document.createElement('div');
      stripItem.className = 'strip-item';
      stripItem.dataset.index = i;

      const numberLabel = document.createElement('span');
      numberLabel.className = 'strip-number';
      numberLabel.textContent = i + 1;

      const indicator = document.createElement('div');
      indicator.className = 'strip-color-indicator';
      indicator.id = `strip-indicator-${i}`;

      stripItem.appendChild(numberLabel);
      stripItem.appendChild(indicator);

      stripItem.addEventListener('click', () => this.paintStrip(i, stripItem));
      this.stripsContainer.appendChild(stripItem);
    }
    logger.debug('ColorsWorksheet', 'Strips grid rendered.');
  }

  resetShapes() {
    // Reset shape segment fills to white
    const segments = this.panel.querySelectorAll('.paintable-segment');
    segments.forEach(seg => {
      seg.style.fill = '#ffffff';
    });
    logger.debug('ColorsWorksheet', 'Shapes colored states reset.');
  }

  paintStrip(index, element) {
    const selectedColor = gameState.colorsSelectedColor;
    if (!selectedColor) {
      this.warnSelectColor();
      return;
    }

    element.style.backgroundColor = selectedColor;
    const indicator = element.querySelector('.strip-color-indicator');
    if (indicator) {
      indicator.style.backgroundColor = selectedColor;
    }

    gameState.colorStrip(index, selectedColor);
    audioEngine.playSuccess();

    this.checkCompletion();
  }

  paintShape(shapeKey, segmentEl) {
    const selectedColor = gameState.colorsSelectedColor;
    if (!selectedColor) {
      this.warnSelectColor();
      return;
    }

    segmentEl.style.fill = selectedColor;
    gameState.colorShape(shapeKey, selectedColor);
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
    // Sync active color pot
    const activeColor = gameState.colorsSelectedColor;
    this.paletteWrapper.querySelectorAll('.color-pot').forEach(pot => {
      pot.classList.toggle('active', pot.dataset.hex === activeColor);
    });

    // Sync strips
    for (let i = 0; i < 6; i++) {
      const color = gameState.coloredStrips[i];
      const stripEl = this.stripsContainer.querySelector(`[data-index="${i}"]`);
      if (stripEl) {
        stripEl.style.backgroundColor = color || '';
        const indicator = stripEl.querySelector('.strip-color-indicator');
        if (indicator) {
          indicator.style.backgroundColor = color || '#f1f3f5';
        }
      }
    }

    // Sync shapes
    const squareEl = this.panel.querySelector('#color-shape-square');
    const triangleEl = this.panel.querySelector('#color-shape-triangle');
    const circleEl = this.panel.querySelector('#color-shape-circle');

    if (squareEl && gameState.coloredShapes.square) {
      squareEl.style.fill = gameState.coloredShapes.square;
    }
    if (triangleEl && gameState.coloredShapes.triangle) {
      triangleEl.style.fill = gameState.coloredShapes.triangle;
    }
    if (circleEl && gameState.coloredShapes.circle) {
      circleEl.style.fill = gameState.coloredShapes.circle;
    }
  }

  checkCompletion() {
    const report = gameState.validateColorsSheet();
    if (report.isComplete) {
      logger.success('ColorsWorksheet', 'Colors worksheet validation passed!');
      const event = new CustomEvent('colors-victory');
      window.dispatchEvent(event);
    } else {
      // Partial completion verbal feedback
      const totalStripsFilled = Object.keys(gameState.coloredStrips).length;
      const totalShapesFilled = Object.values(gameState.coloredShapes).filter(c => c !== null).length;

      if (totalStripsFilled === 6 && totalShapesFilled === 3) {
        // All slots filled but validation failed
        logger.warn('ColorsWorksheet', 'All slots colored, but coloring errors detected.');
        audioEngine.playIncorrect();
        const arMsg = "بعض الألوان ليست في مكانها الصحيح، تحقق من اللوحة!";
        const enMsg = "Some colors are incorrect. Double-check your interactive board!";
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
