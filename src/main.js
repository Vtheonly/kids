import { logger } from './core/logger.js';
import { gameState } from './core/state.js';
import { BoardComponent } from './components/board.js';
import { ColorsComponent } from './components/colors.js';
import { ShapesComponent } from './components/shapes.js';
import { UIComponent } from './components/ui.js';

class AppManager {
  constructor() {
    this.ui = null;
    this.activeComponent = null;

    // Confetti Celebration Canvas
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
  }

  init() {
    logger.info('App', 'Bootstrapping Unikey Kids Educational Suite...');

    // Instantiate UI
    this.ui = new UIComponent();
    this.ui.init();

    // Setup Confetti
    this.initConfetti();

    // Bind state changes to manage component lifecycle
    gameState.subscribe((state) => this.handleTabTransition(state.activeTab));

    // Handle global resets
    window.addEventListener('game-reset', () => {
      gameState.reset();
      this.rebootActiveComponent();
    });

    // Mount initial component
    this.handleTabTransition(gameState.activeTab);
  }

  handleTabTransition(tabName) {
    // Unmount current active component
    if (this.activeComponent) {
      this.activeComponent.unmount();
      this.activeComponent = null;
    }

    // Mount new component
    if (tabName === 'board') {
      const container = document.getElementById('rows-wrapper');
      const tray = document.getElementById('stencils-tray');
      this.activeComponent = new BoardComponent(container, tray);
    } else if (tabName === 'colors') {
      const panel = document.getElementById('panel-colors');
      this.activeComponent = new ColorsComponent(panel);
    } else if (tabName === 'shapes') {
      const panel = document.getElementById('panel-shapes');
      this.activeComponent = new ShapesComponent(panel);
    }

    if (this.activeComponent) {
      this.activeComponent.mount();
    }
  }

  rebootActiveComponent() {
    if (this.activeComponent) {
      this.activeComponent.unmount();
      this.activeComponent.mount();
    }
  }

  initConfetti() {
    this.canvas = document.getElementById('celebration-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    
    const resizeCanvas = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Listen to custom confetti bursts
    window.addEventListener('celebration-burst', () => this.triggerConfettiBurst());

    // Start particles animation loop
    this.animateParticles();
  }

  triggerConfettiBurst() {
    if (!this.canvas) return;
    
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
      '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', 
      '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', 
      '#ffc107', '#ff9800', '#ff5722'
    ];

    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 250,
        y: this.canvas.height / 2 + (Math.random() - 0.5) * 150,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 2) * 6 - 2, // upwards initial velocity
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8
      });
    }
    logger.debug('App', `Triggered confetti burst of ${particleCount} particles.`);
  }

  animateParticles() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // gravity
      p.rotation += p.rotationSpeed;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      
      // Draw rectangular confetti piece
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();

      // Remove offscreen particles
      if (p.y > this.canvas.height || p.x < 0 || p.x > this.canvas.width) {
        this.particles.splice(i, 1);
      }
    }

    requestAnimationFrame(() => this.animateParticles());
  }
}

// Bootstrap once window DOM content is ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new AppManager();
  app.init();
  
  // Attach app event helpers to segments
  window.paintColorsShape = (key, segmentEl) => {
    if (app.activeComponent instanceof ColorsComponent) {
      app.activeComponent.paintShape(key, segmentEl);
    }
  };

  window.paintShapesSegment = (key, segmentEl) => {
    if (app.activeComponent instanceof ShapesComponent) {
      app.activeComponent.paintSegment(key, segmentEl);
    }
  };
});
