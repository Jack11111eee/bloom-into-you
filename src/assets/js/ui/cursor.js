// Pointer companion: a lagging preview window, dot and label over lists and cards.
import { pointer, hasFinePointer, clamp } from '../core/env.js';

const FOLLOW = { preview: 0.1, dot: 0.16, label: 0.2 };

export function mount(scope, { signal, scroll }) {
  const cursor = scope.querySelector('[data-cursor]');
  if (!cursor || !hasFinePointer()) return;
  const layers = {
    preview: cursor.querySelector('.cursor__preview'),
    dot: cursor.querySelector('.cursor__dot'),
    label: cursor.querySelector('.cursor__label'),
  };
  const stack = cursor.querySelector('[data-cursor-stack]');
  const place = Object.fromEntries(Object.keys(layers).map(key => [key, { x: pointer.x, y: pointer.y }]));
  let tilt = 0;
  let upgraded = false;

  // Frame-rate independent easing towards the pointer; the preview leans with its speed.
  const follow = (time, delta) => {
    const frames = delta / (1000 / 60);
    for (const [key, layer] of Object.entries(layers)) {
      const share = 1 - (1 - FOLLOW[key]) ** frames;
      place[key].x += (pointer.x - place[key].x) * share;
      place[key].y += (pointer.y - place[key].y) * share;
      layer.style.setProperty('--x', `${place[key].x}px`);
      layer.style.setProperty('--y', `${place[key].y}px`);
    }
    const lean = cursor.dataset.state === 'preview' ? clamp(pointer.vx * 0.35, -6, 6) : 0;
    tilt += (lean - tilt) * (1 - 0.88 ** frames);
    pointer.vx *= 0.9 ** frames;
    layers.preview.style.setProperty('--tilt', `${tilt.toFixed(2)}deg`);
  };
  gsap.ticker.add(follow);

  let current = null;

  function enter(target) {
    if (target === current) return;
    current = target;
    cursor.dataset.state = target.dataset.cursor;
    if (target.dataset.cursor !== 'preview' || !stack) return;
    if (!upgraded) {
      // Swap to the full image only once it is decoded, so the window never blanks.
      stack.querySelectorAll('img[data-src]').forEach(image => {
        const full = new Image();
        full.src = image.dataset.src;
        full.decode().then(() => { if (image.isConnected) image.src = full.src; }).catch(() => {});
      });
      upgraded = true;
    }
    const index = Number(target.dataset.cursorIndex || 0);
    gsap.to(stack, { yPercent: (-100 * index) / stack.children.length, duration: 0.6, ease: 'power2.inOut' });
  }

  scope.addEventListener('pointerover', event => {
    const target = event.target.closest('[data-cursor]:not(.cursor)');
    if (target) enter(target);
  }, { signal });
  scope.addEventListener('pointerout', event => {
    const target = event.target.closest('[data-cursor]:not(.cursor)');
    if (target && !target.contains(event.relatedTarget)) leave();
  }, { signal });
  function leave() {
    current = null;
    cursor.dataset.state = 'idle';
  }

  // Content can scroll beneath a still pointer; re-read what sits under it.
  const recheck = () => {
    const under = document.elementFromPoint(pointer.x, pointer.y)?.closest('[data-cursor]:not(.cursor)');
    if (under) enter(under);
    else leave();
  };
  const stopWatching = scroll.onScroll(() => pointer.seen && recheck());
  signal.addEventListener('abort', stopWatching);

  scope.addEventListener('pointerdown', () => cursor.classList.add('is-pressed'), { signal });
  const release = () => cursor.classList.remove('is-pressed');
  addEventListener('pointerup', release, { signal });
  addEventListener('pointercancel', release, { signal });

  return () => gsap.ticker.remove(follow);
}
