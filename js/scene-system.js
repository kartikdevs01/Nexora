(() => {
  if (!document.querySelector('link[data-nexora-theme]')) { const theme = document.createElement('link'); theme.rel = 'stylesheet'; theme.href = 'css/theme-system.css'; theme.dataset.nexoraTheme = 'true'; document.head.append(theme); const palette = document.createElement('link'); palette.rel = 'stylesheet'; palette.href = 'css/light-scenes.css'; palette.dataset.nexoraTheme = 'true'; document.head.append(palette); }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = [...document.querySelectorAll('[data-scene]')];
  let ticking = false;
  const update = () => {
    const height = innerHeight || 1;
    let activeScene = null;
    let activeDistance = Infinity;
    scenes.forEach((scene, index) => {
      const rect = scene.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - height)));
      const distance = Math.abs(rect.top - height * .18);
      if (distance < activeDistance) { activeDistance = distance; activeScene = index; }
      scene.style.setProperty('--scene-progress', progress.toFixed(3));
    });
    if (activeScene !== null) document.body.dataset.activeScene = String(activeScene);
    ticking = false;
  };
  if (!reduced && scenes.length) {
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update, { passive: true }); update();
  }
  const getRSS = () => { try { return JSON.parse(localStorage.getItem('nexoraRSSStories') || '[]'); } catch { return []; } };
  const escapeHTML = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const hydrate = () => {
    const stories = getRSS();
    const feature = document.querySelector('[data-featured-rss]');
    if (feature && stories.length) {
      const story = stories[0];
      const href = `story.html?id=${encodeURIComponent(story.id)}&rss=1`;
      feature.hidden = false;
      feature.innerHTML = `<a class="card-link" href="${href}" aria-label="Read ${escapeHTML(story.title || 'story')}"></a><div class="featured-image">${story.image && /^https?:\/\//i.test(story.image) ? `<img src="${escapeHTML(story.image)}" alt="" loading="eager">` : ''}</div><div class="featured-copy"><span class="scene-label">${escapeHTML(story.category || 'Live RSS')}</span><h2>${escapeHTML(story.title)}</h2><p>${escapeHTML(story.summary)}</p><div class="featured-meta">${escapeHTML(story.source || 'Nexora Source')} · ${escapeHTML(story.time)} · ${escapeHTML(story.read)}</div></div>`;
    }
    document.querySelectorAll('[data-briefing-rss]').forEach(container => {
      if (!stories.length) return;
      const item = stories[0];
      container.innerHTML = `<a class="text-link" href="story.html?id=${encodeURIComponent(item.id)}&rss=1">Read the latest live story: ${escapeHTML(item.title)} <span>→</span></a>`;
    });
    return stories.length;
  };
  if (!hydrate()) { let attempts = 0; const timer = setInterval(() => { attempts++; if (hydrate() || attempts > 20) clearInterval(timer); }, 500); }
})();
