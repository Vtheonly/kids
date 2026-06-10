import { logger } from '../core/logger.js';
import { audioEngine } from '../core/audio.js';
import { gameState, rowsData } from '../core/state.js';

export class ColorsComponent {
  constructor(panelEl) {
    this.panel = panelEl;
    this.paletteWrapper = panelEl.querySelector('#colors-palette-wrapper');
    this.stripsContainer = panelEl.querySelector('.strips-coloring-section');
    this.btnStartStripsChallenge = panelEl.querySelector('#btn-start-strips-challenge');
    this.btnStartShapesChallenge = panelEl.querySelector('#btn-start-shapes-challenge');
    this.unsubscribeState = null;
    this.isCountingDown = false;
  }

  mount() {
    logger.info('ColorsWorksheet', 'Mounting Colors Component...');
    this.renderStrips();
    this.renderPalette();
    this.resetShapes();
    this.bindLocalEvents();

    this.unsubscribeState = gameState.subscribe((state) => {
      if (state.activeTab !== 'colors') return;
      this.syncUIWithState();
    });

    audioEngine.speak(
      "مرحباً بك في تحدي الذاكرة الصورية الفلاشية! اضغط على زر التحدي لحفظ الألوان وتذكرها.",
      'ar',
      null,
      () => audioEngine.speak("Welcome to the Flash Memory challenge! Click the start buttons to display, hide, and recall color sequences.", 'en')
    );
  }

  unmount() {
    logger.info('ColorsWorksheet', 'Unmounting Colors Component...');
    if (this.unsubscribeState) {
      this.unsubscribeState();
    }
  }

  bindLocalEvents() {
    if (this.btnStartStripsChallenge) {
      this.btnStartStripsChallenge.addEventListener('click', () => this.triggerStripsChallenge());
    }
    if (this.btnStartShapesChallenge) {
      this.btnStartShapesChallenge.addEventListener('click', () => this.triggerShapesChallenge());
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

        gameState.selectColor(row.hex, 'colors');
        audioEngine.playGrab();
      });

      this.paletteWrapper.appendChild(pot);
    });
  }

  renderStrips() {
    this.stripsContainer.innerHTML = '';

    rowsData.forEach((row, i) => {
      const stripItem = document.createElement('div');
      stripItem.className = 'strip-item nature-anchor-card';
      stripItem.dataset.index = i;

      stripItem.innerHTML = `
        <span class="strip-number">${i + 1}</span>
        <div class="nature-anchor-emoji" title="${row.anchorAr}">${row.anchor}</div>
        <span class="nature-anchor-title">${row.anchorAr}</span>
        <div class="strip-color-indicator" id="strip-indicator-${i}"></div>
      `;

      stripItem.addEventListener('click', (e) => {
        if (this.isCountingDown) return;
        this.paintStrip(i, stripItem, e);
      });
      this.stripsContainer.appendChild(stripItem);
    });
  }

  resetShapes() {
    const segments = this.panel.querySelectorAll('.paintable-segment');
    segments.forEach(seg => {
      seg.style.fill = '#ffffff';
    });
  }

  async triggerStripsChallenge() {
    if (this.isCountingDown) return;
    this.isCountingDown = true;
    logger.info('ColorsWorksheet', 'Strips Memory challenge countdown initialized.');

    const colorsPool = rowsData.map(r => r.hex);
    const randomizedPattern = [...colorsPool].sort(() => Math.random() - 0.5);

    randomizedPattern.forEach((hex, i) => {
      const card = this.stripsContainer.querySelector(`[data-index="${i}"]`);
      if (card) {
        card.style.borderColor = hex;
        card.style.borderWidth = '4px';
        card.style.borderStyle = 'solid';
        const indicator = card.querySelector('.strip-color-indicator');
        if (indicator) indicator.style.backgroundColor = hex;
      }
    });

    gameState.startStripsMemoryChallenge(randomizedPattern);

    for (let time = 5; time > 0; time--) {
      this.updateAssistantText(`احفظ ترتيب أشرطة الألوان! المتبقي: ${time} ثوانٍ`, `Memorize the strip colors! Countdown: ${time}s`);
      audioEngine.playGrab();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    rowsData.forEach((_, i) => {
      const card = this.stripsContainer.querySelector(`[data-index="${i}"]`);
      if (card) {
        card.style.borderColor = '';
        card.style.borderWidth = '';
        card.style.borderStyle = '';
        const indicator = card.querySelector('.strip-color-indicator');
        if (indicator) indicator.style.backgroundColor = '#f1f3f5';
      }
    });

    this.isCountingDown = false;
    this.updateAssistantText("الآن أعد تلوين الأشرطة من ذاكرتك بالترتيب الصحيح!", "Now paint the strips in the correct order from your memory!");
    audioEngine.speak("الآن أعد تلوين الأشرطة من ذاكرتك بالترتيب الصحيح!", "ar", null,
      () => audioEngine.speak("Now paint the strips in the correct order from memory!", "en")
    );
  }

  async triggerShapesChallenge() {
    if (this.isCountingDown) return;
    this.isCountingDown = true;
    logger.info('ColorsWorksheet', 'Shapes Memory challenge countdown initialized.');

    const colorsPool = rowsData.map(r => r.hex);
    const randColors = {
      square: colorsPool[Math.floor(Math.random() * colorsPool.length)],
      triangle: colorsPool[Math.floor(Math.random() * colorsPool.length)],
      circle: colorsPool[Math.floor(Math.random() * colorsPool.length)]
    };

    const squareEl = this.panel.querySelector('#color-shape-square');
    const triangleEl = this.panel.querySelector('#color-shape-triangle');
    const circleEl = this.panel.querySelector('#color-shape-circle');

    if (squareEl) squareEl.style.fill = randColors.square;
    if (triangleEl) triangleEl.style.fill = randColors.triangle;
    if (circleEl) circleEl.style.fill = randColors.circle;

    gameState.startShapesMemoryChallenge(randColors);

    for (let time = 5; time > 0; time--) {
      this.updateAssistantText(`احفظ ألوان الأشكال الهندسية! المتبقي: ${time} ثوانٍ`, `Memorize the geometric colors! Countdown: ${time}s`);
      audioEngine.playGrab();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.resetShapes();

    this.isCountingDown = false;
    this.updateAssistantText("الآن أعد تلوين الأشكال الهندسية الثلاثة كما كانت بالترتيب!", "Now color the three geometric shapes from memory!");
    audioEngine.speak("الآن أعد تلوين الأشكال الهندسية الثلاثة كما كانت بالترتيب!", "ar", null,
      () => audioEngine.speak("Now color the geometric shapes from memory!", "en")
    );
  }

  paintStrip(index, element, event) {
    if (!gameState.isStripsMemoryActive) {
      audioEngine.speak("اضغط على زر تحدي الأشرطة للبدء أولاً!", "ar");
      return;
    }

    const selectedColor = gameState.colorsSelectedColor;
    if (!selectedColor) {
      this.warnSelectColor();
      return;
    }

    const targetColor = gameState.targetStripsPattern[index];
    const isCorrect = selectedColor.toUpperCase() === targetColor.toUpperCase();

    element.style.borderColor = selectedColor;
    element.style.borderWidth = '4px';
    element.style.borderStyle = 'solid';
    const indicator = element.querySelector('.strip-color-indicator');
    if (indicator) indicator.style.backgroundColor = selectedColor;

    gameState.colorStrip(index, selectedColor);

    if (isCorrect) {
      audioEngine.playSuccess();
      // Dispatch colorful particle burst at exact click/touch coordinates
      window.dispatchEvent(new CustomEvent('celebration-burst', {
        detail: { x: event.clientX, y: event.clientY, mini: true }
      }));
    } else {
      audioEngine.playIncorrect();
      this.shakeElement(element);
    }

    this.checkStripsCompletion();
  }

  paintShape(shapeKey, segmentEl, event) {
    if (!gameState.isShapesMemoryActive) {
      audioEngine.speak("اضغط على زر تحدي الأشكال للبدء أولاً!", "ar");
      return;
    }

    const selectedColor = gameState.colorsSelectedColor;
    if (!selectedColor) {
      this.warnSelectColor();
      return;
    }

    const targetColor = gameState.targetShapesPattern[shapeKey];
    const isCorrect = selectedColor.toUpperCase() === targetColor.toUpperCase();

    segmentEl.style.fill = selectedColor;
    gameState.colorShape(shapeKey, selectedColor);

    if (isCorrect) {
      audioEngine.playSuccess();
      // Dispatch colorful particle burst at exact shape click coordinates
      window.dispatchEvent(new CustomEvent('celebration-burst', {
        detail: { x: event.clientX, y: event.clientY, mini: true }
      }));
    } else {
      audioEngine.playIncorrect();
      const targetEl = segmentEl.closest('.paint-canvas-target') || segmentEl;
      this.shakeElement(targetEl);
    }

    this.checkShapesCompletion();
  }

  checkStripsCompletion() {
    const totalFilled = Object.keys(gameState.coloredStrips).length;
    if (totalFilled === 6) {
      const isCorrect = gameState.validateStripsMemory();
      if (isCorrect) {
        this.updateAssistantText("أحسنت! ذاكرتك الصورية للأشرطة ممتازة ومثالية!", "Fantastic! Your strip memory recall is perfect!");
        audioEngine.speak("أحسنت! ذاكرتك الصورية للأشرطة ممتازة ومثالية!", "ar", null,
          () => audioEngine.speak("Fantastic! Your strip memory recall is perfect!", "en")
        );
        window.dispatchEvent(new CustomEvent('colors-victory'));
      } else {
        this.updateAssistantText("بعض الأشرطة ليست في مكانها الصحيح! اضغط ابدأ التحدي مجدداً.", "Some strips are incorrect! Click Start challenge to retry.");
        audioEngine.speak("بعض الأشرطة ليست في مكانها الصحيح! اضغط ابدأ التحدي مجدداً.", "ar");
      }
    }
  }

  checkShapesCompletion() {
    const totalFilled = Object.values(gameState.coloredShapes).filter(c => c !== null).length;
    if (totalFilled === 3) {
      const isCorrect = gameState.validateShapesMemory();
      if (isCorrect) {
        this.updateAssistantText("رائع ومذهل! لقد تذكرت ألوان الأشكال الهندسية بنجاح!", "Amazing! You successfully remembered the geometric colors!");
        audioEngine.speak("رائع ومذهل! لقد تذكرت ألوان الأشكال الهندسية بنجاح!", "ar", null,
          () => audioEngine.speak("Amazing! You successfully remembered the geometric colors!", "en")
        );
        window.dispatchEvent(new CustomEvent('colors-victory'));
      } else {
        this.updateAssistantText("تلوين الأشكال خاطئ! اضغط ابدأ التحدي لتثبيت النمط وتجربته مجدداً.", "Wrong shapes matching! Click Start challenge to retry.");
        audioEngine.speak("تلوين الأشكال خاطئ! اضغط ابدأ التحدي وتجربته مجدداً.", "ar");
      }
    }
  }

  shakeElement(el) {
    el.classList.add('shake');
    const onEnd = () => {
      el.classList.remove('shake');
      el.removeEventListener('animationend', onEnd);
    };
    el.addEventListener('animationend', onEnd);
  }

  warnSelectColor() {
    audioEngine.playIncorrect();
    const arMsg = "الرجاء اختيار لون من الفرشاة أولاً!";
    const enMsg = "Please select a color from the palette first!";
    this.updateAssistantText(arMsg, enMsg);
    audioEngine.speak(arMsg, 'ar', null, () => audioEngine.speak(enMsg, 'en'));
  }

  syncUIWithState() {
    const activeColor = gameState.colorsSelectedColor;
    this.paletteWrapper.querySelectorAll('.color-pot').forEach(pot => {
      pot.classList.toggle('active', pot.dataset.hex === activeColor);
    });
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