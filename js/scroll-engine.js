/* Nexora — scroll-driven 3D scene engine.
   Computes a 0..1 progress value per [data-scene] element and
   writes it to that element's --p custom property once per
   animation frame. All actual motion (translate/rotate/scale/
   opacity) is expressed in CSS via calc(var(--p)), so the only
   per-frame JS cost is a handful of getBoundingClientRect() reads
   and style writes — no layout thrash, transform/opacity only. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = Array.from(document.querySelectorAll('[data-scene]'));

  let io = null;
  const observeReveals = (root = document) => {
    const els = root.querySelectorAll ? root.querySelectorAll('[data-reveal]:not(.in-view)') : [];
    if (!els.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in-view'));
      return;
    }
    if (!io) {
      io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    }
    els.forEach(el => io.observe(el));
  };

  window.NexoraScroll = { observeReveals };

  if (reduceMotion || !scenes.length) {
    scenes.forEach(el => el.style.setProperty('--p', '0'));
    observeReveals();
    return;
  }

  let ticking = false;
  const vh = () => window.innerHeight;

  const progressFor = el => {
    const rect = el.getBoundingClientRect();
    if (el.dataset.sceneMode === 'pin') {
      const scrollable = Math.max(rect.height - vh(), 1);
      return Math.min(1, Math.max(0, -rect.top / scrollable));
    }
    const p = (vh() - rect.top) / (vh() + rect.height);
    return Math.min(1, Math.max(0, p));
  };

  const update = () => {
    scenes.forEach(el => el.style.setProperty('--p', progressFor(el).toFixed(4)));
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
  observeReveals();
})();
