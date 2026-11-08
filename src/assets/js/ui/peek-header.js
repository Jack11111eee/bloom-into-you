// Wide screens: the header comes back as a slim bar whenever the reader scrolls up.
import { root } from '../core/env.js';

const wide = matchMedia('(min-width: 1025px)');
const NUDGE = 6;

export function mount(scope, { scroll }) {
  const header = scope.querySelector('.site-header');
  if (!header) return;
  const language = header.querySelector('.language-switch');
  let last = scroll.y;
  let travel = 0;

  function show(peeking, shown) {
    if (peeking && !header.classList.contains('is-peeking')) {
      header.classList.add('is-peeking');
      void header.offsetHeight; // Settle hidden first so it slides rather than flashes.
      header.classList.add('is-animated');
    }
    if (!peeking) header.classList.remove('is-peeking', 'is-animated');
    header.classList.toggle('is-shown', shown);
    root.classList.toggle('has-header-peek', shown);
    if (!shown && language?.open) language.open = false;
  }

  const stop = scroll.onScroll(y => {
    const delta = y - last;
    last = y;
    if (!wide.matches || y <= header.offsetHeight) return show(false, false);
    travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
    if (travel < -NUDGE) show(true, true);
    else if (travel > NUDGE) show(true, false);
    else show(true, header.classList.contains('is-shown'));
  });

  return () => {
    stop();
    root.classList.remove('has-header-peek');
  };
}
