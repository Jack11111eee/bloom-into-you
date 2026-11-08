// Endless title band; reverses with the scroll direction and quickens with its speed.
import { isReduced, clamp } from '../core/env.js';

// Whole cycles kept behind the playhead so the band can also run left to right.
const HEADROOM = 1000;

export function mount(scope, { signal }) {
  const marquee = scope.querySelector('[data-marquee]');
  if (!marquee || isReduced()) return;
  const track = marquee.querySelector('.marquee__track');
  let loop = null;

  function build() {
    if (signal.aborted || !marquee.isConnected) return;
    marquee.querySelectorAll('[data-clone]').forEach(clone => clone.remove());
    const width = track.getBoundingClientRect().width;
    if (!width) return;
    const copies = Math.ceil((innerWidth * 2) / width);
    for (let i = 0; i < copies; i++) {
      const clone = track.cloneNode(true);
      clone.dataset.clone = '';
      marquee.append(clone);
    }
    const phase = loop ? loop.progress() : 0;
    loop?.kill();
    loop = gsap.fromTo(marquee, { x: 0 }, {
      x: -width,
      duration: 20,
      ease: 'none',
      repeat: -1,
      // Played backwards, a repeating tween halts at its first cycle; jump ahead in whole cycles.
      onReverseComplete() {
        this.totalTime(this.totalTime() + this.duration() * HEADROOM);
      },
    });
    loop.totalTime(loop.duration() * (HEADROOM + phase));
  }

  build();
  document.fonts.ready.then(build);
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  }, { signal });

  // Scrolling steers the loop: its direction follows the scroll, its pace the scroll speed.
  // A killed tween revives if its timeScale is set, so steering stops once the page leaves.
  let direction = 1;
  const steer = pace => {
    if (signal.aborted || !loop) return;
    gsap.to(loop, { timeScale: pace, duration: 0.5, ease: 'power2.out', overwrite: true });
  };
  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: 'max',
    onUpdate(self) {
      direction = self.direction;
      steer(direction * (1 + clamp(Math.abs(self.getVelocity()) / 1800, 0, 1.4)));
    },
  });
  const settle = () => steer(direction);
  ScrollTrigger.addEventListener('scrollEnd', settle);

  return () => {
    ScrollTrigger.removeEventListener('scrollEnd', settle);
    clearTimeout(resizeTimer);
    if (loop) {
      gsap.killTweensOf(loop);
      loop.kill();
      loop = null;
    }
    gsap.killTweensOf(marquee);
  };
}
