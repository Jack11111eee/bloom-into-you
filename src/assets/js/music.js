// The silent record collection: no audio, no requests, nothing stored beyond this visit.
// Picking a song turns the deck and opens its story; the page runtime calls init/destroy.
(() => {
  // Reading positions survive page changes within one visit only.
  const bookmarks = new Map();
  let teardown = () => {};

  function mountRecord(record, { align, update }) {
    const find = hook => record.querySelector(`[data-record-${hook}]`);
    const board = find('board');
    const list = find('list');
    const reader = find('reader');
    const pages = find('pages');
    const now = find('now');
    const motion = find('motion');
    const status = find('status');
    const hint = find('hint');
    const returnButton = find('return');
    const songs = [...record.querySelectorAll('[data-song]')];
    const phrase = Object.fromEntries([...record.querySelectorAll('[data-phrase]')].map(node => [node.dataset.phrase, node.textContent]));
    const stillness = matchMedia('(prefers-reduced-motion: reduce)');
    const events = new AbortController();
    const on = (target, type, listener, options = {}) => target.addEventListener(type, listener, { ...options, signal: events.signal });

    const state = { song: null, last: null, held: false, visible: false };
    let pending = 0;
    const bookmarkKey = id => `${document.documentElement.lang}:${id}`;

    // The disc turns only while a song is chosen, playing, on screen and motion is allowed.
    function refresh() {
      const turning = Boolean(state.song) && !state.held && state.visible && !document.hidden && !stillness.matches;
      record.classList.toggle('is-turning', turning);
      motion.disabled = stillness.matches;
      motion.textContent = phrase[stillness.matches ? 'reduced' : state.held ? 'resume' : 'pause'];
      motion.setAttribute('aria-pressed', String(state.held || stillness.matches));
    }

    function remember() {
      const room = pages.scrollHeight - pages.clientHeight;
      hint.textContent = room <= 2 || pages.scrollTop >= room - 3 ? phrase.end : phrase.down;
      if (state.song) bookmarks.set(bookmarkKey(state.song), pages.scrollTop);
    }

    // Keep the deck, the reading pane and its footer inside one screen.
    function fit() {
      const narrow = matchMedia('(max-width: 700px)').matches;
      const screenHeight = window.visualViewport?.height || innerHeight;
      const foot = reader.querySelector('.record__reader-foot').offsetHeight;
      const reserved = state.song
        ? pages.getBoundingClientRect().top - board.getBoundingClientRect().top + foot + 72
        : narrow ? 265 : 190;
      const height = Math.max(150, Math.min(narrow ? 470 : 540, screenHeight - reserved));
      record.style.setProperty('--record-pages', `${height}px`);
      update();
      remember();
    }

    function choose(song) {
      state.song = state.last = song.dataset.song;
      state.held = false;
      const title = song.querySelector('.record__song-name');
      for (const heading of [find('name'), reader.querySelector('.record__reader-title')]) {
        heading.textContent = title.textContent;
        heading.lang = title.lang;
      }
      find('info').textContent = song.querySelector('.record__song-meta').textContent;
      find('position').textContent = `${String(songs.indexOf(song) + 1).padStart(2, '0')} / 04`;
      find('label').src = song.querySelector('img').src;
      songs.forEach(other => other.setAttribute('aria-expanded', String(other === song)));
      record.querySelectorAll('[data-story]').forEach(story => { story.hidden = story.dataset.story !== state.song; });
      record.querySelector('.record__poster').setAttribute('aria-hidden', 'true');
      record.querySelector('.record__player').setAttribute('aria-hidden', 'false');
      list.hidden = true;
      reader.hidden = false;
      now.hidden = false;
      record.classList.add('is-chosen');
      fit();
      pages.scrollTop = bookmarks.get(bookmarkKey(state.song)) || 0;
      remember();
      refresh();
      status.textContent = phrase.silent;
      if (!stillness.matches) {
        const frames = [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }];
        reader.animate(frames, { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
      returnButton.focus({ preventScroll: true });
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => record.isConnected && align(board));
    }

    function putBack() {
      if (state.song) bookmarks.set(bookmarkKey(state.song), pages.scrollTop);
      state.song = null;
      state.held = true;
      record.classList.remove('is-chosen', 'is-turning');
      reader.hidden = true;
      now.hidden = true;
      list.hidden = false;
      record.querySelector('.record__poster').removeAttribute('aria-hidden');
      record.querySelector('.record__player').setAttribute('aria-hidden', 'true');
      songs.forEach(song => song.setAttribute('aria-expanded', 'false'));
      status.textContent = phrase.choose;
      songs.find(song => song.dataset.song === state.last)?.focus({ preventScroll: true });
      update();
    }

    songs.forEach(song => on(song, 'click', () => choose(song)));
    on(returnButton, 'click', putBack);
    on(motion, 'click', () => {
      state.held = !state.held;
      refresh();
    });
    on(pages, 'scroll', remember, { passive: true });
    on(pages, 'keydown', event => {
      if (event.key === 'Escape') putBack();
    });
    // Focusing the pane can scroll it into the middle of a phone screen; bring the deck back.
    on(pages, 'focus', () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => record.isConnected && state.song && align(board));
    });
    on(document, 'visibilitychange', refresh);
    on(stillness, 'change', refresh);
    on(window, 'resize', fit);
    if (window.visualViewport) on(window.visualViewport, 'resize', fit);

    const watcher = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      refresh();
    });
    watcher.observe(find('deck'));
    document.fonts.ready.then(() => events.signal.aborted || fit());
    fit();
    refresh();

    return () => {
      events.abort();
      watcher.disconnect();
      cancelAnimationFrame(pending);
      record.classList.remove('is-turning');
    };
  }

  window.BloomMusic = {
    destroy() {
      teardown();
      teardown = () => {};
    },
    init({ container, align, update }) {
      this.destroy();
      const record = container?.querySelector('#bloom-vinyl-reader [data-record]');
      if (record) teardown = mountRecord(record, { align, update });
    },
  };
})();
