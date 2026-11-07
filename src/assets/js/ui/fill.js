// Fills that rise into a control on hover and continue upwards when the pointer leaves.
import { hasFinePointer } from '../core/env.js';

export function mount(scope, { signal }) {
  if (!hasFinePointer()) return;
  for (const zone of scope.querySelectorAll('[data-fill]')) {
    const control = zone.querySelector('[data-fill-host]') || zone;
    const fill = control.querySelector(':scope > [class$="__fill"]');
    if (!fill) continue;
    zone.addEventListener('pointerenter', () => {
      control.classList.remove('is-unfilling', 'is-fill-reset');
      control.classList.add('is-filled');
    }, { signal });
    zone.addEventListener('pointerleave', () => {
      if (!control.classList.contains('is-filled')) return;
      control.classList.add('is-unfilling');
    }, { signal });
    fill.addEventListener('transitionend', event => {
      if (event.propertyName !== 'translate' || !control.classList.contains('is-unfilling')) return;
      control.classList.add('is-fill-reset');
      control.classList.remove('is-filled', 'is-unfilling');
      void fill.offsetWidth;
      control.classList.remove('is-fill-reset');
    }, { signal });
  }
}
