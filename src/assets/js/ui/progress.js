// A hairline that fills while reading an entry or the About essay.
export function mount(scope) {
  const article = scope.dataset.barbaNamespace === 'single'
    ? scope.querySelector('.page__content')
    : scope.querySelector('.about-essay');
  if (!article) return;
  const line = document.createElement('div');
  line.className = 'reading-progress';
  line.setAttribute('aria-hidden', 'true');
  scope.append(line);
  ScrollTrigger.create({
    trigger: article,
    start: 'top top',
    end: () => {
      const ending = scope.querySelector('[data-page-end]');
      return ending ? `+=${Math.max(1, ending.offsetTop - article.offsetTop - innerHeight)}` : 'bottom bottom';
    },
    invalidateOnRefresh: true,
    onUpdate: self => { line.style.scale = `${self.progress} 1`; },
  });
  return () => line.remove();
}
