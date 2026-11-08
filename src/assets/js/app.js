// Entry point: smooth scrolling, the page curtain and per-page interaction modules.
import { root, isReduced } from './core/env.js';
import { createScroll } from './core/scroll.js';
import { createCurtain } from './ui/curtain.js';
import * as fill from './ui/fill.js';
import * as magnet from './ui/magnet.js';
import * as menu from './ui/menu.js';
import * as cursor from './ui/cursor.js';
import * as marquee from './ui/marquee.js';
import * as tanzaku from './ui/tanzaku.js';
import * as reveal from './ui/reveal.js';
import * as motion from './ui/motion.js';
import * as viewToggle from './ui/view-toggle.js';
import * as progress from './ui/progress.js';
import * as keys from './ui/keys.js';
import * as peekHeader from './ui/peek-header.js';

gsap.registerPlugin(ScrollTrigger);
history.scrollRestoration = 'manual';

const scroll = createScroll();
const curtain = createCurtain(scroll);
const announcer = document.querySelector('[data-route-announcer]');
const modules = [fill, magnet, menu, cursor, marquee, tanzaku, reveal, motion, viewToggle, progress, keys, peekHeader];
let unmount = () => {};

// Mount every module inside one GSAP context so leaving a page reverts it completely.
function mountPage(container) {
  const controller = new AbortController();
  const cleanups = [];
  const context = gsap.context(() => {
    for (const module of modules) {
      const cleanup = module.mount(container, { scroll, signal: controller.signal });
      if (cleanup) cleanups.push(cleanup);
    }
  }, container);
  window.BloomMusic?.init({
    container,
    align: element => scroll.to(element, { offset: -24, duration: isReduced() ? 0 : 0.65 }),
    update: () => scroll.resize(),
  });
  requestAnimationFrame(() => scroll.resize());
  return () => {
    window.BloomMusic?.destroy();
    controller.abort();
    cleanups.reverse().forEach(cleanup => cleanup());
    context.revert();
  };
}

// The menu button appears once the page has moved past the first screen.
scroll.onScroll(y => root.classList.toggle('has-scrolled', y > innerHeight * 0.3));

// Fonts can change line lengths after layout; measure again once they settle.
const refreshAfterFonts = () => requestAnimationFrame(() => scroll.resize());
document.fonts.ready.then(refreshAfterFonts);
document.fonts.addEventListener('loadingdone', refreshAfterFonts);

const parse = html => new DOMParser().parseFromString(html, 'text/html');

function labelFor(url) {
  const request = barba.cache.getRequest?.(url);
  if (!request) return Promise.resolve('');
  return Promise.resolve(request).then(({ html }) => parse(html).querySelector('[data-curtain-label]')?.textContent || '');
}

// Barba swaps only the container; keep language, title and metadata in step with it.
function syncHead(html) {
  const next = parse(html);
  root.lang = next.documentElement.lang;
  root.dataset.locale = next.documentElement.dataset.locale;
  root.dataset.path = next.documentElement.dataset.path;
  document.title = next.title;
  const shared = 'meta[name="description"], meta[property^="og:"], meta[property^="twitter:"], link[rel="canonical"], link[rel="alternate"]';
  document.head.querySelectorAll(shared).forEach(node => node.remove());
  next.head.querySelectorAll(shared).forEach(node => document.head.append(node.cloneNode(true)));
  const label = next.querySelector('[data-curtain-label]')?.textContent;
  if (label) document.querySelector('[data-curtain-label]').textContent = label;
}

function arrive(container) {
  const heading = container.querySelector('h1');
  announcer.textContent = document.title;
  (heading || container).setAttribute('tabindex', '-1');
  (heading || container).focus({ preventScroll: true });
}

barba.hooks.before(() => menu.closeMenuNow());

// Back and forward return to where the reader left each page.
const positions = new Map();
const fromHistory = trigger => ['back', 'forward', 'popstate'].includes(trigger);

barba.init({
  timeout: 7000,
  preventRunning: true,
  transitions: [{
    name: 'curtain',
    once({ next }) {
      unmount = mountPage(next.container);
      return curtain.boot(next.container, next.namespace === 'home');
    },
    async leave({ current, next }) {
      positions.set(current.url.href, scroll.y);
      await curtain.cover(labelFor(next.url.href));
      unmount();
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      current.container.remove();
    },
    enter({ next, trigger }) {
      syncHead(next.html);
      scroll.reset();
      unmount = mountPage(next.container);
      const saved = fromHistory(trigger) ? positions.get(next.url.href) : 0;
      if (saved) {
        scroll.resize();
        scroll.to(saved, { immediate: true });
      }
      arrive(next.container);
      return curtain.reveal(next.container);
    },
  }],
});
