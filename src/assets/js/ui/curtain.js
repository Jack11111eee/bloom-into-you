// The dark curtain: the multilingual opening, first-load reveal and the cover between pages.
import { root, ease, isReduced } from '../core/env.js';

const LIP = '10vh';

export function createCurtain(scroll) {
  const element = document.querySelector('[data-curtain]');
  const sheet = element.querySelector('.curtain__sheet');
  const label = element.querySelector('.curtain__label');
  const word = element.querySelector('[data-curtain-label]');
  const opening = [...element.querySelectorAll('[data-opening-word]')];

  const introOffset = () => (innerWidth > 540 ? '40vh' : '10vh');

  function prepare(container) {
    const rising = [...container.querySelectorAll('[data-intro]:not([data-intro="drop"])')];
    const dropping = [...container.querySelectorAll('[data-intro="drop"]')];
    if (isReduced()) return { rising, dropping };
    if (rising.length) gsap.set(rising, { y: introOffset() });
    if (dropping.length) gsap.set(dropping, { yPercent: -120 });
    return { rising, dropping };
  }

  function arrive(timeline, parts, at, { duration = 1.2, stagger = 0.06 } = {}) {
    if (parts.rising.length) timeline.to(parts.rising, { y: 0, duration, stagger, ease: ease.out }, at);
    if (parts.dropping.length) timeline.to(parts.dropping, { yPercent: 0, duration: 1.1, ease: 'back.out(1.4)' }, `${at}+=0.25`);
  }

  function lift(timeline) {
    timeline.addLabel('lift');
    timeline.to([label, ...opening], { opacity: 0, duration: 0.3, ease: 'none' }, 'lift');
    timeline.to(sheet, { yPercent: -100, duration: 0.9, ease: ease.inOut }, 'lift');
    timeline.to(sheet, { '--lip-bottom': '0vh', duration: 1, ease: ease.inOut }, 'lift');
  }

  function playOpening(timeline) {
    const first = opening[0];
    timeline.fromTo(first, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: ease.out }, 0.3);
    opening.slice(1).forEach((item, index) => {
      const at = 1.1 + index * 0.16;
      timeline.to(opening[index], { opacity: 0, duration: 0.05, ease: 'none' }, at);
      timeline.fromTo(item, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out' }, at + 0.04);
    });
    timeline.to({}, { duration: 0.5 });
  }

  // First visit: the opening on the home page, the page name everywhere else.
  function boot(container, home) {
    const parts = prepare(container);
    gsap.set(sheet, { y: 0, yPercent: 0, '--lip-bottom': LIP });
    root.classList.remove('is-booting');
    scroll.stop();
    if (isReduced()) return quietBoot(home);

    const greeting = gsap.timeline();
    if (home && opening.length) playOpening(greeting);
    else greeting.fromTo(label, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: ease.out }, 0.15);
    const stopSkipping = home ? skipOnInput(greeting) : () => {};
    const fontsReady = Promise.race([document.fonts.ready, new Promise(done => setTimeout(done, 1400))]);

    return Promise.all([greeting.then(), fontsReady]).then(() => {
      stopSkipping();
      const timeline = gsap.timeline();
      lift(timeline);
      arrive(timeline, parts, 'lift+=0.3', home ? { duration: 1.4, stagger: 0.07 } : {});
      timeline.add(() => scroll.start(), 'lift+=0.9');
      return timeline.then();
    });
  }

  // Any key, click or touch during the opening plays the rest quickly.
  function skipOnInput(timeline) {
    const controller = new AbortController();
    const skip = () => {
      timeline.timeScale(4);
      controller.abort();
    };
    for (const type of ['keydown', 'pointerdown', 'touchstart']) {
      addEventListener(type, skip, { signal: controller.signal, passive: true });
    }
    return () => controller.abort();
  }

  function quietBoot(home) {
    if (home && opening.length) gsap.set(opening.at(-1), { opacity: 1 });
    else gsap.set(label, { opacity: 1 });
    return new Promise(resolve => {
      gsap.timeline({ delay: 0.35, onComplete: resolve })
        .to(sheet, { opacity: 0, duration: 0.2 })
        .set(sheet, { yPercent: -100, opacity: 1, '--lip-bottom': '0vh' })
        .add(() => scroll.start());
    });
  }

  // Between pages: rise from below, then wait for the destination.
  function cover(nextLabel) {
    root.classList.add('is-transitioning');
    scroll.stop();
    gsap.set(label, { opacity: 0 });
    word.textContent = '';
    if (isReduced()) {
      gsap.set(sheet, { y: 0, yPercent: 0, '--lip-top': '0vh', '--lip-bottom': '0vh', opacity: 0 });
      return gsap.to(sheet, { opacity: 1, duration: 0.15 }).then(() => showLabel(nextLabel));
    }
    gsap.set(sheet, { y: 0, yPercent: 100, '--lip-top': '0vh', '--lip-bottom': '0vh', opacity: 1 });
    const timeline = gsap.timeline();
    timeline.to(sheet, { yPercent: 0, duration: 0.55, ease: ease.in }, 0);
    timeline.to(sheet, { '--lip-top': LIP, duration: 0.45, ease: ease.in }, 0);
    timeline.add(() => showLabel(nextLabel), 0.3);
    return timeline.then();
  }

  function showLabel(nextLabel) {
    const waiting = setTimeout(() => element.classList.add('is-waiting'), 1200);
    gsap.fromTo(label, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: ease.out });
    return Promise.resolve(nextLabel).then(text => {
      clearTimeout(waiting);
      if (text) word.textContent = text;
      if (element.classList.contains('is-waiting')) {
        element.classList.replace('is-waiting', 'is-arrived');
        setTimeout(() => element.classList.remove('is-arrived'), 220);
      }
    });
  }

  function reveal(container) {
    const parts = prepare(container);
    if (isReduced()) {
      return gsap.to(sheet, { opacity: 0, duration: 0.2, delay: 0.1 }).then(() => {
        gsap.set(sheet, { yPercent: -100, opacity: 1, '--lip-bottom': '0vh', '--lip-top': '0vh' });
        finish();
      });
    }
    const timeline = gsap.timeline({ onComplete: finish });
    timeline.addLabel('out', 0.15);
    timeline.to(sheet, { '--lip-top': '0vh', duration: 0.3, ease: 'power2.out' }, 'out');
    timeline.to(sheet, { yPercent: -100, duration: 0.8, ease: 'power3.inOut' }, 'out');
    timeline.fromTo(sheet, { '--lip-bottom': LIP }, { '--lip-bottom': '0vh', duration: 0.85, ease: 'power3.inOut' }, 'out+=0.2');
    timeline.to(label, { opacity: 0, duration: 0.4, ease: 'none' }, 'out');
    arrive(timeline, parts, 'out+=0.3', { duration: 1, stagger: 0.05 });
    return timeline.then();
  }

  function finish() {
    root.classList.remove('is-transitioning');
    element.classList.remove('is-waiting', 'is-arrived');
    scroll.start();
  }

  return { boot, cover, reveal };
}
