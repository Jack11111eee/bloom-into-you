/* Owner-requested silent record collection. No audio, remote requests or persistent storage. */
(() => {
  let cleanup = () => {};
  const positions = new Map(); // Reading position lasts only for this page visit.
  window.BloomMusic = {
    destroy() { cleanup(); cleanup = () => {}; },
    init({ container, align, update }) {
      this.destroy();
      const root = container?.id === 'music' ? container.querySelector('#bloom-vinyl-reader') : null;
      if (!root) return;
      const q = selector => root.querySelector(selector);
      const page = q('.vr-page'), board = q('.vr-board'), list = q('.vr-song-list');
      const reader = q('.vr-reader'), body = q('.vr-reader-body'), back = q('.vr-return');
      const current = q('.vr-current'), status = q('.vr-reader-status'), motion = q('.vr-motion');
      const buttons = [...root.querySelectorAll('.vr-song')];
      const labels = Object.fromEntries([...root.querySelectorAll('[data-label]')].map(el => [el.dataset.label, el.textContent]));
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      const events = new AbortController(), signal = events.signal;
      let selected = null, lastSelected = null, paused = false, inView = false, frame = 0;
      const memoryKey = id => document.documentElement.lang + ':' + id;
      function sync() {
        page.classList.toggle('vr-spinning', !!selected && !paused && inView && !document.hidden && !reduced.matches);
        motion.textContent = labels[reduced.matches ? 'reduced' : paused ? 'resume' : 'pause'];
        motion.disabled = reduced.matches;
        motion.setAttribute('aria-pressed', String(paused || reduced.matches));
      }
      function progress() {
        const max = body.scrollHeight - body.clientHeight;
        q('.vr-reader-progress').textContent = max <= 2 || body.scrollTop >= max - 3 ? labels.end : labels.down;
        if (selected) positions.set(memoryKey(selected), body.scrollTop);
      }
      function layout() {
        // Reserve space for the turntable, reader controls and browser chrome.
        const mobile = matchMedia('(max-width: 700px)').matches;
        const viewport = window.visualViewport?.height || window.innerHeight;
        const overhead = selected ? body.getBoundingClientRect().top - board.getBoundingClientRect().top + q('.vr-reader-bottom').offsetHeight + 72 : mobile ? 265 : 190;
        page.style.setProperty('--vr-body-height', Math.max(150, Math.min(mobile ? 470 : 540, viewport - overhead)) + 'px');
        update(); progress();
      }
      function open(button) {
        selected = lastSelected = button.dataset.song;
        paused = false;
        const title = button.querySelector('.vr-song-name');
        for (const el of [q('[data-current-name]'), q('#vr-reading-title')]) {
          el.textContent = title.textContent; el.lang = title.lang;
        }
        q('[data-current-info]').textContent = button.querySelector('.vr-song-meta').textContent;
        q('.vr-reader-index').textContent = String(buttons.indexOf(button) + 1).padStart(2, '0') + ' / 04';
        q('.vr-platter .vr-label').src = button.querySelector('img').src;
        buttons.forEach(el => el.setAttribute('aria-expanded', String(el === button)));
        root.querySelectorAll('[data-story]').forEach(el => { el.hidden = el.dataset.story !== selected; });
        q('.vr-idle-art').setAttribute('aria-hidden', 'true');
        q('.vr-hardware').setAttribute('aria-hidden', 'false');
        list.hidden = true; reader.hidden = false; current.hidden = false;
        page.classList.add('vr-selected');
        const previousPosition = positions.get(memoryKey(selected)) || 0;
        layout();
        body.scrollTop = previousPosition;
        progress(); sync();
        status.textContent = labels.silent;
        if (!reduced.matches) reader.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
        back.focus({ preventScroll: true });
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => { if (root.isConnected) align(board); });
      }
      function close() {
        if (selected) positions.set(memoryKey(selected), body.scrollTop);
        selected = null; paused = true;
        page.classList.remove('vr-selected', 'vr-spinning');
        reader.hidden = true; current.hidden = true; list.hidden = false;
        q('.vr-idle-art').removeAttribute('aria-hidden');
        q('.vr-hardware').setAttribute('aria-hidden', 'true');
        buttons.forEach(el => el.setAttribute('aria-expanded', 'false'));
        status.textContent = labels.choose;
        buttons.find(el => el.dataset.song === lastSelected)?.focus({ preventScroll: true });
        update();
      }
      buttons.forEach(button => button.addEventListener('click', () => open(button), { signal }));
      back.addEventListener('click', close, { signal });
      motion.addEventListener('click', () => { paused = !paused; sync(); }, { signal });
      body.addEventListener('scroll', progress, { passive: true, signal });
      body.addEventListener('focus', () => {
        // Native focus may centre the scroll region and push the mobile deck away.
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => { if (root.isConnected && selected) align(board); });
      }, { signal });
      // Locomotive's virtual scroll listens above this native scrolling region.
      // Keep its wheel/key input here so reading never moves the turntable.
      body.addEventListener('wheel', event => event.stopPropagation(), { passive: true, signal });
      body.addEventListener('touchmove', event => event.stopPropagation(), { passive: true, signal });
      body.addEventListener('keydown', event => {
        if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) event.stopPropagation();
        if (event.key === 'Escape') close();
      }, { signal });
      document.addEventListener('visibilitychange', sync, { signal });
      reduced.addEventListener('change', sync, { signal });
      window.addEventListener('resize', layout, { signal });
      window.visualViewport?.addEventListener('resize', layout, { signal });
      const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); });
      observer.observe(q('.vr-deck'));
      document.fonts.ready.then(() => { if (!signal.aborted) layout(); });
      layout(); sync();
      cleanup = () => { events.abort(); observer.disconnect(); cancelAnimationFrame(frame); page.classList.remove('vr-spinning'); };
    },
  };
})();
