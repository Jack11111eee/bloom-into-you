// Missing pages: choose the visitor's language for the shared fallback, draw two
// slowly turning Möbius strips with travelling beads, and offer a history-aware way back.

(() => {
  const root = document.documentElement;
  if (!root.hasAttribute('data-not-found-fallback')) return;
  // The host serves one 404.html for every missing URL; localized copies wait in <template>s.
  const base = root.dataset.siteBase || '';
  const trail = location.pathname.startsWith(`${base}/`) ? location.pathname.slice(base.length) : location.pathname;
  let language = trail.match(/^\/(zh-cn|zh-tw|ja)(?:\/|$)/)?.[1];
  if (!language) {
    try {
      language = localStorage.getItem('bloom-language');
    } catch {
      language = null;
    }
  }
  const copy = language && document.querySelector(`template[data-not-found-locale="${language}"]`);
  if (!copy) return;
  const setContent = (selector, value) => document.querySelectorAll(selector).forEach(node => { node.content = value; });
  root.lang = copy.dataset.lang;
  root.dataset.locale = language;
  document.title = copy.dataset.title;
  setContent('meta[property="og:title"], meta[property="twitter:title"]', copy.dataset.title);
  setContent('meta[name="description"], meta[property="og:description"], meta[property="twitter:description"]', copy.dataset.description);
  setContent('meta[property="og:locale"]', copy.dataset.ogLocale);
  document.querySelectorAll('link[rel="canonical"]').forEach(link => {
    link.href = new URL(`${base}/${language}/404/`, location.origin).href;
  });
  const font = document.querySelector('link[rel="preload"][href*="wenkai-en.woff2"]');
  if (font) font.href = font.href.replace('wenkai-en.woff2', `wenkai-${language}.woff2`);
  document.body.replaceChildren(copy.content.cloneNode(true));
})();

(() => {
  const page = document.getElementById('not-found');
  if (!page) return;

  const FULL_TURN = Math.PI * 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // Rotation about x, then y, then z.
  const turn = ([x, y, z], [ax, ay, az]) => {
    const y1 = y * Math.cos(ax) - z * Math.sin(ax);
    const z1 = y * Math.sin(ax) + z * Math.cos(ax);
    const x2 = x * Math.cos(ay) + z1 * Math.sin(ay);
    const z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
    return [x2 * Math.cos(az) - y1 * Math.sin(az), x2 * Math.sin(az) + y1 * Math.cos(az), z2];
  };

  // The edge of a Möbius strip closes only after two trips round its centre.
  function stripEdge(radius, halfWidth, tilt) {
    return u => {
      const reach = radius + halfWidth * Math.cos(u / 2);
      return turn([reach * Math.cos(u), reach * Math.sin(u), halfWidth * Math.sin(u / 2)], tilt);
    };
  }

  // Resample a closed curve so equal steps of t cover equal distances.
  function evenly(curve, span, samples = 1000) {
    const points = Array.from({ length: samples + 1 }, (_, i) => curve((i / samples) * span));
    const distance = [0];
    for (let i = 1; i < points.length; i++) {
      distance.push(distance[i - 1] + Math.hypot(...points[i].map((value, axis) => value - points[i - 1][axis])));
    }
    const total = distance.at(-1);
    return t => {
      const goal = (((t % 1) + 1) % 1) * total;
      let low = 0;
      let high = distance.length - 1;
      while (high - low > 1) {
        const middle = (low + high) >> 1;
        if (distance[middle] < goal) low = middle;
        else high = middle;
      }
      const share = (goal - distance[low]) / (distance[high] - distance[low] || 1);
      return points[low].map((value, axis) => value + (points[high][axis] - value) * share);
    };
  }

  const strips = [
    { path: evenly(stripEdge(1.85, 0.23, [0.25, 0, 0.05]), FULL_TURN * 2), lap: 14, offset: 0, bead: 5.5, accent: true },
    { path: evenly(stripEdge(1.38, 0.17, [1.15, 0.45, 0.65]), FULL_TURN * 2), lap: 18, offset: 0.39, bead: 3.5, accent: false },
  ].map(strip => ({ ...strip, track: Array.from({ length: 641 }, (_, i) => strip.path(i / 640)) }));

  const BEADS = {
    true: ['#adb8ff', '#6276ef', '#3449c8'],
    false: ['#c4c9cc', '#828e95', '#4e606a'],
  };

  class Orbit {
    constructor(figure) {
      this.figure = figure;
      this.canvas = figure.querySelector('canvas');
      this.context = this.canvas.getContext('2d');
      this.button = figure.querySelector('.lost__motion');
      this.time = 0;
      this.paused = reduced.matches;
      this.stale = true;
      new ResizeObserver(() => { this.stale = true; }).observe(this.canvas);
      this.button.hidden = false;
      this.button.addEventListener('click', () => this.setPaused(!this.paused));
      this.syncButton();
    }

    setPaused(paused) {
      this.paused = paused;
      this.stale = true;
      this.syncButton();
    }

    syncButton() {
      this.button.setAttribute('aria-pressed', String(this.paused));
      this.button.querySelectorAll('[data-when]').forEach(label => {
        label.hidden = label.dataset.when !== (this.paused ? 'paused' : 'playing');
      });
    }

    draw() {
      const { canvas, context } = this;
      const { width, height } = canvas.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) Object.assign(canvas, { width: pixelWidth, height: pixelHeight });
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const zoom = Math.min(width / 4.9, (height - 38) / 3.7);
      const middle = [width / 2, (height - 22) / 2];
      const view = point => turn(point, [0.78, -0.3 + this.time * 0.008, -0.22]);
      const screen = ([x, y, z]) => {
        const depth = 7 / (7 - z);
        return [middle[0] + x * zoom * depth, middle[1] + y * zoom * depth];
      };

      // Painter's order: everything is collected with a depth and drawn back to front.
      const layers = [{ z: -0.14, paint: () => this.paintCode(width, middle) }];
      for (const strip of strips) {
        const seen = strip.track.map(view);
        for (let i = 1; i < seen.length; i++) {
          const from = seen[i - 1];
          const to = seen[i];
          layers.push({ z: (from[2] + to[2]) / 2, paint: z => this.paintSegment(screen(from), screen(to), z) });
        }
        const bead = view(strip.path((this.time * 0.25) / strip.lap + strip.offset));
        layers.push({ z: bead[2] + (strip.accent ? 0.08 : 0.05), paint: () => this.paintBead(screen(bead), bead[2], strip) });
      }
      layers.sort((a, b) => a.z - b.z).forEach(layer => layer.paint(layer.z));
      this.figure.classList.add('is-drawn');
      this.stale = false;
    }

    paintSegment(from, to, z) {
      const nearness = (z + 2) / 4;
      const { context } = this;
      context.beginPath();
      context.moveTo(...from);
      context.lineTo(...to);
      context.lineCap = 'round';
      context.lineWidth = 1.15 * (0.86 + nearness * 0.25);
      context.strokeStyle = `rgba(136, 153, 164, ${0.36 + nearness * 0.26})`;
      context.stroke();
    }

    paintBead([x, y], z, strip) {
      const radius = (strip.bead * 7) / (7 - z);
      const [light, body, shade] = BEADS[strip.accent];
      const fill = this.context.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.05, x, y, radius);
      fill.addColorStop(0, light);
      fill.addColorStop(0.45, body);
      fill.addColorStop(1, shade);
      this.context.beginPath();
      this.context.arc(x, y, radius, 0, FULL_TURN);
      this.context.fillStyle = fill;
      this.context.fill();
    }

    paintCode(width, [x, y]) {
      const { context } = this;
      const size = Math.min(100, (width - 24) * 0.29);
      context.font = `400 ${size}px ${getComputedStyle(this.canvas).fontFamily}`;
      context.fillStyle = '#1c1d20';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('404', x, y + 4);
    }
  }

  const orbits = [...page.querySelectorAll('[data-orbit]')].filter(figure => figure.querySelector('canvas')?.getContext('2d')).map(figure => new Orbit(figure));

  // Leave the page the way the visitor came when that page belongs to this site.
  page.querySelector('[data-not-found-back]')?.addEventListener('click', event => {
    const base = document.documentElement.dataset.siteBase || '';
    let previous = null;
    try {
      previous = new URL(document.referrer);
    } catch {
      return;
    }
    const sameSite = previous.origin === location.origin && previous.pathname.startsWith(`${base}/`);
    if (sameSite && previous.href !== location.href && history.length > 1) {
      event.preventDefault();
      history.back();
    }
  });

  // About thirty frames a second is plenty for this drift.
  let previousFrame = 0;
  function tick(now) {
    if (!page.isConnected) return;
    if (now - previousFrame >= 31) {
      const step = Math.min((now - previousFrame) / 1000, 0.1);
      for (const orbit of orbits) {
        if (document.hidden) continue;
        if (!orbit.paused) orbit.time += step;
        if (!orbit.paused || orbit.stale) orbit.draw();
      }
      previousFrame = now;
    }
    requestAnimationFrame(tick);
  }
  orbits.forEach(orbit => orbit.draw());
  requestAnimationFrame(tick);
  document.fonts.ready.then(() => orbits.forEach(orbit => { orbit.stale = true; }));
  reduced.addEventListener('change', event => {
    if (event.matches) orbits.forEach(orbit => orbit.setPaused(true));
  });
})();
