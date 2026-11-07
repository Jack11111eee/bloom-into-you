// Entrances: words rise from a mask, blocks fade up, media unclips, rules draw in.
import { root, isReduced } from '../core/env.js';

const CLOSING = /^[\p{Pe}\p{Pf}。，、！？：；,.!?;:]+$/u;

function units(text, lang) {
  if (!/^(zh|ja)/i.test(lang)) return text.match(/\s+|\S+/gu) || [];
  if (typeof Intl.Segmenter !== 'function') return [...text];
  return [...new Intl.Segmenter(lang, { granularity: 'word' }).segment(text)].map(part => part.segment);
}

// Wraps each word of the element's text nodes; links and markup inside stay intact.
export function splitWords(element) {
  if (element.dataset.split) return;
  element.dataset.split = '';
  const lang = element.closest('[lang]')?.lang || root.lang || 'en';
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.data.trim()) nodes.push(walker.currentNode);
  let count = 0;
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    let last = null;
    for (const unit of units(node.data, lang)) {
      if (!unit.trim()) {
        fragment.append(unit);
        last = null;
      } else if (last && CLOSING.test(unit)) {
        last.append(unit);
      } else {
        const word = document.createElement('span');
        const inner = document.createElement('span');
        word.className = 'word';
        inner.className = 'word__inner';
        inner.style.setProperty('--w', count++);
        inner.textContent = unit;
        word.append(inner);
        fragment.append(word);
        last = inner;
      }
    }
    node.replaceWith(fragment);
  }
}

export function mount(scope, { signal }) {
  const targets = [...scope.querySelectorAll('[data-reveal]')];
  if (!targets.length) return;
  targets.filter(target => target.dataset.reveal === 'words').forEach(splitWords);
  if (isReduced()) {
    targets.forEach(target => target.classList.add('is-in'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  targets.forEach(target => observer.observe(target));
  signal.addEventListener('abort', () => observer.disconnect());
}
