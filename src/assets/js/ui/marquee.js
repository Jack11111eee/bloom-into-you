// Endless title band; reverses with the scroll direction and quickens with its speed.
import { isReduced, clamp } from '../core/env.js';

export function mount(scope, { signal }) {
  const marquee = scope.querySelector('[data-marquee]');
  if (!marquee || isReduced()) return;
  const track = marquee.querySelector('.marquee__track');
  let loop = null;

  function build() {
    marquee.querySelectorAll('[data-clone]').forEach(clone => clone.remove());
    const width = track.getBoundingClientRect().width;
    if (!width) return;
    const copies = Math.ceil((innerWidth * 2) / width);
    for (let i = 0; i < copies; i++) {
      const clone = track.cloneNode(true);
      clone.dataset.clone = '';
      marquee.append(clone);
    }
    const progress = loop ? loop.progress() : 0;
    loop?.kill();
    loop = gsap.fromTo(marquee, { x: 0 }, { x: -width, duration: 20, ease: 'none', repeat: -1 });
    loop.progress(progress);
  }

  build();
  document.fonts.ready.then(() => { if (marquee.isConnected) build(); });
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  }, { signal });

  let direction = 1;
  const speed = { value: 1 };
  const setSpeed = gsap.quickTo(speed, 'value', {
    duration: 0.5,
    ease: 'power2.out',
    onUpdate: () => loop?.timeScale(speed.value),
  });
  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: 'max',
    onUpdate(self) {
      direction = self.direction;
      setSpeed(direction * (1 + clamp(Math.abs(self.getVelocity()) / 1800, 0, 1.4)));
    },
  });
  const settle = () => setSpeed(direction);
  ScrollTrigger.addEventListener('scrollEnd', settle);

  return () => {
    ScrollTrigger.removeEventListener('scrollEnd', settle);
    clearTimeout(resizeTimer);
    loop?.kill();
  };
}
