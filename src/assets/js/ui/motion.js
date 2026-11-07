// Scroll-linked motion: parallax, drifting page endings and small decorative scenes.
import { root, isReduced } from '../core/env.js';

// Distance an element travels relative to the page, from its data-parallax speed.
function parallax(element) {
  const speed = Number(element.dataset.parallax) / 10;
  if (!speed) return;
  const mode = element.dataset.parallaxMode || 'center';
  const axis = element.dataset.parallaxAxis === 'x' ? 'x' : 'y';
  if (mode === 'top') {
    const host = element.closest('header, section, footer') || element;
    gsap.fromTo(element, { [axis]: 0 }, {
      [axis]: () => -speed * (host.offsetTop + host.offsetHeight),
      ease: 'none',
      scrollTrigger: { trigger: host, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
  } else if (mode === 'end') {
    const host = element.closest('footer') || element;
    gsap.fromTo(element, { [axis]: () => speed * host.offsetHeight }, {
      [axis]: 0,
      ease: 'none',
      scrollTrigger: { trigger: host, start: 'top bottom', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
    });
  } else {
    const travel = () => ((innerHeight + element.offsetHeight) / 2) * speed;
    gsap.fromTo(element, { [axis]: () => travel() }, {
      [axis]: () => -travel(),
      ease: 'none',
      scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
  }
}

// Arrows and marks that turn as their section passes.
function turn(element) {
  const [from, to] = element.dataset.turn.split(',').map(Number);
  const host = element.closest('header, section, footer');
  const ending = host?.tagName === 'FOOTER';
  const atTop = host && host.getBoundingClientRect().top + scrollY < 1;
  gsap.fromTo(element, { rotation: from }, {
    rotation: to,
    ease: 'none',
    scrollTrigger: {
      trigger: host || element,
      start: atTop ? 'top top' : 'top bottom',
      end: ending ? 'bottom bottom' : 'bottom top',
      scrub: true,
    },
  });
}

function pageEnding(scope) {
  const ending = scope.querySelector('[data-page-end]');
  const curve = scope.querySelector('[data-curve]');
  if (!ending) return;
  const toggle = scope.querySelector('[data-menu-toggle]');
  const timeline = gsap.timeline({
    scrollTrigger: { trigger: ending, start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
  if (curve) timeline.fromTo(curve, { '--curve-h': innerWidth > 720 ? '10vh' : '7.5vh' }, { '--curve-h': '0vh', ease: 'none' }, 0);
  if (toggle) timeline.fromTo(toggle, { '--toggle-ring': 'rgb(255 255 255 / 0)' }, { '--toggle-ring': 'rgb(255 255 255 / 0.2)', ease: 'none' }, 0);
}

function aboutTint(scope) {
  const scopeSection = scope.querySelector('.about-scope');
  if (!scopeSection) return;
  gsap.fromTo(scope, { '--tint': '#ffffff' }, {
    '--tint': getComputedStyle(root).getPropertyValue('--mist').trim(),
    ease: 'none',
    scrollTrigger: { trigger: scopeSection, start: '-25% bottom', end: 'bottom bottom', scrub: true },
  });
}

function bloomTurn(scope) {
  const marks = scope.querySelectorAll('[data-turn-on-scroll]');
  if (!marks.length) return;
  gsap.to(marks, {
    rotation: 90,
    ease: 'none',
    scrollTrigger: { trigger: scope, start: 'bottom bottom', end: 'bottom top', scrub: true },
  });
}

export function mount(scope) {
  if (isReduced()) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 721px)', () => {
    scope.querySelectorAll('[data-turn]').forEach(turn);
    aboutTint(scope);
    bloomTurn(scope);
  });
  scope.querySelectorAll('[data-parallax]').forEach(parallax);
  pageEnding(scope);
  return () => mm.revert();
}
