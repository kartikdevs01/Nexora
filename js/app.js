/* Nexora — shared UI: theming, search, drawer, and the card
   renderers reused by both the mock-data fallback below and
   the live RSS pipeline in live-rss.js. */
(() => {
  const one = s => document.querySelector(s);
  const all = s => [...document.querySelectorAll(s)];
  const html = document.documentElement;
  const stories = window.NexoraData?.stories || [];

  /* ---------------- shared card renderers ---------------- */
  const esc = s => String(s ?? '').replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));

  const storyCard = s => `<article class="story-card tone-${esc(s.tone || 'gold')}" tabindex="0" data-reveal>
    <a class="card-link" href="${esc(s.href)}" aria-label="Read ${esc(s.title)}"></a>
    <div class="card-art">${s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span>${esc(s.category)}</span><i></i></div>
    <div class="card-copy">
      <div class="story-meta"><span>${esc(s.topic)}</span><span>${esc(s.read)}</span></div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.summary)}</p>
      <div class="card-bottom"><span>${esc(s.source || 'Nexora Source')} · ${esc(s.time)}</span>
        <div><button class="action bookmark" aria-label="Bookmark">♡</button><button class="action share" aria-label="Share">↗</button></div>
      </div>
    </div>
  </article>`;

  const featuredCard = list => {
    const s = list[0];
    if (!s) return '';
    return `<div class="featured-card" data-reveal>
      <div class="featured-media">${s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>
      <div class="featured-copy">
        <div class="featured-meta"><span>${esc(s.category)}</span><span>${esc(s.source || 'Nexora Source')}</span><span>${esc(s.time)}</span></div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.summary)}</p>
        <a class="button" href="${esc(s.href)}">Read the full story <span>→</span></a>
      </div>
    </div>`;
  };

  const ledgerRows = list => list.map((s, i) => `<div class="ledger-row" data-reveal style="transition-delay:${Math.min(i, 6) * 70}ms">
    <span class="row-index">${String(i + 1).padStart(2, '0')}</span>
    <div class="row-copy">
      <h3>${esc(s.title)}</h3>
      <div class="row-meta"><span>${esc(s.source || 'Nexora Source')}</span><span>${esc(s.time)}</span></div>
    </div>
    <div class="row-thumb">${s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'">` : ''}</div>
    <a class="row-link" href="${esc(s.href)}" aria-label="Read ${esc(s.title)}"></a>
  </div>`).join('');

  const feedRows = list => list.map((s, i) => `<div class="feed-row" data-reveal style="transition-delay:${Math.min(i, 7) * 55}ms">
    <time>${esc(s.time)}</time>
    <span class="feed-title">${esc(s.title)}</span>
    <span class="feed-source">${esc(s.source || 'Nexora Source')}</span>
    <a class="row-link" href="${esc(s.href)}" aria-label="Read ${esc(s.title)}"></a>
  </div>`).join('');

  const sectionRenderers = { Featured: featuredCard, Business: ledgerRows, LiveFeed: feedRows };

  const renderInto = (container, list) => {
    if (!container || !list || !list.length) return;
    const fn = sectionRenderers[container.dataset.section];
    container.innerHTML = fn ? fn(list) : list.map(storyCard).join('');
    window.NexoraScroll?.observeReveals(container);
  };

  window.NexoraCards = { esc, storyCard, renderInto };

  /* ---------------- fallback render from mock data.js ---------------- */
  const inCategory = (s, name) => name === 'Technology' ? ['Technology', 'AI'].includes(s.category) : s.category === name;
  const withHref = s => ({ ...s, href: `story.html?id=${encodeURIComponent(s.id)}` });

  const featuredSeed = withHref(stories.find(s => s.id === 'world-ai') || stories[0]);
  const latestSeed = ['India', 'World', 'Technology', 'Business']
    .flatMap(cat => stories.filter(s => inCategory(s, cat)).slice(0, 2))
    .filter(s => s.id !== featuredSeed.id)
    .map(withHref);
  const cultureSeed = stories.filter(s => ['Sports', 'Entertainment'].includes(s.category)).map(withHref);

  all('[data-section]').forEach(el => {
    const name = el.dataset.section;
    if (name === 'Featured') return renderInto(el, [featuredSeed]);
    if (name === 'Latest' || name === 'LiveFeed') return renderInto(el, name === 'Latest' ? latestSeed : latestSeed.slice(0, 6));
    if (name === 'Culture') return renderInto(el, cultureSeed);
    renderInto(el, stories.filter(s => inCategory(s, name)).slice(0, 4).map(withHref));
  });

  /* ---------------- theme ---------------- */
  // Five palettes on the same variable contract (see css/styles.css).
  // Ivory Coral is the default; Obsidian is the old dark theme, now optional.
  const THEMES = [
    { id: 'ivory-coral', name: 'Ivory Coral' },
    { id: 'ocean-teal', name: 'Ocean Teal' },
    { id: 'lavender-sky', name: 'Lavender Sky' },
    { id: 'sage-gold', name: 'Sage Gold' },
    { id: 'obsidian', name: 'Obsidian' },
  ];
  const THEME_IDS = THEMES.map(t => t.id);
  const themeName = id => THEMES.find(t => t.id === id)?.name || id;

  const saved = JSON.parse(localStorage.getItem('nexoraSettings') || '{}');
  // migrate old binary theme values from before the multi-theme system
  if (saved.theme === 'light') saved.theme = 'ivory-coral';
  if (saved.theme === 'dark') saved.theme = 'obsidian';

  const applyTheme = theme => {
    if (!THEME_IDS.includes(theme)) theme = 'ivory-coral';
    html.dataset.theme = theme;
    all('.theme-toggle').forEach(b => {
      b.textContent = themeName(theme);
      b.setAttribute('aria-pressed', String(theme !== 'ivory-coral'));
      b.setAttribute('aria-label', `Current theme ${themeName(theme)}. Click to switch to the next theme.`);
    });
    all('.theme-swatch').forEach(s => s.classList.toggle('active', s.dataset.theme === theme));
  };
  applyTheme(saved.theme || html.dataset.theme || 'ivory-coral');

  const setTheme = theme => {
    saved.theme = theme;
    localStorage.setItem('nexoraSettings', JSON.stringify(saved));
    applyTheme(theme);
  };
  all('.theme-toggle').forEach(button => button.addEventListener('click', () => {
    const next = THEME_IDS[(THEME_IDS.indexOf(html.dataset.theme) + 1) % THEME_IDS.length];
    setTheme(next);
  }));
  document.addEventListener('click', e => {
    const swatch = e.target.closest('.theme-swatch');
    if (swatch) setTheme(swatch.dataset.theme);
  });

  /* ---------------- search ---------------- */
  const overlay = one('.search-overlay'), trigger = one('.search-trigger'), close = one('.close-search'),
        input = one('#trend-search'), results = one('#search-results');
  let previous;
  const shut = () => { if (!overlay) return; overlay.hidden = true; document.body.classList.remove('modal-open'); (previous || trigger)?.focus(); };
  if (overlay) {
    trigger?.addEventListener('click', () => { previous = document.activeElement; overlay.hidden = false; document.body.classList.add('modal-open'); input?.focus(); });
    close?.addEventListener('click', shut);
    overlay.addEventListener('click', e => { if (e.target === overlay) shut(); });
    input?.addEventListener('input', () => {
      const term = input.value.toLowerCase().trim();
      const found = stories.filter(s => `${s.title} ${s.category} ${s.topic}`.toLowerCase().includes(term));
      results.innerHTML = !term ? 'Start typing to search Nexora.' : found.length
        ? found.map(s => `<a class="result" href="story.html?id=${s.id}"><span>${esc(s.category)}</span><b>${esc(s.title)}</b><i>→</i></a>`).join('')
        : '<div class="no-results"><b>No Results Found</b><span>Try another headline, category, or topic.</span></div>';
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });
  }

  /* ---------------- menu drawer ---------------- */
  const drawer = one('.menu-drawer'), shade = one('.drawer-shade');
  const openMenu = () => { if (!drawer) return; drawer.classList.add('open'); shade?.classList.add('show'); drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('modal-open'); };
  const closeMenu = () => { drawer?.classList.remove('open'); shade?.classList.remove('show'); drawer?.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open'); };
  one('.menu-toggle')?.addEventListener('click', openMenu);
  one('.menu-close')?.addEventListener('click', closeMenu);
  shade?.addEventListener('click', closeMenu);
  all('.menu-drawer a').forEach(a => a.addEventListener('click', closeMenu));

  /* ---------------- bookmark / share ---------------- */
  document.addEventListener('click', e => {
    const bookmark = e.target.closest('.bookmark'), share = e.target.closest('.share');
    if (bookmark) { e.preventDefault(); bookmark.classList.toggle('saved'); bookmark.textContent = bookmark.classList.contains('saved') ? '♥' : '♡'; }
    if (share) { e.preventDefault(); navigator.clipboard?.writeText(location.href); share.textContent = '✓'; setTimeout(() => share.textContent = '↗', 900); }
  });

  /* ---------------- hero date + loader ---------------- */
  const heroDate = one('#hero-date');
  if (heroDate) heroDate.textContent = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  setTimeout(() => one('.loader')?.classList.add('done'), 260);
})();
