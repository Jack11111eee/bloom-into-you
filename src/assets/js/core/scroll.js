// Smooth scrolling on top of native scroll; reduced motion keeps the browser default.
import { root, isReduced } from './env.js';

export function createScroll() {
  const lenis = isReduced() ? null : new Lenis({ lerp: 0.1, smoothWheel: true });
  const listeners = new Set();

  if (lenis) {
    lenis.on('scroll', () => {
      ScrollTrigger.update();
      listeners.forEach(listener => listener(lenis.scroll));
    });
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    addEventListener('scroll', () => listeners.forEach(listener => listener(scrollY)), { passive: true });
  }

  return {
    get y() {
      return lenis ? lenis.scroll : scrollY;
    },
    onScroll(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stop() {
      if (lenis) lenis.stop();
      else root.classList.add('is-locked');
    },
    start() {
      if (lenis) lenis.start();
      else root.classList.remove('is-locked');
    },
    to(target, { offset = 0, duration = 0.7, immediate = false } = {}) {
      if (lenis) lenis.scrollTo(target, { offset, duration, immediate, lock: true, force: true });
      else {
        const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY;
        scrollTo({ top: y + offset, behavior: 'instant' });
      }
    },
    reset() {
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      scrollTo(0, 0);
    },
    resize() {
      lenis?.resize();
      ScrollTrigger.refresh();
    },
  };
}
