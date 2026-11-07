// Controls lean towards the pointer; their labels follow at half the distance.
import { hasFinePointer, isReduced } from '../core/env.js';

export function mount(scope, { signal }) {
  if (!hasFinePointer() || isReduced()) return;
  for (const element of scope.querySelectorAll('[data-magnet]')) {
    const strength = Number(element.dataset.magnet) || 28;
    const body = element.querySelector('[data-magnet-body]') || element;
    const inner = element.querySelector('[data-magnet-inner]');
    const follow = [body, inner].filter(Boolean).map(target => ({
      x: gsap.quickTo(target, 'x', { duration: 0.7, ease: 'power3.out' }),
      y: gsap.quickTo(target, 'y', { duration: 0.7, ease: 'power3.out' }),
    }));
    let box = null;
    element.addEventListener('pointerenter', () => {
      box = element.getBoundingClientRect();
    }, { signal });
    element.addEventListener('pointermove', event => {
      if (!box) return;
      const dx = (event.clientX - box.left) / box.width - 0.5;
      const dy = (event.clientY - box.top) / box.height - 0.5;
      follow.forEach((target, index) => {
        const share = index === 0 ? 1 : 0.5;
        target.x(dx * strength * share);
        target.y(dy * strength * share);
      });
    }, { signal });
    element.addEventListener('pointerleave', () => {
      box = null;
      gsap.to([body, inner].filter(Boolean), { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.38)', overwrite: true });
    }, { signal });
  }
}
