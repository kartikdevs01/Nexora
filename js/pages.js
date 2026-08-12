/* Nexora — category listing + story detail rendering.
   Shared by category.html and story.html. */
(() => {
  const D = window.NexoraData?.stories || [];
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const category = params.get('category');
  const isRSS = params.get('rss') === '1';
  const one = sel => document.querySelector(sel);
  const esc = window.NexoraCards?.esc || (s => String(s ?? ''));

  const getSection = (cat = '') => {
    const v = cat.toLowerCase();
    if (v.includes('india') || v.includes('national')) return 'India';
    if (v.includes('tech') || v.includes('ai')) return 'Technology';
    if (v.includes('business') || v.includes('economy') || v.includes('market')) return 'Business';
    return 'World';
  };

  const readRSSCache = () => {
    try { return JSON.parse(localStorage.getItem('nexoraRSSStories') || '[]'); }
    catch (e) { return []; }
  };

  /* ---------------- category listing ---------------- */
  const list = one('#category-list');
  if (list) {
    const rss = readRSSCache();
    const withHref = s => ({ ...s, href: `story.html?id=${encodeURIComponent(s.id)}` });
    let items;
    if (category) {
      const rssMatch = ['India', 'World', 'Technology', 'Business'].includes(category)
        ? rss.filter(s => getSection(s.category) === category)
        : [];
      const mockMatch = D.filter(s => s.category === category || (category === 'Technology' && s.category === 'AI')).map(withHref);
      items = [...rssMatch, ...mockMatch];
      one('#category-name').textContent = category;
    } else {
      items = [...rss, ...D.map(withHref)];
      one('#category-name').textContent = 'All stories';
    }
    const render = window.NexoraCards?.storyCard;
    list.innerHTML = items.length && render ? items.map(render).join('') : '<p>No stories in this edition yet.</p>';
    list.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in-view'));
  }

  /* ---------------- story detail ---------------- */
  const titleEl = one('#story-title');
  if (titleEl) {
    const rssStories = readRSSCache();
    const s = (isRSS ? rssStories.find(x => x.id === id) : D.find(x => x.id === id))
      || rssStories.find(x => x.id === id) || D.find(x => x.id === id) || D[0];

    if (s) {
      document.title = `Nexora — ${s.title}`;
      one('#story-meta').textContent = (s.topic && s.topic !== s.category) ? `${s.category} · ${s.topic}` : (s.category || '');
      titleEl.textContent = s.title || '';
      one('#story-source-line').innerHTML = `<strong>${esc(s.source || 'Nexora Source')}</strong>`;
      one('#story-date').textContent = s.time || '';
      one('#story-read').textContent = s.read || '';
      one('#story-body').textContent = s.summary || '';

      one('#story-source').innerHTML = s.url
        ? `<a class="button" target="_blank" rel="noreferrer" href="${s.url}">Visit ${esc(s.source || 'source')} <span>↗</span></a>`
        : `<a class="button" href="source-coming-soon.html">Source coming soon <span>→</span></a>`;

      const media = one('#story-media'), img = one('#story-image');
      if (s.image && media && img) {
        img.src = s.image;
        img.alt = s.title || '';
        img.onerror = () => { media.hidden = true; };
        media.hidden = false;
      }
    }
  }
})();
