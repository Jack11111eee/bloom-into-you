// Runs before first paint: enables motion-dependent styles and the first-load curtain.
(function () {
  var root = document.documentElement;
  root.classList.add('has-js', 'is-booting');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('reduce-motion');
}());
