// Contact: the form only prepares an email; the reader's own mail app sends it.
export function mount(scope, { signal }) {
  const form = scope.querySelector('form[data-mail-draft]');
  if (!form) return;
  const site = scope.querySelector('[data-brand] .site-header__name')?.textContent.trim();

  form.addEventListener('submit', event => {
    event.preventDefault();
    // Each answer goes under its own question, in the language the page is read in.
    const answers = [...form.querySelectorAll('.form__row')].map(row => {
      const question = row.querySelector('label').textContent.trim();
      return `${question}\n${row.querySelector('.field').value.trim()}`;
    });
    const subject = [site, form.elements.topic.value.trim()].filter(Boolean).join(' · ');
    const address = form.getAttribute('action');
    location.href = `${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(answers.join('\n\n'))}`;
  }, { signal });
}
