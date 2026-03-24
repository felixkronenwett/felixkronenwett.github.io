// enhancements.js – shared across all pages
(() => {
  'use strict';

  /* ─── 1. MOBILE NAVIGATION ─────────────────────────────────────── */
  function initMobileNav() {
    const header = document.querySelector('header');
    if (!header) return;

    const nav = header.querySelector('nav');
    const logoArea = header.querySelector('a[href]');
    const profileLink = header.querySelector('a.rounded-full');

    if (!nav) return;

    // Build hamburger button
    const burger = document.createElement('button');
    burger.id = 'nav-burger';
    burger.setAttribute('aria-label', 'Menü öffnen');
    burger.setAttribute('aria-expanded', 'false');
    burger.className = [
      'md:hidden flex flex-col justify-center items-center gap-[5px]',
      'w-10 h-10 rounded-lg hover:bg-[#f0f2f4] transition-colors',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111418]'
    ].join(' ');
    burger.innerHTML = `
      <span class="burger-line block w-5 h-[2px] bg-[#111418] rounded transition-all duration-300 origin-center"></span>
      <span class="burger-line block w-5 h-[2px] bg-[#111418] rounded transition-all duration-300 origin-center"></span>
      <span class="burger-line block w-5 h-[2px] bg-[#111418] rounded transition-all duration-300 origin-center"></span>
    `;

    // Mobile menu overlay
    const overlay = document.createElement('div');
    overlay.id = 'mobile-menu';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.className = [
      'fixed inset-0 z-40 bg-white/98 backdrop-blur flex flex-col items-center justify-center gap-8',
      'opacity-0 pointer-events-none transition-opacity duration-300'
    ].join(' ');

    // Clone nav links into overlay
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
      const clone = link.cloneNode(true);
      clone.className = 'text-[#111418] text-[28px] font-bold leading-tight tracking-[-0.015em] hover:text-[#637588] transition-colors py-2';
      overlay.appendChild(clone);
      // Close menu on click
      clone.addEventListener('click', () => closeMenu());
    });

    // Insert burger before the flex-end container on mobile
    const rightArea = header.querySelector('.flex.flex-1.justify-end');
    if (rightArea) rightArea.prepend(burger);

    document.body.appendChild(overlay);

    let isOpen = false;

    function openMenu() {
      isOpen = true;
      overlay.classList.remove('opacity-0', 'pointer-events-none');
      overlay.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Menü schließen');
      // Animate to X
      const lines = burger.querySelectorAll('.burger-line');
      lines[0].style.transform = 'translateY(7px) rotate(45deg)';
      lines[1].style.opacity = '0';
      lines[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      isOpen = false;
      overlay.classList.add('opacity-0', 'pointer-events-none');
      overlay.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Menü öffnen');
      const lines = burger.querySelectorAll('.burger-line');
      lines[0].style.transform = '';
      lines[1].style.opacity = '';
      lines[2].style.transform = '';
      document.body.style.overflow = '';
    }

    burger.addEventListener('click', () => isOpen ? closeMenu() : openMenu());

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) closeMenu();
    });
  }

  /* ─── 2. SCROLL-TRIGGERED FADE-IN ─────────────────────────────── */
  function initScrollAnimations() {
    const style = document.createElement('style');
    style.textContent = `
      .fade-in-up {
        opacity: 0;
        transform: translateY(18px);
        transition: opacity 0.5s ease, transform 0.5s ease;
      }
      .fade-in-up.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .fade-in-up.no-animate {
        opacity: 1;
        transform: none;
        transition: none;
      }
    `;
    document.head.appendChild(style);

    // Respect reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const targets = document.querySelectorAll(
      '#experience-list > *, #education-list > *, .publication-entry, #posts-list > *, h2[id]'
    );

    if (prefersReduced) {
      targets.forEach(el => el.classList.add('no-animate'));
      return;
    }

    targets.forEach(el => el.classList.add('fade-in-up'));

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    targets.forEach(el => io.observe(el));
  }

  /* ─── 3. STAGGER NEW CARDS ADDED DYNAMICALLY ───────────────────── */
  function animateNewCards(container) {
    if (!container) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const cards = container.querySelectorAll('a, .publication-entry');
    cards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(14px)';
      card.style.transition = `opacity 0.35s ease ${i * 60}ms, transform 0.35s ease ${i * 60}ms`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
      });
    });
  }

  /* ─── 4. ACTIVE NAV HIGHLIGHT ──────────────────────────────────── */
  function initActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('header nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      // Highlight "Home" if on index, "Projects" link if on projects page, etc.
      const isCurrentPage =
        (href.includes('projects.html') && path.includes('projects')) ||
        (href === 'index.html#top' && (path === '/' || path.includes('index')));
      if (isCurrentPage) {
        a.classList.add('border-b-2', 'border-[#111418]', 'pb-0.5');
      }
    });
  }

  /* ─── 5. HEADER SCROLL SHADOW ──────────────────────────────────── */
  function initHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (window.scrollY > 8) {
            header.classList.add('shadow-md');
            header.classList.remove('shadow-sm');
          } else {
            header.classList.remove('shadow-md');
            header.classList.add('shadow-sm');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ─── 6. SMOOTH BACK-TO-TOP ────────────────────────────────────── */
  function initBackToTop() {
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.setAttribute('aria-label', 'Zurück nach oben');
    btn.className = [
      'fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-[#111418] text-white',
      'flex items-center justify-center shadow-lg',
      'opacity-0 pointer-events-none transition-all duration-300',
      'hover:bg-[#374151] hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111418]'
    ].join(' ');
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
      <path d="M210.83,130.83l-80-80a8,8,0,0,0-11.32,0l-80,80A8,8,0,0,0,51,141.66L120,72.69V216a8,8,0,0,0,16,0V72.69l69,68.97a8,8,0,1,0,11.31-11.32Z"/>
    </svg>`;
    document.body.appendChild(btn);

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (window.scrollY > 300) {
            btn.classList.remove('opacity-0', 'pointer-events-none');
          } else {
            btn.classList.add('opacity-0', 'pointer-events-none');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── 7. PUBLICATION ENTRY HOVER ──────────────────────────────── */
  function initPublicationHover() {
    const style = document.createElement('style');
    style.textContent = `
      .publication-entry {
        border-radius: 0.5rem;
        transition: background 0.2s ease;
      }
      .publication-entry:hover {
        background: #f8f9fc;
      }
    `;
    document.head.appendChild(style);
  }

  /* ─── 8. TOUCH RIPPLE ON CARDS ─────────────────────────────────── */
  function initCardRipple() {
    const style = document.createElement('style');
    style.textContent = `
      .ripple-host { position: relative; overflow: hidden; }
      .ripple-wave {
        position: absolute; border-radius: 50%;
        background: rgba(17,20,24,0.07);
        transform: scale(0); animation: ripple-anim 0.5s linear;
        pointer-events: none;
      }
      @keyframes ripple-anim { to { transform: scale(4); opacity: 0; } }
    `;
    document.head.appendChild(style);

    document.addEventListener('pointerdown', e => {
      const card = e.target.closest('a[href]');
      if (!card || card.closest('header') || card.closest('footer')) return;
      card.classList.add('ripple-host');
      const rect = card.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px;`;
      card.appendChild(wave);
      wave.addEventListener('animationend', () => wave.remove());
    });
  }

  /* ─── INIT ─────────────────────────────────────────────────────── */
  function init() {
    initMobileNav();
    initActiveNav();
    initHeaderScroll();
    initBackToTop();
    initPublicationHover();
    initCardRipple();

    // Scroll animations run after dynamic content is potentially loaded
    // Use a short delay to allow content.js / projects.js to render
    setTimeout(initScrollAnimations, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose helper for dynamic content (used by projects.js patch)
  window.__enhanceAnimateCards = animateNewCards;
})();
