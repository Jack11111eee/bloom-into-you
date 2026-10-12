/* H1: Explicit routes win; only the English entry point restores a saved choice. */
(function () {
  const codes = ['en', 'zh-cn', 'zh-tw', 'ja'];
  const key = 'bloom-language';
  const base = document.documentElement.dataset.siteBase || '';
  try {
    const saved = localStorage.getItem(key);
    if (location.pathname === base + '/' && codes.includes(saved) && saved !== 'en') {
      document.documentElement.style.visibility = 'hidden';
      location.replace(base + '/' + saved + '/' + location.search + location.hash);
    }
  } catch (_) { /* Private/storage-restricted browsing still supports all explicit routes. */ }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') document.querySelectorAll('.language-switch[open]').forEach(menu => menu.removeAttribute('open'));
  });
  document.addEventListener('click', function (event) {
    document.querySelectorAll('.language-switch[open]').forEach(menu => { if (!menu.contains(event.target)) menu.removeAttribute('open'); });
    const link = event.target.closest('a[data-language]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    try { localStorage.setItem(key, link.dataset.language); } catch (_) {}
  });
}());
