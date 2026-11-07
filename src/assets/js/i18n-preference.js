// Language memory. An explicit language route always wins; only the bare English
// entry point sends a returning visitor to the language they chose last time.
(() => {
  const STORE = 'bloom-language';
  const OTHER_LANGUAGES = new Set(['zh-cn', 'zh-tw', 'ja']);
  const root = document.documentElement;
  const siteBase = root.dataset.siteBase || '';

  const remembered = () => {
    try {
      return localStorage.getItem(STORE);
    } catch {
      return null; // Storage can be blocked; every route still works directly.
    }
  };

  const choice = remembered();
  if (location.pathname === `${siteBase}/` && OTHER_LANGUAGES.has(choice)) {
    root.style.visibility = 'hidden';
    location.replace(`${siteBase}/${choice}/${location.search}${location.hash}`);
  }

  const openMenus = () => document.querySelectorAll('details.language-switch[open]');
  const closeMenus = keep => openMenus().forEach(menu => {
    if (menu !== keep) menu.open = false;
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenus(null);
  });

  document.addEventListener('click', event => {
    closeMenus(event.target.closest('details.language-switch'));
    const option = event.target.closest('a[data-language]');
    const modified = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!option || modified) return;
    try {
      localStorage.setItem(STORE, option.dataset.language);
    } catch {
      // Without storage the choice simply is not remembered.
    }
  });
})();
