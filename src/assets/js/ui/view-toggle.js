// Index pages switch between the table and the cards; the choice lasts 14 days.
import { viewPreference, isReduced } from '../core/env.js';

export function mount(scope, { signal, scroll }) {
  const host = scope.querySelector('[data-view-root]');
  if (!host) return;
  const buttons = [...host.querySelectorAll('button[data-view]')];

  const apply = view => {
    host.dataset.view = view;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  };
  apply(viewPreference.read() === 'columns' || viewPreference.read() === 'grid' ? 'grid' : 'list');

  function change(view) {
    if (host.dataset.view === view) return;
    viewPreference.write(view === 'grid' ? 'columns' : 'rows');
    const panes = host.querySelector('.index-view__panes');
    const swap = () => {
      apply(view);
      scroll.resize();
    };
    const top = host.getBoundingClientRect().top;
    if (top < 0) scroll.to(host, { offset: -120, duration: 0.7 });
    if (isReduced()) return swap();
    if (document.startViewTransition) return document.startViewTransition(swap);
    gsap.timeline()
      .to(panes, { opacity: 0, y: 24, duration: 0.25, ease: 'power2.in' })
      .add(swap)
      .fromTo(panes, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
  }

  buttons.forEach(button => button.addEventListener('click', () => change(button.dataset.view), { signal }));
}
