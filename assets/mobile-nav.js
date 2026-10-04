/**
 * Mobile bottom navigation bar
 * Injected into every page via a <script> tag in index.html.
 * Visible only on screens < 768px (md breakpoint).
 */
(function () {
  // Derive the site root from the script's own URL so this works on any host
  // (GitHub Pages at /gaming-hub/, local dev at /, etc.)
  const BASE = (document.currentScript.src || '')
    .replace(/\/assets\/mobile-nav\.js.*$/, '');

  const path = window.location.pathname;
  const rootPath = BASE.replace(window.location.origin, ''); // e.g. '/gaming-hub' or ''

  // ── Platform registry ──────────────────────────────────────────────────────
  // Maps config.json platform keys → display metadata + route
  const PLATFORM_META = {
    retroachievements: {
      label: 'RetroAchievements',
      short: 'RA',
      href: BASE + '/profile/ra/',
      icon: BASE + '/assets/icon-ra.png',
      color: '#e5b143',
      active: path.includes('/profile/ra'),
    },
    steam: {
      label: 'Steam',
      short: 'Steam',
      href: BASE + '/profile/steam/',
      icon: BASE + '/assets/icon-steam.png',
      color: '#66c0f4',
      active: path.includes('/profile/steam'),
    },
    xbox: {
      label: 'Xbox',
      short: 'Xbox',
      href: BASE + '/profile/xbox/',
      icon: BASE + '/assets/icon-xbox.png',
      color: '#52b043',
      active: path.includes('/profile/xbox'),
    },
  };

  const isProfilePage = path.includes('/profile/');
  const currentPlatform = Object.values(PLATFORM_META).find(p => p.active);
  const profileActiveColor = currentPlatform ? currentPlatform.color : '#66c0f4';

  // ── Nav tab definitions ───────────────────────────────────────────────────
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      href: BASE + '/',
      active: path === rootPath + '/' || path === rootPath + '/index.html' || path === rootPath,
      color: '#66c0f4',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>`,
    },
    {
      id: 'profile',
      label: 'Profile',
      href: null, // opens popup instead
      active: isProfilePage,
      color: profileActiveColor,
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8"/>
        <path d="M12 17v4"/>
        <circle cx="9" cy="10" r="2"/>
        <path d="M15 10h2"/>
        <path d="M15 13h2"/>
      </svg>`,
    },
    {
      id: 'activity',
      label: 'Activity',
      href: BASE + '/activity/',
      active: path.includes('/activity'),
      color: '#66c0f4',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>`,
    },
    {
      id: 'completions',
      label: 'Done',
      href: BASE + '/completions/',
      active: path.includes('/completions'),
      color: '#e5b143',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
      </svg>`,
    },
    {
      // The changelog is linked from the hub header on mobile instead
      id: 'analytics',
      label: 'Stats',
      href: BASE + '/analytics/',
      active: path.includes('/analytics'),
      color: '#57cbde',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 3v18h18"/>
        <path d="M18 17V9"/>
        <path d="M13 17V5"/>
        <path d="M8 17v-3"/>
      </svg>`,
    },
  ];

  // ── CSS ────────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .mnav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 200;
      background: #131a22;
      border-top: 1px solid #2a475e;
      padding-bottom: env(safe-area-inset-bottom, 0px);
      /* Stays put while pages cross-fade (assets/motion.css) */
      view-transition-name: mobile-nav;
    }

    @media (max-width: 767px) {
      .mnav { display: flex; align-items: stretch; }
      body { padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px)) !important; }
      .scroll-top-btn { bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important; }
      /* Hide topbar breadcrumb and footer on mobile — bottom nav replaces them */
      .page-topbar { display: none !important; }
      footer { display: none !important; }
    }

    .mnav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 8px 4px;
      min-height: 60px;
      min-width: 44px;
      text-decoration: none;
      color: #546270;
      background: none;
      border: none;
      cursor: pointer;
      position: relative;
      transition: color 0.15s, background 0.1s;
      -webkit-tap-highlight-color: transparent;
    }

    .mnav-item:active { background: rgba(102,192,244,0.06); }

    .mnav-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .mnav-icon svg { transition: stroke 0.15s; }

    .mnav-label {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      line-height: 1;
      white-space: nowrap;
    }

    .mnav-item.mnav-active {
      color: var(--mnav-color, #66c0f4);
    }
    .mnav-item.mnav-active .mnav-icon svg {
      stroke: var(--mnav-color, #66c0f4);
    }
    .mnav-item.mnav-active::before {
      content: '';
      position: absolute;
      top: 0;
      left: 15%;
      right: 15%;
      height: 2px;
      background: var(--mnav-color, #66c0f4);
      border-radius: 0 0 2px 2px;
    }

    /* ── Profile popup ── */
    .mnav-popup-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 198;
      background: rgba(0,0,0,0.45);
    }
    .mnav-popup-backdrop.open { display: block; }

    .mnav-popup {
      position: fixed;
      left: 50%;
      transform: translateX(-50%) translateY(12px);
      bottom: calc(68px + env(safe-area-inset-bottom, 0px));
      z-index: 199;
      background: rgba(19,26,34,0.92);
      border: 1px solid #2a475e;
      border-radius: 14px;
      min-width: 160px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 6px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
    }
    .mnav-popup.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateX(-50%) translateY(0);
    }

    .mnav-popup-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 14px 0 8px;
      border-radius: 9999px;
      text-decoration: none;
      color: #546270;
      transition: background 0.15s, color 0.15s;
      -webkit-tap-highlight-color: transparent;
      white-space: nowrap;
    }
    .mnav-popup-item:active { background: rgba(255,255,255,0.06); }

    .mnav-popup-item.mnav-popup-active {
      color: var(--item-color, #66c0f4);
      background: color-mix(in srgb, var(--item-color, #66c0f4) 13%, transparent);
    }

    .mnav-popup-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .mnav-popup-icon img {
      width: 20px;
      height: 20px;
      object-fit: contain;
      filter: brightness(0.55);
      transition: filter 0.15s;
    }
    .mnav-popup-item.mnav-popup-active .mnav-popup-icon img {
      filter: none;
    }

    .mnav-popup-item-label {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      line-height: 1;
      color: currentColor;
    }

    .mnav-popup-loading {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      color: #546270;
      padding: 12px 16px;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);

  // ── DOM: nav bar ───────────────────────────────────────────────────────────
  const nav = document.createElement('nav');
  nav.className = 'mnav';
  nav.setAttribute('aria-label', 'Main navigation');

  nav.innerHTML = tabs
    .map((t) => {
      const isBtn = t.href === null;
      const tag = isBtn ? 'button' : 'a';
      const hrefAttr = isBtn ? '' : `href="${t.href}"`;
      return `<${tag} ${hrefAttr}
          class="mnav-item${t.active ? ' mnav-active' : ''}"
          style="--mnav-color: ${t.color};"
          data-id="${t.id}"
          ${t.active ? 'aria-current="page"' : ''}
          aria-label="${t.label}"
        >
          <span class="mnav-icon">${t.icon}</span>
          <span class="mnav-label">${t.label}</span>
        </${tag}>`;
    })
    .join('');

  document.body.appendChild(nav);

  // ── DOM: profile popup + backdrop ─────────────────────────────────────────
  const backdrop = document.createElement('div');
  backdrop.className = 'mnav-popup-backdrop';
  document.body.appendChild(backdrop);

  const popup = document.createElement('div');
  popup.className = 'mnav-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-label', 'Select platform');
  popup.innerHTML = `<span class="mnav-popup-loading">Loading…</span>`;
  document.body.appendChild(popup);

  // ── Popup open / close ────────────────────────────────────────────────────
  let popupOpen = false;

  function openPopup() {
    popupOpen = true;
    popup.classList.add('open');
    backdrop.classList.add('open');
  }

  function closePopup() {
    popupOpen = false;
    popup.classList.remove('open');
    backdrop.classList.remove('open');
  }

  backdrop.addEventListener('click', closePopup);

  // Profile tab click
  const profileBtn = nav.querySelector('[data-id="profile"]');
  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (popupOpen) { closePopup(); return; }

      // If only 1 platform loaded, navigate directly
      const items = popup.querySelectorAll('.mnav-popup-item');
      if (items.length === 1) {
        window.location.href = items[0].href;
        return;
      }

      openPopup();
    });
  }

  // Close popup on nav link tap (navigating away)
  nav.querySelectorAll('.mnav-item[href]').forEach(a => {
    a.addEventListener('click', closePopup);
  });

  // ── Fetch config + populate popup ─────────────────────────────────────────
  fetch(BASE + '/data/hub/config.json')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(cfg => {
      const platforms = cfg.platforms || {};
      const visible = Object.entries(platforms)
        .filter(([, v]) => v.visible)
        .map(([key]) => PLATFORM_META[key])
        .filter(Boolean); // skip unknown platforms

      if (visible.length === 0) {
        popup.querySelector('.mnav-popup-loading').textContent = 'No platforms configured.';
        return;
      }

      const loadingEl = popup.querySelector('.mnav-popup-loading');
      if (loadingEl) loadingEl.remove();

      visible.forEach(p => {
        const a = document.createElement('a');
        a.href = p.href;
        a.className = 'mnav-popup-item' + (p.active ? ' mnav-popup-active' : '');
        if (p.active) a.style.setProperty('--item-color', p.color);
        a.innerHTML = `
          <span class="mnav-popup-icon">
            <img src="${p.icon}" alt="${p.short}" onerror="this.style.display='none'">
          </span>
          <span class="mnav-popup-item-label">${p.label}</span>
        `;
        a.addEventListener('click', closePopup);
        popup.appendChild(a);
      });
    })
    .catch(() => {
      const loadingEl = popup.querySelector('.mnav-popup-loading');
      if (loadingEl) loadingEl.textContent = 'Could not load platforms.';
    });
})();
