(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('[data-site-header]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const headerOffset = () => (header ? header.offsetHeight : 0);

  /* ---------- Theme ---------- */

  const themeToggle = document.querySelector('[data-theme-toggle]');
  const systemLight = window.matchMedia('(prefers-color-scheme: light)');

  const storedTheme = () => {
    try {
      const value = localStorage.getItem('portfolio-theme');
      return value === 'light' || value === 'dark' ? value : null;
    } catch (error) {
      return null;
    }
  };
  const activeTheme = () => root.dataset.theme || (systemLight.matches ? 'light' : 'dark');

  const syncThemeToggle = () => {
    if (!themeToggle) return;
    const next = activeTheme() === 'dark' ? 'light' : 'dark';
    themeToggle.textContent = next === 'light' ? 'Light mode' : 'Dark mode';
    themeToggle.setAttribute('aria-label', `Switch to ${next} mode`);
  };

  themeToggle?.addEventListener('click', () => {
    const next = activeTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('portfolio-theme', next); } catch (error) { /* storage unavailable */ }
    syncThemeToggle();
  });
  systemLight.addEventListener?.('change', () => { if (!storedTheme()) syncThemeToggle(); });
  syncThemeToggle();

  /* ---------- Mobile menu ---------- */

  const menuToggle = document.querySelector('[data-menu-toggle]');
  const nav = document.getElementById('site-nav');

  const setMenu = (open) => {
    if (!menuToggle || !nav) return;
    nav.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.textContent = open ? 'Close' : 'Menu';
  };
  menuToggle?.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
      setMenu(false);
      menuToggle.focus();
    }
  });

  /* ---------- Smooth scroll (Lenis + GSAP) ---------- */

  const hasLibs = typeof window.gsap !== 'undefined'
    && typeof window.ScrollTrigger !== 'undefined'
    && typeof window.Lenis !== 'undefined';
  const animate = hasLibs && !reducedMotion.matches;

  let lenis = null;
  if (animate) {
    gsap.registerPlugin(ScrollTrigger);
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- In-page links ---------- */

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      const target = href === '#top' ? document.body : document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      setMenu(false);

      if (lenis) {
        lenis.scrollTo(href === '#top' ? 0 : target, { offset: -headerOffset() });
      } else {
        const top = href === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - headerOffset();
        window.scrollTo({ top, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      }
      history.replaceState(null, '', href);

      // Move keyboard focus to the section so the next Tab continues from there.
      if (href !== '#top' && href !== '#main-content') {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  });

  /* ---------- Scroll progress ---------- */

  const progress = document.querySelector('[data-progress]');
  let ticking = false;
  const updateProgress = () => {
    ticking = false;
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    progress.style.transform = `scaleX(${ratio})`;
  };
  const queueProgress = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateProgress);
    }
  };
  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', queueProgress);
  updateProgress();

  /* ---------- Current section in nav ---------- */

  const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* ---------- Scroll-linked motion ---------- */
  // Everything below only runs when the libraries loaded and the visitor
  // has not asked for reduced motion. Content is visible without it.

  if (!animate) return;

  // Hero eases up and fades slightly as it leaves the screen.
  const hero = document.querySelector('[data-hero]');
  if (hero) {
    gsap.to(hero, {
      yPercent: -12,
      opacity: 0.35,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top+=80', end: 'bottom top', scrub: true },
    });
  }

  // Simple reveal for content blocks.
  const reveal = (targets) => {
    gsap.utils.toArray(targets).forEach((element) => {
      gsap.from(element, {
        y: 24,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      });
    });
  };
  reveal('[data-reveal], .section-title, .section-intro');

  // Projects: sideways scroll on wide screens, vertical list elsewhere.
  const work = document.querySelector('.work');
  const viewport = document.querySelector('[data-work-viewport]');
  const track = document.querySelector('[data-work-track]');
  const mm = gsap.matchMedia();

  const controls = document.querySelector('[data-work-controls]');
  const currentLabel = document.querySelector('[data-work-current]');
  const hint = document.querySelector('[data-work-hint]');
  const prevButton = document.querySelector('[data-work-prev]');
  const nextButton = document.querySelector('[data-work-next]');

  mm.add('(min-width: 1024px) and (min-height: 620px)', () => {
    if (!work || !viewport || !track) return undefined;
    work.classList.add('is-horizontal');
    if (controls) controls.hidden = false;

    const cards = gsap.utils.toArray('.project', track);
    const distance = () => Math.max(track.scrollWidth - window.innerWidth, 0);
    const firstLeft = () => cards[0].offsetLeft;
    // Horizontal offset at which each card sits where the first one starts.
    const cardOffset = (i) => Math.min(cards[i].offsetLeft - firstLeft(), distance());

    let active = 0;
    const setActive = (index) => {
      active = index;
      if (currentLabel) currentLabel.textContent = String(index + 1);
      if (prevButton) prevButton.disabled = index === 0;
      if (nextButton) nextButton.disabled = index === cards.length - 1;
    };
    setActive(0);

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: viewport,
        start: () => `center center+=${headerOffset() / 2}`,
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const x = self.progress * distance();
          let nearest = 0;
          cards.forEach((card, i) => {
            if (Math.abs(cardOffset(i) - x) < Math.abs(cardOffset(nearest) - x)) nearest = i;
          });
          if (nearest !== active) setActive(nearest);
          if (hint && self.progress > 0.02) hint.classList.add('is-hidden');
        },
      },
    });
    const trigger = tween.scrollTrigger;

    // Scroll position (vertical) that shows a given card.
    const scrollForCard = (i) => trigger.start + cardOffset(i);
    const goTo = (i) => {
      const index = Math.max(0, Math.min(cards.length - 1, i));
      swipeTarget = null;
      lenis.scrollTo(scrollForCard(index), { duration: 1 });
    };
    const onPrev = () => goTo(active - 1);
    const onNext = () => goTo(active + 1);
    prevButton?.addEventListener('click', onPrev);
    nextButton?.addEventListener('click', onNext);

    // Sideways input: trackpad swipes and Shift + mouse wheel.
    // Ctrl + wheel is left alone because browsers use it for zoom.
    // Deltas are added to our own running target so a fast swipe
    // isn't lost while the smooth scroll is still catching up.
    let swipeTarget = null;
    let lastSwipe = 0;
    const inRange = () => window.scrollY >= trigger.start - 2 && window.scrollY <= trigger.end + 2;
    const onWheel = (event) => {
      if (event.ctrlKey) return;
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const dx = sideways ? event.deltaX : (event.shiftKey ? event.deltaY : 0);
      if (!dx) return;

      if (!inRange()) return;

      // Keep the browser's back/forward swipe and Lenis from also reacting.
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      if (swipeTarget === null || now - lastSwipe > 250) swipeTarget = window.scrollY;
      lastSwipe = now;
      swipeTarget = Math.max(trigger.start, Math.min(trigger.end, swipeTarget + dx));
      lenis.scrollTo(swipeTarget);
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });

    // Arrow keys while the projects are pinned on screen.
    const onKey = (event) => {
      if (!inRange() || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); onNext(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); onPrev(); }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      viewport.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKey);
      prevButton?.removeEventListener('click', onPrev);
      nextButton?.removeEventListener('click', onNext);
      trigger?.kill();
      tween.kill();
      gsap.set(track, { clearProps: 'transform' });
      work.classList.remove('is-horizontal');
      if (controls) controls.hidden = true;
    };
  });

  mm.add('(max-width: 1023px), (max-height: 619px)', () => {
    reveal('.project');
  });

  // Re-measure once images and fonts have settled.
  window.addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
})();
