(() => {
  if (!document.querySelector('link[data-nexora-theme]')) { const theme = document.createElement('link'); theme.rel = 'stylesheet'; theme.href = 'css/theme-system.css'; theme.dataset.nexoraTheme = 'true'; document.head.append(theme); }
  const demoStories = window.NexoraData?.stories || [];
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const category = params.get('category');
  const isRSS = params.get('rss') === '1';
  const escapeHTML = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const getRSS = () => { try { const data = JSON.parse(localStorage.getItem('nexoraRSSStories') || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } };

  const categoryName = document.querySelector('#category-name');
  if (categoryName) {
    const categoryList = document.querySelector('#category-list');
    categoryName.textContent = category || 'Live stories';
    const renderCategory = () => {
      const rssStories = getRSS();
      const source = rssStories.length ? rssStories : [];
      const items = category ? source.filter(story => story.category === category || (category === 'Technology' && /technology|ai/i.test(`${story.category} ${story.topic}`))) : source;
      if (!categoryList) return Boolean(source.length);
      categoryList.innerHTML = items.length ? items.map(story => `<article class="story-card tone-${escapeHTML(story.tone || 'world')}"><a class="card-link" href="story.html?id=${encodeURIComponent(story.id)}&rss=1" aria-label="Read ${escapeHTML(story.title)}"></a><div class="card-art">${story.image ? `<img src="${escapeHTML(story.image)}" alt="" loading="lazy">` : ''}<span>${escapeHTML(story.category || 'Live RSS')}</span><i></i></div><div class="card-copy"><div class="story-meta"><span>${escapeHTML(story.topic || story.category)}</span><span>${escapeHTML(story.read || '3 min read')}</span></div><h3>${escapeHTML(story.title)}</h3><p>${escapeHTML(story.summary || '')}</p><div class="card-bottom"><span>${escapeHTML(story.source || 'Nexora Source')} · ${escapeHTML(story.time || '')}</span></div></div></article>`).join('') : '<p class="scene-subtitle">Live RSS stories will appear here as soon as the feed is available.</p>';
      return Boolean(source.length);
    };
    if (!renderCategory()) { let tries = 0; const waitForRSS = setInterval(() => { tries += 1; if (renderCategory() || tries > 20) clearInterval(waitForRSS); }, 500); }
  }

  const titleElement = document.querySelector('#story-title');
  if (titleElement) {
    const story = isRSS ? getRSS().find(item => item.id === id) : demoStories.find(item => item.id === id);
    const sourceButton = document.querySelector('#story-source');
    const body = document.querySelector('#story-body');
    if (!story) {
      titleElement.textContent = isRSS ? 'This RSS story is no longer available.' : 'This story is no longer available.';
      document.querySelector('#story-summary').textContent = 'Return to Nexora to choose another current story.';
      if (sourceButton) sourceButton.innerHTML = '<a class="button" href="index.html">Return to Nexora <span>→</span></a>';
      return;
    }
    const text = String(story.summary || story.description || '').trim();
    titleElement.textContent = story.title || 'Untitled story'; document.title = `${story.title || 'Story'} — Nexora`;
    document.querySelector('#story-category').textContent = String(story.category || 'Story');
    document.querySelector('#story-topic').textContent = String(story.topic || story.category || '');
    document.querySelector('#story-summary').textContent = text;
    document.querySelector('#story-source-name').textContent = String(story.source || 'Nexora Source');
    document.querySelector('#story-time').textContent = String(story.time || ''); document.querySelector('#story-read').textContent = String(story.read || '');
    if (sourceButton) sourceButton.innerHTML = story.url ? `<a class="button" target="_blank" rel="noopener noreferrer" href="${escapeHTML(story.url)}">Visit source <span>↗</span></a>` : '<a class="button" href="source-coming-soon.html">Source coming soon <span>→</span></a>';
    if (body) { const parts = text.split(/(?<=[.!?])\s+(?=[A-Z“"'])/).filter(Boolean); body.replaceChildren(...(parts.length ? parts : [text]).map(part => { const p = document.createElement('p'); p.textContent = part; return p; })); }
    const media = document.querySelector('#story-media'), image = document.querySelector('#story-image');
    if (media && image && typeof story.image === 'string' && /^https?:\/\//i.test(story.image)) { image.src = story.image; image.alt = story.title || ''; image.onload = () => { media.hidden = false; }; image.onerror = () => { media.hidden = true; }; }
    const context = document.querySelector('#story-context'), contextText = document.querySelector('#story-context-text');
    if (text.length >= 180 && context && contextText) { const sentences = text.match(/[^.!?]+[.!?]+/g) || []; const excerpt = sentences.slice(0, 2).join(' ').trim(); if (excerpt.length >= 120) { contextText.textContent = excerpt; context.hidden = false; } }
    const experience = document.querySelector('[data-story-experience]');
    if (experience && !matchMedia('(prefers-reduced-motion: reduce)').matches) { experience.addEventListener('pointermove', event => { const bounds = experience.getBoundingClientRect(); experience.style.setProperty('--tilt-x', `${(((event.clientY - bounds.top) / bounds.height - .5) * -2.4).toFixed(2)}deg`); experience.style.setProperty('--tilt-y', `${(((event.clientX - bounds.left) / bounds.width - .5) * 2.4).toFixed(2)}deg`); }); experience.addEventListener('pointerleave', () => { experience.style.setProperty('--tilt-x', '0deg'); experience.style.setProperty('--tilt-y', '0deg'); }); }
  }
})();
