(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('[data-site-header]');
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const scrollLinks = document.querySelectorAll('[data-scroll-link], .site-nav a, .brand, .site-footer a');
  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const getStoredTheme = () => {
    try {
      const stored = localStorage.getItem('portfolio-theme');
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch (error) {
      return null;
    }
  };

  const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

  const updateThemeControl = () => {
    const storedTheme = getStoredTheme();
    const activeTheme = root.dataset.theme || getSystemTheme();
    const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
    const icon = themeToggle?.querySelector('.theme-toggle__icon');
    const text = themeToggle?.querySelector('.theme-toggle__text');

    if (!themeToggle) return;
    if (icon) icon.textContent = activeTheme === 'dark' ? '☼' : '◐';
    if (text) text.textContent = storedTheme ? `${activeTheme} mode` : 'System';
    themeToggle.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
    themeToggle.setAttribute('aria-pressed', storedTheme ? 'true' : 'false');
    themeToggle.title = storedTheme ? `Switch to ${nextTheme} mode` : `System theme · switch to ${nextTheme} mode`;
  };

  const setTheme = (theme) => {
    root.dataset.theme = theme;
    try { localStorage.setItem('portfolio-theme', theme); } catch (error) { /* no-op */ }
    updateThemeControl();
  };

  themeToggle?.addEventListener('click', () => {
    const current = root.dataset.theme || getSystemTheme();
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => {
    if (!getStoredTheme()) updateThemeControl();
  });
  updateThemeControl();

  const showHeader = () => header?.classList.add('is-visible');
  const syncHeader = () => {
    if (window.scrollY > 32) showHeader();
    else header?.classList.remove('is-visible');
  };
  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();

  scrollLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href?.startsWith('#')) return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      showHeader();
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', href);
    });
  });

  body.classList.add('reveal-ready');
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute('href') === `#${visible.target.id}`;
        link.toggleAttribute('aria-current', isCurrent);
        if (!isCurrent) link.removeAttribute('aria-current');
      });
    }, { threshold: [0.15, .35, .6], rootMargin: '-25% 0px -55% 0px' });
    sections.forEach((section) => sectionObserver.observe(section));
  }
})();
