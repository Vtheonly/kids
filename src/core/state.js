import { logger } from './logger.js';

export const SHAPES_MAP = {
  CIRCLE: 'circle',
  SQUARE: 'square',
  RECTANGLE: 'rectangle',
  TRIANGLE: 'triangle',
  PENTAGON: 'pentagon',
  HEXAGON: 'hexagon',
  OVAL_H: 'oval_h',
  OVAL_V: 'oval_v'
};

export const ROWS_DATA = [
  { color: 'blue', shapes: [SHAPES_MAP.OVAL_H, SHAPES_MAP.HEXAGON, SHAPES_MAP.SQUARE], ar: 'الأزرق', en: 'blue', hex: '#0A5EA5', anchor: '🌊', anchorAr: 'البحر', anchorEn: 'Sea' },
  { color: 'green', shapes: [SHAPES_MAP.RECTANGLE, SHAPES_MAP.TRIANGLE, SHAPES_MAP.CIRCLE], ar: 'الأخضر', en: 'green', hex: '#2B803E', anchor: '🍃', anchorAr: 'الورقة', anchorEn: 'Leaf' },
  { color: 'yellow', shapes: [SHAPES_MAP.OVAL_V, SHAPES_MAP.HEXAGON, SHAPES_MAP.PENTAGON], ar: 'الأصفر', en: 'yellow', hex: '#FBC507', anchor: '🍌', anchorAr: 'الموزة', anchorEn: 'Banana' },
  { color: 'red', shapes: [SHAPES_MAP.CIRCLE, SHAPES_MAP.TRIANGLE, SHAPES_MAP.SQUARE], ar: 'الأحمر', en: 'red', hex: '#D21B1B', anchor: '🍎', anchorAr: 'التفاحة', anchorEn: 'Apple' },
  { color: 'white', shapes: [SHAPES_MAP.HEXAGON, SHAPES_MAP.SQUARE, SHAPES_MAP.TRIANGLE], ar: 'الأبيض', en: 'white', hex: '#FFFFFF', anchor: '❄️', anchorAr: 'الثلج', anchorEn: 'Snow' },
  { color: 'black', shapes: [SHAPES_MAP.RECTANGLE, SHAPES_MAP.PENTAGON, SHAPES_MAP.OVAL_H], ar: 'الأسود', en: 'black', hex: '#1A1A1D', anchor: '🐈‍⬛', anchorAr: 'القط الأسود', anchorEn: 'Black Cat' }
];

export const TRANSLATIONS = {
  shapes: {
    [SHAPES_MAP.CIRCLE]: { ar: 'الدائرة', en: 'circle' },
    [SHAPES_MAP.SQUARE]: { ar: 'المربع', en: 'square' },
    [SHAPES_MAP.RECTANGLE]: { ar: 'المستطيل', en: 'rectangle' },
    [SHAPES_MAP.TRIANGLE]: { ar: 'المثلث', en: 'triangle' },
    [SHAPES_MAP.PENTAGON]: { ar: 'الشكل الخماسي', en: 'pentagon' },
    [SHAPES_MAP.HEXAGON]: { ar: 'الشكل السداسي', en: 'hexagon' },
    [SHAPES_MAP.OVAL_H]: { ar: 'الشكل البيضاوي الأفقي', en: 'horizontal oval' },
    [SHAPES_MAP.OVAL_V]: { ar: 'الشكل البيضاوي العمودي', en: 'vertical oval' }
  }
};

class GameState {
  constructor() {
    this.listeners = new Set();
    this.reset();
  }

  reset() {
    this.activeTab = 'board'; 
    this.mode = 'challenge'; 
    this.currentChallenge = null;
    
    // Board State
    this.boardFilledSlots = {}; 
    this.totalBoardSlots = 18;

    // Colors Worksheet Memory State
    this.colorsSelectedColor = null;
    this.coloredStrips = {}; 
    this.coloredShapes = {
      square: null,
      triangle: null,
      circle: null
    };

    // Show-and-Hide targets
    this.targetStripsPattern = []; // Generated randomly at start of challenge
    this.targetShapesPattern = {
      square: null,
      triangle: null,
      circle: null
    };

    this.isStripsMemoryActive = false;
    this.isShapesMemoryActive = false;

    // Shapes Worksheet State
    this.shapesSelectedColor = null;
    this.shapesSplitColors = {
      circleLeft: null,
      circleRight: null,
      triangleLeft: null,
      triangleRight: null,
      pentagonLeft: null,
      pentagonRight: null,
      ovalTop: null,
      ovalBottom: null,
      rectangleLeft: null,
      rectangleRight: null
    };
    
    this.sequenceAnswers = Array(6).fill(null);
    this.currentSequencePattern = []; 
    this.generateRandomPattern();

    logger.info('State', 'Game state has been reset.');
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this);
      } catch (err) {
        logger.error('State', 'Error in state listener callback', err);
      }
    });
  }

  setTab(tabName) {
    if (this.activeTab !== tabName) {
      this.activeTab = tabName;
      logger.info('State', `Tab changed to: ${tabName}`);
      this.notify();
    }
  }

  setMode(modeName) {
    if (this.mode !== modeName) {
      this.mode = modeName;
      logger.info('State', `Board game mode changed to: ${modeName}`);
      this.notify();
    }
  }

  selectColor(colorHex, sourceTab) {
    if (sourceTab === 'colors') {
      this.colorsSelectedColor = colorHex;
    } else if (sourceTab === 'shapes') {
      this.shapesSelectedColor = colorHex;
    }
    logger.debug('State', `Color selected in ${sourceTab}: ${colorHex}`);
    this.notify();
  }

  fillBoardSlot(slotId, stencilId) {
    this.boardFilledSlots[slotId] = stencilId;
    const count = Object.keys(this.boardFilledSlots).length;
    logger.info('State', `Board slot filled: ${slotId}. Total filled: ${count}/${this.totalBoardSlots}`);
    this.notify();
  }

  isBoardComplete() {
    return Object.keys(this.boardFilledSlots).length === this.totalBoardSlots;
  }

  // Flash Memory Mode setters
  startStripsMemoryChallenge(colors) {
    this.targetStripsPattern = colors;
    this.coloredStrips = {};
    this.isStripsMemoryActive = true;
    logger.info('State', 'Strips Flash Memory Challenge pattern generated', colors);
    this.notify();
  }

  startShapesMemoryChallenge(colorsMap) {
    this.targetShapesPattern = colorsMap;
    this.coloredShapes = { square: null, triangle: null, circle: null };
    this.isShapesMemoryActive = true;
    logger.info('State', 'Shapes Flash Memory Challenge pattern generated', colorsMap);
    this.notify();
  }

  colorStrip(index, colorHex) {
    this.coloredStrips[index] = colorHex;
    logger.info('State', `Colors sheet strip ${index} colored with: ${colorHex}`);
    this.notify();
  }

  colorShape(shapeKey, colorHex) {
    this.coloredShapes[shapeKey] = colorHex;
    logger.info('State', `Colors sheet shape ${shapeKey} colored with: ${colorHex}`);
    this.notify();
  }

  validateStripsMemory() {
    if (!this.isStripsMemoryActive || this.targetStripsPattern.length === 0) return false;
    return this.targetStripsPattern.every((targetHex, idx) => {
      const current = this.coloredStrips[idx];
      return current && current.toUpperCase() === targetHex.toUpperCase();
    });
  }

  validateShapesMemory() {
    if (!this.isShapesMemoryActive) return false;
    const sCorrect = this.coloredShapes.square && this.coloredShapes.square.toUpperCase() === this.targetShapesPattern.square.toUpperCase();
    const tCorrect = this.coloredShapes.triangle && this.coloredShapes.triangle.toUpperCase() === this.targetShapesPattern.triangle.toUpperCase();
    const cCorrect = this.coloredShapes.circle && this.coloredShapes.circle.toUpperCase() === this.targetShapesPattern.circle.toUpperCase();
    return sCorrect && tCorrect && cCorrect;
  }

  // Shapes Worksheet operations
  colorSplitShapeSegment(segmentKey, colorHex) {
    this.shapesSplitColors[segmentKey] = colorHex;
    logger.info('State', `Shapes sheet segment ${segmentKey} colored with: ${colorHex}`);
    this.notify();
  }

  setSequenceAnswer(index, colorHex) {
    this.sequenceAnswers[index] = colorHex;
    logger.info('State', `Sequence cell ${index} colored with: ${colorHex}`);
    this.notify();
  }

  generateRandomPattern() {
    const colorsList = ['#D21B1B', '#FBC507', '#0A5EA5', '#2B803E'];
    const colA = colorsList[Math.floor(Math.random() * colorsList.length)];
    let colB = colorsList[Math.floor(Math.random() * colorsList.length)];
    while (colB === colA) {
      colB = colorsList[Math.floor(Math.random() * colorsList.length)];
    }

    this.currentSequencePattern = [
      { color: colA, interactive: false },
      { color: colB, interactive: false },
      { color: colA, interactive: false },
      { color: colB, interactive: true, id: 3 }, 
      { color: colA, interactive: false },
      { color: colB, interactive: false }
    ];
    this.sequenceAnswers = Array(6).fill(null);
  }

  validateShapesSheet() {
    const targets = {
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

    let splitsCorrect = true;
    for (const [key, targetColor] of Object.entries(targets)) {
      const current = this.shapesSplitColors[key];
      const match = current && current.toUpperCase() === targetColor.toUpperCase();
      if (!match) splitsCorrect = false;
    }

    const targetPatternColor = this.currentSequencePattern[3].color;
    const sequenceCorrect = this.sequenceAnswers[3] && 
                            this.sequenceAnswers[3].toUpperCase() === targetPatternColor.toUpperCase();

    const isComplete = splitsCorrect && sequenceCorrect;

    return {
      isComplete,
      splitsCorrect,
      sequenceCorrect
    };
  }
}

export const gameState = new GameState();
export { ROWS_DATA as rowsData, TRANSLATIONS as translations };