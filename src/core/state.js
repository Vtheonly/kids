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
  { color: 'blue', shapes: [SHAPES_MAP.OVAL_H, SHAPES_MAP.HEXAGON, SHAPES_MAP.SQUARE], ar: 'الأزرق', en: 'blue', hex: '#0A5EA5' },
  { color: 'green', shapes: [SHAPES_MAP.RECTANGLE, SHAPES_MAP.TRIANGLE, SHAPES_MAP.CIRCLE], ar: 'الأخضر', en: 'green', hex: '#2B803E' },
  { color: 'yellow', shapes: [SHAPES_MAP.OVAL_V, SHAPES_MAP.HEXAGON, SHAPES_MAP.PENTAGON], ar: 'الأصفر', en: 'yellow', hex: '#FBC507' },
  { color: 'red', shapes: [SHAPES_MAP.CIRCLE, SHAPES_MAP.TRIANGLE, SHAPES_MAP.SQUARE], ar: 'الأحمر', en: 'red', hex: '#D21B1B' },
  { color: 'white', shapes: [SHAPES_MAP.HEXAGON, SHAPES_MAP.SQUARE, SHAPES_MAP.TRIANGLE], ar: 'الأبيض', en: 'white', hex: '#FFFFFF' },
  { color: 'black', shapes: [SHAPES_MAP.RECTANGLE, SHAPES_MAP.PENTAGON, SHAPES_MAP.OVAL_H], ar: 'الأسود', en: 'black', hex: '#1A1A1D' }
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
    this.activeTab = 'board'; // 'board', 'colors', 'shapes'
    this.mode = 'challenge'; // 'challenge', 'free'
    this.currentChallenge = null;
    this.activeDraggable = null;
    
    // Board State
    this.boardFilledSlots = {}; // slotId -> stencilId
    this.totalBoardSlots = 18;

    // Colors Worksheet State
    this.colorsSelectedColor = null;
    this.coloredStrips = {}; // stripIndex -> colorHex
    this.coloredShapes = {
      square: null,
      triangle: null,
      circle: null
    };

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
    this.sequenceAnswers = Array(6).fill(null); // slots 0-5. Slot 3 is interactive question

    logger.info('State', 'Game state has been reset/initialized.');
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

  // Board operations
  fillBoardSlot(slotId, stencilId) {
    this.boardFilledSlots[slotId] = stencilId;
    const count = Object.keys(this.boardFilledSlots).length;
    logger.info('State', `Board slot filled: ${slotId} with stencil: ${stencilId}. Total filled: ${count}/${this.totalBoardSlots}`);
    this.notify();
  }

  clearBoardSlot(slotId) {
    if (this.boardFilledSlots[slotId]) {
      delete this.boardFilledSlots[slotId];
      logger.info('State', `Board slot cleared: ${slotId}. Total filled: ${Object.keys(this.boardFilledSlots).length}`);
      this.notify();
    }
  }

  isBoardComplete() {
    return Object.keys(this.boardFilledSlots).length === this.totalBoardSlots;
  }

  // Colors Worksheet operations
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

  validateColorsSheet() {
    // 6 strips must be colored in order of board lanes: Blue, Green, Yellow, Red, White, Black
    const correctStrips = ['#0A5EA5', '#2B803E', '#FBC507', '#D21B1B', '#FFFFFF', '#1A1A1D'];
    const stripsComplete = correctStrips.every((correctHex, idx) => {
      const current = this.coloredStrips[idx];
      return current && current.toUpperCase() === correctHex.toUpperCase();
    });

    // Shapes validation based on board locations:
    // Square: Blue, Red, White
    // Triangle: Green, Red, White
    // Circle: Green, Red
    const squareValid = ['#0A5EA5', '#D21B1B', '#FFFFFF'];
    const triangleValid = ['#2B803E', '#D21B1B', '#FFFFFF'];
    const circleValid = ['#2B803E', '#D21B1B'];

    const squareVal = this.coloredShapes.square;
    const triangleVal = this.coloredShapes.triangle;
    const circleVal = this.coloredShapes.circle;

    const squareCorrect = squareVal && squareValid.includes(squareVal.toUpperCase());
    const triangleCorrect = triangleVal && triangleValid.includes(triangleVal.toUpperCase());
    const circleCorrect = circleVal && circleValid.includes(circleVal.toUpperCase());

    const isComplete = stripsComplete && squareCorrect && triangleCorrect && circleCorrect;
    
    logger.debug('State', 'Colors sheet validation status', {
      stripsComplete,
      squareCorrect,
      triangleCorrect,
      circleCorrect,
      isComplete
    });

    return {
      isComplete,
      stripsComplete,
      squareCorrect,
      triangleCorrect,
      circleCorrect
    };
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

  validateShapesSheet() {
    // Split shapes exact patterns:
    // 1. Circle (split-circle): Left Green, Right Blue
    // 2. Triangle (split-triangle): Left Blue, Right Yellow
    // 3. Pentagon (split-pentagon): Left White, Right Black
    // 4. Oval (split-oval): Top Green, Bottom Yellow
    // 5. Rectangle (split-rectangle): Left Red, Right White
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
    const splitReport = {};
    for (const [key, targetColor] of Object.entries(targets)) {
      const current = this.shapesSplitColors[key];
      const match = current && current.toUpperCase() === targetColor.toUpperCase();
      splitReport[key] = match;
      if (!match) splitsCorrect = false;
    }

    // Sequence check: Red -> Yellow -> Red -> [?] -> Red -> Yellow
    // The missing element (index 3) must be Yellow (#FBC507)
    const sequenceCorrect = this.sequenceAnswers[3] && 
                            this.sequenceAnswers[3].toUpperCase() === '#FBC507';

    const isComplete = splitsCorrect && sequenceCorrect;

    logger.debug('State', 'Shapes sheet validation status', {
      splitsCorrect,
      sequenceCorrect,
      isComplete
    });

    return {
      isComplete,
      splitsCorrect,
      splitReport,
      sequenceCorrect
    };
  }
}

export const gameState = new GameState();
export { ROWS_DATA as rowsData, TRANSLATIONS as translations };
