// Navigation panel: opened from the floating button or the small-screen header link.
import { root } from '../core/env.js';

export function closeMenuNow() {
  root.classList.remove('has-menu-open');
  document.querySelectorAll('[data-menu-panel]').forEach(panel => { panel.inert = true; });
}

export function mount(scope, { signal, scroll }) {
  const panel = scope.querySelector('[data-menu-panel]');
  if (!panel) return;
  const toggles = [...scope.querySelectorAll('[data-menu-toggle], [data-menu-open]')];
  const floating = scope.querySelector('[data-menu-toggle]');
  const scrim = scope.querySelector('[data-menu-scrim]');
  let opener = null;

  const isOpen = () => root.classList.contains('has-menu-open');

  function render(open) {
    root.classList.toggle('has-menu-open', open);
    panel.inert = !open;
    toggles.forEach(toggle => toggle.setAttribute('aria-expanded', String(open)));
    floating?.querySelectorAll('[data-when]').forEach(text => {
      text.hidden = text.dataset.when !== (open ? 'open' : 'closed');
    });
  }

  function open(from) {
    opener = from;
    render(true);
    scroll.stop();
    setTimeout(() => panel.querySelector('a')?.focus({ preventScroll: true }), 60);
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen()) return;
    render(false);
    scroll.start();
    if (restoreFocus) (opener?.isConnected ? opener : floating)?.focus({ preventScroll: true });
  }

  toggles.forEach(toggle => toggle.addEventListener('click', () => (isOpen() ? close() : open(toggle)), { signal }));
  scrim?.addEventListener('click', () => close(), { signal });
  panel.addEventListener('click', event => {
    if (event.target.closest('a[aria-current="page"]')) {
      event.preventDefault();
      close();
    }
  }, { signal });

  document.addEventListener('keydown', event => {
    if (!isOpen()) return;
    if (event.key === 'Escape') close();
    if (event.key !== 'Tab') return;
    const stops = [floating, ...panel.querySelectorAll('a, summary, button')].filter(Boolean);
    const index = stops.indexOf(document.activeElement);
    const next = event.shiftKey ? index - 1 : index + 1;
    if (index === -1 || next < 0 || next >= stops.length) {
      event.preventDefault();
      stops.at(event.shiftKey ? -1 : 0).focus();
    }
  }, { signal });

  return () => closeMenuNow();
}
