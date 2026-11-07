// Shared environment: media queries, motion tokens, pointer state and preferences.
export const root = document.documentElement;
export const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
export const finePointerQuery = matchMedia('(hover: hover) and (pointer: fine)');

export const isReduced = () => reducedQuery.matches;
export const hasFinePointer = () => finePointerQuery.matches && innerWidth > 540;

export const ease = {
  out: 'expo.out',
  inOut: 'power4.inOut',
  in: 'power3.in',
  soft: 'power2.inOut',
  spring: 'elastic.out(1, 0.38)',
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// One pointer listener for the whole visit; modules read from this object.
export const pointer = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, seen: false };
let lastMove = performance.now();
addEventListener('pointermove', event => {
  const now = performance.now();
  const elapsed = Math.max(8, now - lastMove);
  pointer.vx = ((event.clientX - pointer.x) / elapsed) * 16;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.seen = true;
  lastMove = now;
}, { passive: true });

// The list/grid choice is a 14-day preference cookie, as stated in the privacy notice.
const VIEW_COOKIE = 'view';
export const viewPreference = {
  read() {
    const match = document.cookie.match(/(?:^|;\s*)view=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  },
  write(value) {
    document.cookie = `${VIEW_COOKIE}=${encodeURIComponent(value)}; max-age=1209600; path=/; SameSite=Lax`;
  },
};
