import { logger } from '../core/logger.js';
import { audioEngine } from '../core/audio.js';
import { gameState, rowsData, translations, SHAPES_MAP } from '../core/state.js';

export const SHAPE_GEOMETRIES = {
  [SHAPES_MAP.CIRCLE]: 'M 50,20 A 30,30 0 1,0 50,80 A 30,30 0 1,0 50,20 Z',
  [SHAPES_MAP.SQUARE]: 'M 22,22 H 78 V 78 H 22 Z',
  [SHAPES_MAP.RECTANGLE]: 'M 15,28 H 85 V 72 H 15 Z',
  [SHAPES_MAP.TRIANGLE]: 'M 50,16 L 84,80 H 16 Z',
  [SHAPES_MAP.PENTAGON]: 'M 50,15 L 82,38 L 70,78 L 30,78 L 18,38 Z',
  [SHAPES_MAP.HEXAGON]: 'M 50,15 L 82,33.5 L 82,66.5 L 50,85 L 18,66.5 L 18,33.5 Z',
  [SHAPES_MAP.OVAL_H]: 'M 50,26 C 71,26 88,37 88,50 C 88,63 71,74 50,74 C 29,74 12,63 12,50 C 12,37 29,26 50,26 Z',
  [SHAPES_MAP.OVAL_V]: 'M 50,12 C 63,12 74,29 74,50 C 74,71 63,88 50,88 C 37,88 26,71 26,50 C 26,29 37,12 50,12 Z'
};

export class BoardComponent {
  constructor(containerEl, trayEl) {
    this.container = containerEl;
    this.tray = trayEl;
    this.activeDragElement = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
    this.pointerId = null;

    // Track unsubscribe functions
    this.unsubscribeState = null;
  }

  mount() {
    logger.info('Board', 'Mounting Board Component...');
    this.renderSlots();
    this.spawnStencils();

    // Listen to game state updates
    this.unsubscribeState = gameState.subscribe((state) => {
      if (state.activeTab !== 'board') return;
      this.updateChallengeUI();
    });

    // Initial challenge trigger if challenge mode is active
    if (gameState.mode === 'challenge') {
      this.triggerNextChallenge();
    } else {
      audioEngine.speak(
        "اسحب الأشكال وضعها في مكانها الصحيح!", 
        'ar', 
        null, 
        () => audioEngine.speak("Drag the shapes and drop them into their matching slots!", 'en')
      );
    }
  }

  unmount() {
    logger.info('Board', 'Unmounting Board Component...');
    if (this.unsubscribeState) {
      this.unsubscribeState();
    }
  }

  renderSlots() {
    // Clear slots first
    rowsData.forEach(rowData => {
      const rowEl = this.container.querySelector(`.row-${rowData.color}`);
      if (!rowEl) return;
      
      rowEl.innerHTML = '';
      rowData.shapes.forEach((shape, colIdx) => {
        const slotId = `slot-${rowData.color}-${colIdx}`;
        const slotEl = document.createElement('div');
        slotEl.className = 'slot';
        slotEl.id = slotId;
        slotEl.dataset.shape = shape;
        slotEl.dataset.color = rowData.color;
        slotEl.dataset.colIndex = colIdx;

        const geom = SHAPE_GEOMETRIES[shape];
        slotEl.innerHTML = `
          <svg class="slot-svg" viewBox="0 0 100 100">
            <path class="slot-shape-path" d="${geom}" />
          </svg>
        `;

        rowEl.appendChild(slotEl);
      });
    });
    logger.debug('Board', 'Slots rendered on the interactive board.');
  }

  spawnStencils() {
    this.tray.innerHTML = '';
    
    // Generate pool of stencils matching board configuration
    const stencilPool = [];
    rowsData.forEach(rowData => {
      rowData.shapes.forEach((shape, colIdx) => {
        stencilPool.push({
          shape,
          key: `${rowData.color}-${colIdx}`
        });
      });
    });

    // Shuffle stencils to make it challenging
    stencilPool.sort(() => Math.random() - 0.5);

    // Render stencils in the tray
    stencilPool.forEach((stencilData) => {
      const stencilEl = document.createElement('div');
      stencilEl.className = 'stencil-tile';
      stencilEl.id = `stencil-${stencilData.key}`;
      stencilEl.dataset.shape = stencilData.shape;
      
      const geom = SHAPE_GEOMETRIES[stencilData.shape];
      // EvenOdd compound path to create hollow cutout
      const compoundPath = `M 0,0 H 100 V 100 H 0 Z ${geom}`;

      stencilEl.innerHTML = `
        <svg class="stencil-svg-plate" viewBox="0 0 100 100">
          <path class="stencil-plate-path" d="${compoundPath}" />
        </svg>
      `;

      this.bindDragEvents(stencilEl);
      this.tray.appendChild(stencilEl);
    });

    logger.debug('Board', 'Stencils spawned and shuffled in tray.');
  }

  bindDragEvents(element) {
    element.addEventListener('pointerdown', (e) => this.onPointerDown(e, element));
    element.addEventListener('pointermove', (e) => this.onPointerMove(e));
    element.addEventListener('pointerup', (e) => this.onPointerUp(e));
    element.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  onPointerDown(e, element) {
    if (element.classList.contains('locked-to-board')) return;
    e.preventDefault();

    this.activeDragElement = element;
    this.pointerId = e.pointerId;
    element.setPointerCapture(this.pointerId);

    // Audio click feedback
    audioEngine.playGrab();

    // Track layout coordinates
    const rect = element.getBoundingClientRect();
    this.dragStartPos = {
      x: rect.left,
      y: rect.top
    };
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    element.classList.add('dragging');
    logger.debug('Board', `Grabbed stencil: ${element.id} (${element.dataset.shape})`);
  }

  onPointerMove(e) {
    if (!this.activeDragElement || e.pointerId !== this.pointerId) return;

    const dx = e.clientX - this.dragStartPos.x - this.dragOffset.x;
    const dy = e.clientY - this.dragStartPos.y - this.dragOffset.y;

    this.activeDragElement.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.1)`;
  }

  onPointerUp(e) {
    if (!this.activeDragElement || e.pointerId !== this.pointerId) return;

    const stencil = this.activeDragElement;
    stencil.releasePointerCapture(this.pointerId);
    stencil.classList.remove('dragging');
    
    this.activeDragElement = null;
    this.pointerId = null;

    // Detect collision with slots using hit-test (pointer inside padded rect)
    const px = e.clientX;
    const py = e.clientY;
    const padding = 30; // extra pixels around each slot for easier targeting

    const slots = this.container.querySelectorAll('.slot');
    let hitSlot = null;
    let closestSlot = null;
    let minDistance = Infinity;

    slots.forEach(slot => {
      if (gameState.boardFilledSlots[slot.id]) return;
      
      const rect = slot.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(px - cx, py - cy);

      // Check if pointer is inside the padded slot rect
      if (px >= rect.left - padding && px <= rect.right + padding &&
          py >= rect.top - padding && py <= rect.bottom + padding) {
        if (!hitSlot || dist < Math.hypot(px - hitSlot.getBoundingClientRect().left - hitSlot.getBoundingClientRect().width / 2, py - hitSlot.getBoundingClientRect().top - hitSlot.getBoundingClientRect().height / 2)) {
          hitSlot = slot;
        }
      }

      // Also track absolute closest as fallback
      if (dist < minDistance) {
        minDistance = dist;
        closestSlot = slot;
      }
    });

    // In challenge mode, also check if pointer is near the challenge target slot specifically
    if (gameState.mode === 'challenge' && gameState.currentChallenge) {
      const targetSlot = this.container.querySelector(`#${gameState.currentChallenge.slotElementId}`);
      if (targetSlot && !gameState.boardFilledSlots[targetSlot.id]) {
        const tRect = targetSlot.getBoundingClientRect();
        const largePadding = 50; // even more generous for the target
        if (px >= tRect.left - largePadding && px <= tRect.right + largePadding &&
            py >= tRect.top - largePadding && py <= tRect.bottom + largePadding) {
          hitSlot = targetSlot;
        }
      }
    }

    const matchedSlot = hitSlot || closestSlot;
    const snapDistanceThreshold = 120; // generous threshold

    if (matchedSlot && minDistance < snapDistanceThreshold) {
      this.handleSlotPlacement(stencil, matchedSlot);
    } else {
      this.slideBack(stencil);
    }
  }

  handleSlotPlacement(stencil, slot) {
    const stencilShape = stencil.dataset.shape;
    const slotShape = slot.dataset.shape;
    const slotColor = slot.dataset.color;

    logger.debug('Board', `Placement attempt: stencil ${stencilShape} -> slot ${slotShape} (${slotColor})`);

    if (gameState.mode === 'challenge') {
      const challenge = gameState.currentChallenge;
      if (
        challenge &&
        stencilShape === challenge.shape &&
        slot.id === challenge.slotElementId
      ) {
        // Correct snap!
        this.snapToSlot(stencil, slot);
        audioEngine.playSuccess();
        this.triggerVocalPraise();
        
        // Wait and generate next challenge
        setTimeout(() => this.triggerNextChallenge(), 1500);
      } else {
        // Incorrect placement in challenge mode
        this.slideBack(stencil);
        
        if (stencilShape === challenge.shape) {
          audioEngine.playCloseTry();
          this.triggerVocalPrompt('close');
        } else {
          audioEngine.playIncorrect();
          this.triggerVocalPrompt('incorrect');
        }
      }
    } else {
      // Free play mode: snap if shapes match
      if (stencilShape === slotShape) {
        this.snapToSlot(stencil, slot);
        audioEngine.playSuccess();
        
        if (gameState.isBoardComplete()) {
          logger.success('Board', 'Free play completed! All slots filled.');
          this.dispatchVictoryEvent();
        }
      } else {
        this.slideBack(stencil);
        audioEngine.playIncorrect();
      }
    }
  }

  snapToSlot(stencil, slot) {
    stencil.classList.add('locked-to-board');
    
    // Get the row color for this slot
    const rowColor = slot.dataset.color;
    const rowData = rowsData.find(r => r.color === rowColor);
    const fillHex = rowData ? rowData.hex : '#888888';

    // Hide the dark slot SVG outline
    const slotSvg = slot.querySelector('.slot-svg');
    if (slotSvg) {
      slotSvg.style.display = 'none';
    }

    // Hide the lift-tab notch pseudo-element by adding a class
    slot.classList.add('slot-filled');

    // Replace the stencil's grey plate with a solid colored shape
    const shapePath = SHAPE_GEOMETRIES[slot.dataset.shape];
    stencil.innerHTML = `
      <svg class="stencil-svg-plate" viewBox="0 0 100 100">
        <path d="${shapePath}" fill="${fillHex}" stroke="rgba(0,0,0,0.3)" stroke-width="2.5"/>
      </svg>
    `;

    slot.appendChild(stencil);
    
    // Reset transform & center stencil perfectly inside the slot
    stencil.style.transform = '';
    stencil.style.left = '0';
    stencil.style.top = '0';

    // Update global state
    gameState.fillBoardSlot(slot.id, stencil.id);

    // Micro-animation bounce on snap
    stencil.animate([
      { transform: 'scale(1.15)' },
      { transform: 'scale(1)' }
    ], {
      duration: 250,
      easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    });

    logger.success('Board', `Stencil snapped into slot: ${slot.id} with color ${fillHex}`);
  }

  slideBack(stencil) {
    audioEngine.playSlideBack();
    stencil.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    stencil.style.transform = 'translate3d(0, 0, 0)';
    
    const onTransitionEnd = () => {
      stencil.style.transition = '';
      stencil.removeEventListener('transitionend', onTransitionEnd);
    };
    stencil.addEventListener('transitionend', onTransitionEnd);
    logger.debug('Board', `Stencil ${stencil.id} slid back to tray.`);
  }

  triggerNextChallenge() {
    const allSlots = Array.from(this.container.querySelectorAll('.slot'));
    const emptySlots = allSlots.filter(s => !gameState.boardFilledSlots[s.id]);

    if (emptySlots.length === 0) {
      logger.success('Board', 'Challenge completed! All board slots are filled.');
      this.dispatchVictoryEvent();
      return;
    }

    // Pick a random empty slot for the challenge
    const selectedSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
    const targetShape = selectedSlot.dataset.shape;
    const targetColor = selectedSlot.dataset.color;

    const rowDetails = rowsData.find(r => r.color === targetColor);
    const shapeDetails = translations.shapes[targetShape];

    gameState.currentChallenge = {
      shape: targetShape,
      color: targetColor,
      slotElementId: selectedSlot.id
    };

    // Update highlights
    allSlots.forEach(s => s.classList.remove('highlight-target'));
    selectedSlot.classList.add('highlight-target');

    const arPrompt = `ضع ${shapeDetails.ar} في الصف ${rowDetails.ar}!`;
    const enPrompt = `Place the ${shapeDetails.en} on the ${rowDetails.en} row!`;

    // Prompt through assistant bubble
    this.updateAssistantText(arPrompt, enPrompt);
    audioEngine.speak(arPrompt, 'ar', null, () => audioEngine.speak(enPrompt, 'en'));

    logger.info('Board', `New challenge: Place ${targetShape} on ${targetColor} row (Slot: ${selectedSlot.id})`);
  }

  updateChallengeUI() {
    const allSlots = this.container.querySelectorAll('.slot');
    allSlots.forEach(s => s.classList.remove('highlight-target'));

    if (gameState.mode === 'challenge' && gameState.currentChallenge) {
      const targetSlot = this.container.querySelector(`#${gameState.currentChallenge.slotElementId}`);
      if (targetSlot) {
        targetSlot.classList.add('highlight-target');
      }
    }
  }

  updateAssistantText(arText, enText) {
    const arEl = document.getElementById('text-ar');
    const enEl = document.getElementById('text-en');
    if (arEl) arEl.textContent = arText;
    if (enEl) enEl.textContent = enText;

    // Trigger visual audio wave animation
    const waves = document.querySelectorAll('.audio-wave');
    waves.forEach(w => w.classList.add('animating'));
    setTimeout(() => {
      waves.forEach(w => w.classList.remove('animating'));
    }, 1800);
  }

  triggerVocalPrompt(category) {
    const playlist = {
      incorrect: [
        { text: "Try again.", ar: "حاول مرة أخرى." },
        { text: "Not quite, search for the match.", ar: "ليست هي، ابحث عن الشكل المطابق." }
      ],
      close: [
        { text: "Very close, check the lane color.", ar: "قريب جداً، تحقق من لون الصف." },
        { text: "Almost there! That's the right shape, but incorrect row.", ar: "لقد اقتربت! الشكل صحيح ولكن الصف خاطئ." }
      ]
    };

    const phrases = playlist[category];
    const item = phrases[Math.floor(Math.random() * phrases.length)];
    this.updateAssistantText(item.ar, item.text);
    audioEngine.speak(item.ar, 'ar', null, () => audioEngine.speak(item.text, 'en'));
  }

  triggerVocalPraise() {
    const praises = [
      { text: "Well done!", ar: "أحسنت!" },
      { text: "Excellent work.", ar: "عمل ممتاز!" },
      { text: "Fantastic match!", ar: "مطابقة رائعة!" },
      { text: "Keep going.", ar: "استمر في العمل الرائع!" }
    ];
    const item = praises[Math.floor(Math.random() * praises.length)];
    this.updateAssistantText(item.ar, item.text);
    audioEngine.speak(item.ar, 'ar', null, () => audioEngine.speak(item.text, 'en'));
  }

  dispatchVictoryEvent() {
    const event = new CustomEvent('board-victory');
    window.dispatchEvent(event);
  }
}
