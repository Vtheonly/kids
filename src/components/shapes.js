import { logger } from '../core/logger.js';
import { audioEngine } from '../core/audio.js';
import { gameState, rowsData } from '../core/state.js';

export class ShapesComponent {
  constructor(panelEl) {
    this.panel = panelEl;
    this.paletteWrapper = panelEl.querySelector('#shapes-palette-wrapper');
    this.sequenceContainer = panelEl.querySelector('#pattern-sequence-container');
    this.btnShowRef = panelEl.querySelector('#btn-shapes-show-ref');
    this.refContainer = panelEl.querySelector('.reference-shapes-container');
    this.btnNewPattern = panelEl.querySelector('#btn-shapes-new-pattern');
    this.unsubscribeState = null;
  }

  mount() {
    logger.info('ShapesWorksheet', 'Mounting Shapes Component...');
    this.renderPalette();
    this.renderReferenceCard();
    this.resetShapes();
    this.renderSequence();
    this.bindLocalEvents();

    this.unsubscribeState = gameState.subscribe((state) => {
      if (state.activeTab !== 'shapes') return;
      this.syncUIWithState();
    });

    audioEngine.speak(
      "تحدي الأنماط الهندسية! انظر إلى بطاقة الأمثلة واحفظ تركيبها، ثم اضغط على زر التغطية لاختبار ذاكرتك البصرية!",
      'ar',
      null,
      () => audioEngine.speak("Geometry pattern recall! Memorize the split shape colors, hide the card, and try to replicate them!", 'en')
    );
  }

  unmount() {
    logger.info('ShapesWorksheet', 'Unmounting Shapes Component...');
    if (this.unsubscribeState) {
      this.unsubscribeState();
    }
  }

  bindLocalEvents() {
    if (this.btnShowRef && this.refContainer) {
      this.btnShowRef.addEventListener('click', () => {
        const isHidden = this.refContainer.style.display === 'none';
        this.refContainer.style.display = isHidden ? 'flex' : 'none';
        this.btnShowRef.textContent = isHidden ? 'تغطية أمثلة التركيب 🙈' : 'كشف أمثلة التركيب 👁️';
        this.btnShowRef.classList.toggle('active', isHidden);

        if (isHidden) {
          audioEngine.speak("احفظ توزيع الألوان جيداً في ذاكرتك لتلّون الأشكال بنجاح!", "ar");
        } else {
          audioEngine.speak("تمت تغطية الأمثلة بنجاح. ابدأ بتلوين الأشكال الآن!", "ar");
        }
      });
    }

    if (this.btnNewPattern) {
      this.btnNewPattern.addEventListener('click', () => {
        gameState.generateRandomPattern();
        this.renderSequence();
        audioEngine.playGrab();
        audioEngine.speak("تم إنشاء نمط هندسي جديد! أكمل السلسلة الآن.", "ar");
      });
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
  }

  renderReferenceCard() {
    if (!this.refContainer) return;
    this.refContainer.innerHTML = `
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
  }

  resetShapes() {
    const segments = this.panel.querySelectorAll('.paintable-segment');
    segments.forEach(seg => {
      seg.style.fill = '#ffffff';
    });
  }

  renderSequence() {
    this.sequenceContainer.innerHTML = '';
    gameState.currentSequencePattern.forEach(cell => {
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
  }

  paintSegment(segmentKey, segmentEl) {
    const selectedColor = gameState.shapesSelectedColor;
    if (!selectedColor) {
      this.warnSelectColor();
      return;
    }

    const TARGETS = {
      circleLeft: '#2B803E',
      circleRight: '#0A5EA5',
      triangleLeft: '#0A5EA5',
      triangleRight: '#FBC507',
      pentagonLeft: '#FFFFFF',
      pentagonRight: '#1A1A1D',
      ovalTop: '#2B803E',
      ovalBottom: '#FBC507',
      rectangleLeft: '#D21B1B',
      rectangleRight: '#FFFFFF'
    };

    const targetColor = TARGETS[segmentKey];
    if (!targetColor || selectedColor.toUpperCase() !== targetColor.toUpperCase()) {
      audioEngine.playIncorrect();
      const targetEl = segmentEl.closest('.paint-canvas-target') || segmentEl;
      this.shakeElement(targetEl);
      
      const arMsg = "تذكر جيداً! هذا الجزء يحمل لوناً مختلفاً في ورقة الأمثلة المغطاة.";
      const enMsg = "Incorrect! This segment color does not match the reference layout.";
      this.updateAssistantText(arMsg, enMsg);
      audioEngine.speak(arMsg, 'ar', null, () => audioEngine.speak(enMsg, 'en'));
      return;
    }

    segmentEl.style.fill = selectedColor;
    gameState.colorSplitShapeSegment(segmentKey, selectedColor);
    audioEngine.playSuccess();

    const praises = [
      { text: "Spot on! That is correct.", ar: "رائع! لقد تذكرت اللون الصحيح." },
      { text: "Fantastic memory match!", ar: "مطابقة ممتازة من الذاكرة!" }
    ];
    const praise = praises[Math.floor(Math.random() * praises.length)];
    this.updateAssistantText(praise.ar, praise.text);
    audioEngine.speak(praise.ar, 'ar', null, () => audioEngine.speak(praise.text, 'en'));

    this.checkCompletion();
  }

  paintSequenceCell(index, cellEl) {
    const selectedColor = gameState.shapesSelectedColor;
    if (!selectedColor) {
      this.warnSelectColor();
      return;
    }

    const targetPatternColor = gameState.currentSequencePattern[3].color;

    if (selectedColor.toUpperCase() !== targetPatternColor.toUpperCase()) {
      audioEngine.playIncorrect();
      this.shakeElement(cellEl);

      const arMsg = " النمط خاطئ! انظر إلى ترتيب تكرار الألوان لتكتشف الحل.";
      const enMsg = "Incorrect pattern step! Analyze the color sequence to find the pattern.";
      this.updateAssistantText(arMsg, enMsg);
      audioEngine.speak(arMsg, 'ar', null, () => audioEngine.speak(enMsg, 'en'));
      return;
    }

    cellEl.style.backgroundColor = selectedColor;
    cellEl.textContent = '';
    cellEl.classList.remove('question-mark');

    gameState.setSequenceAnswer(index, selectedColor);
    audioEngine.playSuccess();

    this.updateAssistantText("عمل مدهش! لقد استكملت النمط الهندسي الذكي بنجاح.", "Excellent! You completed the geometry pattern loop successfully.");
    audioEngine.speak("عمل مدهش! لقد استكملت النمط الهندسي الذكي بنجاح.", 'ar', null, () => audioEngine.speak("Excellent! You completed the geometry pattern loop successfully.", 'en'));

    this.checkCompletion();
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
    const activeColor = gameState.shapesSelectedColor;
    this.paletteWrapper.querySelectorAll('.color-pot').forEach(pot => {
      pot.classList.toggle('active', pot.dataset.hex === activeColor);
    });

    for (const [key, color] of Object.entries(gameState.shapesSplitColors)) {
      const segmentEl = this.panel.querySelector(`[data-segment-key="${key}"]`);
      if (segmentEl) {
        segmentEl.style.fill = color || '#ffffff';
      }
    }

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