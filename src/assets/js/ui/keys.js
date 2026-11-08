// Arrow keys step through the entries: right for the next one, left for the one before.
import { root } from '../core/env.js';

const typing = 'input, textarea, select, [contenteditable]';

export function mount(scope, { signal }) {
  const next = scope.querySelector('[data-key-next]');
  const previous = scope.querySelector('[data-key-prev]');
  if (!next && !previous) return;

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest?.(typing)) return;
    if (root.classList.contains('has-menu-open') || root.classList.contains('is-transitioning')) return;
    const link = { ArrowRight: next, ArrowLeft: previous }[event.key];
    if (!link) return;
    event.preventDefault();
    link.click();
  }, { signal });
}
