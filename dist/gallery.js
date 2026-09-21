// Karma — handscroll input. Drag, swipe, wheel and arrow keys move a scroll value in painting
// units with inertia, rubber-banded ends and a snap to the nearest painting. The scene draws it;
// this file only decides where the scroll is.

export class Gallery {
  /**
   * @param {HTMLElement} surface  element that receives drags (the stage)
   * @param {number} count
   * @param {{ onScroll:(s:number)=>void, onFocus:(i:number)=>void, unitPx:()=>number }} handlers
   */
  constructor(surface, count, handlers) {
    this.surface = surface;
    this.count = count;
    this.h = handlers;
    this.scroll = 0;
    this.targetIndex = 0;
    this.velocity = 0;
    this.locked = false;
    this.dragEnabled = true;     // off under reduced motion: chevrons and arrow keys still work
    this.dragging = false;
    this.raf = 0;
    this.lastFocus = -1;
    this.pointerId = null;
    this.samples = [];

    surface.addEventListener('pointerdown', (e) => this.onDown(e));
    surface.addEventListener('pointermove', (e) => this.onMove(e));
    surface.addEventListener('pointerup', (e) => this.onUp(e));
    surface.addEventListener('pointercancel', (e) => this.onUp(e));
    surface.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  get max() { return this.count - 1; }

  /** Locked: no user input, but an unfinished snap completes so the session opens on a centred painting. */
  setLocked(on) {
    this.locked = on;
    if (on) {
      this.dragging = false;
      this.surface.classList.remove('is-dragging');
      this.targetIndex = Math.max(0, Math.min(this.max, Math.round(this.scroll)));
      this.animate();
    }
  }

  /** Jump without animation (boot). */
  jumpTo(i) {
    this.scroll = this.targetIndex = Math.max(0, Math.min(this.max, i));
    this.velocity = 0;
    this.h.onScroll(this.scroll);
    this.emitFocus();
  }

  /** Animate to a painting. */
  goTo(i) {
    if (this.locked) return;
    this.targetIndex = Math.max(0, Math.min(this.max, Math.round(i)));
    this.velocity = 0;
    this.dragging = false;
    this.animate();
  }

  onDown(e) {
    if (this.locked || !this.dragEnabled || e.button > 0) return;
    if (e.target.closest('button, a, input, label')) return;
    this.dragging = true;
    this.pointerId = e.pointerId;
    this.surface.setPointerCapture?.(e.pointerId);
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startT = performance.now();
    this.moved = 0;
    this.startScroll = this.scroll;
    this.samples = [{ x: e.clientX, t: performance.now() }];
    this.stopAnimation();
    this.surface.classList.add('is-dragging');
  }

  onMove(e) {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const unit = this.h.unitPx();
    let s = this.startScroll - (e.clientX - this.startX) / unit;
    // Rubber band past either end.
    if (s < 0) s = -this.rubber(-s);
    else if (s > this.max) s = this.max + this.rubber(s - this.max);
    this.scroll = s;
    this.moved = Math.max(this.moved, Math.abs(e.clientX - this.startX), Math.abs(e.clientY - this.startY));
    this.samples.push({ x: e.clientX, t: performance.now() });
    if (this.samples.length > 6) this.samples.shift();
    this.h.onScroll(this.scroll);
    this.emitFocus();
  }

  onUp(e) {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.surface.classList.remove('is-dragging');
    this.surface.releasePointerCapture?.(e.pointerId);
    // A still, short press is a tap on the painting, not a scroll.
    if (this.moved < 8 && performance.now() - this.startT < 400) {
      this.h.onTap?.(e.clientX, e.clientY);
    }
    const unit = this.h.unitPx();
    const a = this.samples[0];
    const b = this.samples[this.samples.length - 1];
    const dt = Math.max(16, b.t - a.t);
    const vPxPerMs = (b.x - a.x) / dt;
    // A flick moves one painting; a slow release snaps to the nearest.
    const flick = Math.abs(vPxPerMs) > 0.35 ? -Math.sign(vPxPerMs) : 0;
    const nearest = Math.round(this.scroll);
    let next = flick !== 0 && flick === Math.sign(this.scroll - this.startScroll) ? Math.round(this.startScroll) + flick : nearest;
    if (flick !== 0 && nearest === Math.round(this.startScroll)) next = Math.round(this.startScroll) + flick;
    this.targetIndex = Math.max(0, Math.min(this.max, next));
    this.animate();
  }

  onWheel(e) {
    if (this.locked || !this.dragEnabled) return;
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : e.deltaY);
    if (Math.abs(dx) < 2) return;
    e.preventDefault();
    const now = performance.now();
    if (now - (this.lastWheel || 0) < 320) return;   // one painting per wheel gesture
    this.lastWheel = now;
    this.goTo(this.targetIndex + Math.sign(dx));
  }

  rubber(over) { return 0.35 * over / (1 + over * 1.6); }

  animate() {
    this.stopAnimation();
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const diff = this.targetIndex - this.scroll;
      if (Math.abs(diff) < 0.0008) {
        this.scroll = this.targetIndex;
        this.h.onScroll(this.scroll);
        this.emitFocus();
        this.raf = 0;
        return;
      }
      this.scroll += diff * (1 - Math.exp(-dt / 0.13));   // time-based, so 60 Hz and 120 Hz feel the same
      this.h.onScroll(this.scroll);
      this.emitFocus();
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stopAnimation() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }

  emitFocus() {
    const i = Math.max(0, Math.min(this.max, Math.round(this.scroll)));
    if (i !== this.lastFocus) { this.lastFocus = i; this.h.onFocus(i); }
  }
}
