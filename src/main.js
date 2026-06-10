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
    this.currentTab = null;

    // Confetti Celebration Canvas
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
  }

  init() {
    logger.info('App', 'Bootstrapping Unikey Kids Educational Suite...');

    this.ui = new UIComponent();
    this.ui.init();

    this.initConfetti();

    gameState.subscribe((state) => {
      if (this.currentTab !== state.activeTab) {
        this.handleTabTransition(state.activeTab);
      }
    });

    window.addEventListener('game-reset', () => {
      gameState.reset();
      this.rebootActiveComponent();
    });

    this.handleTabTransition(gameState.activeTab);
  }

  handleTabTransition(tabName) {
    if (this.activeComponent) {
      this.activeComponent.unmount();
      this.activeComponent = null;
    }

    this.currentTab = tabName;

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

    // Listen to custom confetti bursts with custom position coordinates
    window.addEventListener('celebration-burst', (e) => {
      const x = (e.detail && e.detail.x !== undefined) ? e.detail.x : this.canvas.width / 2;
      const y = (e.detail && e.detail.y !== undefined) ? e.detail.y : this.canvas.height / 2;
      const isMini = !!(e.detail && e.detail.mini);
      this.triggerConfettiBurst(x, y, isMini);
    });

    this.animateParticles();
  }

  triggerConfettiBurst(x, y, isMini = false) {
    if (!this.canvas) return;
    
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
      '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', 
      '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', 
      '#ffc107', '#ff9800', '#ff5722'
    ];

    const particleCount = isMini ? 18 : 45;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * (isMini ? 8 : 12),
        vy: (Math.random() - 2) * (isMini ? 4 : 6) - 1, // Upwards trajectory physics
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * (isMini ? 5 : 8) + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12
      });
    }
  }

  animateParticles() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // Gravity simulation pull
      p.rotation += p.rotationSpeed;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();

      if (p.y > this.canvas.height || p.x < 0 || p.x > this.canvas.width) {
        this.particles.splice(i, 1);
      }
    }

    requestAnimationFrame(() => this.animateParticles());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new AppManager();
  app.init();
  
  // Expose event handler helper to inline attributes with event objects
  window.paintColorsShape = (key, segmentEl, event) => {
    if (app.activeComponent instanceof ColorsComponent) {
      app.activeComponent.paintShape(key, segmentEl, event);
    }
  };

  window.paintShapesSegment = (key, segmentEl, event) => {
    if (app.activeComponent instanceof ShapesComponent) {
      app.activeComponent.paintSegment(key, segmentEl, event);
    }
  };
});