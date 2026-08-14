/* Nexora — reading preferences (font size, region, language).
   Fixed from the original upload: a missing closing brace made
   this file a syntax error, so none of it ever actually ran. */
(() => {
  const settings = JSON.parse(localStorage.getItem('nexoraSettings') || '{}');
  const size = document.querySelector('[data-font-size]');
  const setSize = value => {
    document.documentElement.style.fontSize = value === 'small' ? '14px' : value === 'large' ? '18px' : '16px';
  };
  if (size) {
    size.value = settings.fontSize || 'standard';
    setSize(size.value);
    size.addEventListener('change', () => {
      settings.fontSize = size.value;
      localStorage.setItem('nexoraSettings', JSON.stringify(settings));
      setSize(size.value);
    });
  }
  document.querySelectorAll('[data-preference]').forEach(select => {
    const key = select.dataset.preference;
    select.value = settings[key] || select.value;
    select.addEventListener('change', () => {
      settings[key] = select.value;
      localStorage.setItem('nexoraSettings', JSON.stringify(settings));
    });
  });
})();
