// The hanging wish strip sways on its string and catches the wind of a fast scroll.
import { isReduced, clamp } from '../core/env.js';

export function mount(scope) {
  const strip = scope.querySelector('[data-tanzaku]');
  if (!strip || isReduced()) return;
  const swing = strip.querySelector('.tanzaku__swing');
  gsap.set(swing, { '--sway': '-2.5deg' });
  const sway = gsap.to(swing, { '--sway': '2.5deg', duration: 2.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  const gust = gsap.quickTo(strip, 'rotation', { duration: 0.45, ease: 'power2.out' });
  let settle = null;

  ScrollTrigger.create({
    trigger: strip.closest('.hero') || strip,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: self => (self.isActive ? sway.play() : sway.pause()),
    onUpdate(self) {
      gust(clamp(self.getVelocity() / 400, -6, 6));
      settle?.kill();
      settle = gsap.delayedCall(0.2, () => gsap.to(strip, { rotation: 0, duration: 1.6, ease: 'elastic.out(1, 0.3)' }));
    },
  });

  return () => settle?.kill();
}
