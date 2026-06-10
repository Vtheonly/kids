import { logger } from '../core/logger.js';

export class BoardDragEngine {
  constructor(boardComponent) {
    this.board = boardComponent;
    this.activeDragElement = null;
    this.pointerId = null;
    this.initialClientPos = { x: 0, y: 0 };
    this.lastPointerPos = { x: 0, y: 0 };

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
  }

  init(element) {
    element.addEventListener('pointerdown', (e) => this.onPointerDown(e, element));
  }

  onPointerDown(e, element) {
    if (element.classList.contains('locked-to-board')) return;
    e.preventDefault();

    this.activeDragElement = element;
    this.pointerId = e.pointerId;

    this.initialClientPos = { x: e.clientX, y: e.clientY };
    this.lastPointerPos = { x: e.clientX, y: e.clientY };

    element.classList.add('dragging');
    this.board.onDragStart();

    // Attach listeners globally to the window
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  onPointerMove(e) {
    if (!this.activeDragElement || e.pointerId !== this.pointerId) return;

    // Track the last known non-zero client coordinates
    if (e.clientX !== 0 && e.clientX !== undefined) {
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    }

    const dx = e.clientX - this.initialClientPos.x;
    const dy = e.clientY - this.initialClientPos.y;

    this.activeDragElement.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.1)`;
  }

  onPointerUp(e) {
    if (!this.activeDragElement || e.pointerId !== this.pointerId) return;

    const stencil = this.activeDragElement;
    stencil.classList.remove('dragging');

    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);

    // Use last saved non-zero coordinates if the up event has lost them
    const dropX = (e.clientX !== 0 && e.clientX !== undefined) ? e.clientX : this.lastPointerPos.x;
    const dropY = (e.clientY !== 0 && e.clientY !== undefined) ? e.clientY : this.lastPointerPos.y;

    this.activeDragElement = null;
    this.pointerId = null;

    // Pass control back to the board component to check for slot collisions
    this.board.onDragEnd(stencil, dropX, dropY);
  }

  cancelActiveDrag() {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.activeDragElement = null;
    this.pointerId = null;
  }
}