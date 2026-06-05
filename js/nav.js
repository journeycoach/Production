// nav.js — Dynamically renders the navbar from the Neon API with a local fallback.

(function () {
    const ADMIN_SESSION_MARKER_KEY = 'admin_session_active';
    const LEGACY_ADMIN_TOKEN_KEY = 'admin_token';
    // Centralized fallback config (used if API is unreachable or returns nothing)
    const FALLBACK_CONFIG = {
        brand_name: 'Your Journey Coach',
        nav_links: [
            { label: 'About',       url: '/#welcome',             visible: true  },
            { label: 'Enneagram',   url: 'enneagram.html',        visible: true  },
            { label: 'Blog',        url: 'blog.html',             visible: true  },
            { label: 'Resources',   url: 'tools.html',            visible: true  }
        ],
        cta_button: { label: "Let's Talk", url: "/#contact", visible: true },
        footer_links: [
            { label: 'Blog',                     url: '/blog.html',           visible: true },
            { label: 'Tools & Resources',        url: '/tools.html',          visible: true },
            { label: 'The Enneagram',            url: '/enneagram.html',      visible: true },
            { label: 'Hidden Ceiling Assessment',url: '/Hidden-Ceiling.html', visible: true }
        ]
    };

    function hasValidAdminSession() {
        if (localStorage.getItem(ADMIN_SESSION_MARKER_KEY) === '1') return true;

        const token = localStorage.getItem(LEGACY_ADMIN_TOKEN_KEY);
        if (!token) return false;

        try {
            const [payload] = token.split('.');
            if (!payload) return false;

            const expires = parseInt(atob(payload), 10);
            const isValid = Number.isFinite(expires) && Date.now() < expires;

            if (!isValid) {
                localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
            } else {
                localStorage.setItem(ADMIN_SESSION_MARKER_KEY, '1');
                localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
            }

            return isValid;
        } catch {
            localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
            return false;
        }
    }

    function safeUrl(value) {
        if (!value) return '';
        try {
            const url = new URL(String(value).trim(), window.location.origin);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return '';
            }
            if (url.origin === window.location.origin) {
                return `${url.pathname}${url.search}${url.hash}`;
            }
            return url.href;
        } catch {
            return '';
        }
    }

    function normalizedPathname(value) {
        const safe = safeUrl(value);
        if (!safe) return '';
        const url = new URL(safe, window.location.origin);
        let path = url.pathname || '/';
        if (path === '/index.html') path = '/';
        return path.replace(/\/+$/, '') || '/';
    }

    function createNavLink(link, currentPath) {
        const href = safeUrl(link.url);
        if (!href) return null;

        const listItem = document.createElement('li');
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.textContent = link.label || '';

        const linkPath = normalizedPathname(link.url);
        const isHashLink = href.includes('#') && linkPath === '/';
        if (linkPath === currentPath || (isHashLink && currentPath === '/')) {
            anchor.classList.add('active');
        }

        listItem.appendChild(anchor);
        return listItem;
    }

    function renderNav(config) {
        const logoEl  = document.getElementById('nav-logo');
        const navList = document.getElementById('nav-links-list');
        if (!logoEl || !navList) return;

        // Keep the logo image, add brand name text alongside it
        const existingImg = logoEl.querySelector('img');
        logoEl.innerHTML = '';
        if (existingImg) logoEl.appendChild(existingImg);
        const brandSpan = document.createElement('span');
        brandSpan.className = 'logo-brand';
        brandSpan.textContent = config.brand_name || FALLBACK_CONFIG.brand_name;
        logoEl.appendChild(brandSpan);

        // Detect current page for active-state highlighting
        const currentPath = normalizedPathname(window.location.pathname);
        navList.textContent = '';

        // Nav links (only visible ones)
        (config.nav_links || []).forEach(link => {
            if (!link.visible) return;
            const listItem = createNavLink(link, currentPath);
            if (listItem) {
                navList.appendChild(listItem);
            }
        });

        if (hasValidAdminSession()) {
            const adminItem = createNavLink({ label: 'Admin', url: '/admin' }, currentPath);
            if (adminItem) {
                navList.appendChild(adminItem);
            }
        }

        // CTA button
        const ctaState = window.__yjcCtaState;
        const cta = ctaState?.active
            ? { label: ctaState.active.label, url: ctaState.active.url, visible: true }
            : config.cta_button;
        if (cta && cta.visible) {
            const href = safeUrl(cta.url);
            if (href) {
                const listItem = document.createElement('li');
                const anchor = document.createElement('a');
                anchor.href = href;
                anchor.className = 'btn-primary';
                anchor.dataset.siteCta = 'smart';
                anchor.textContent = cta.label || '';
                listItem.appendChild(anchor);
                navList.appendChild(listItem);
            }
        }

        window.applySiteCtaTargets?.();
    }

    function renderFooter(config) {
        const footerNav = document.getElementById('footer-nav-links');
        if (!footerNav) return;
        const links = Array.isArray(config.footer_links) ? config.footer_links : [];
        const visible = links.filter(l => l.visible !== false);
        if (visible.length === 0) return;
        footerNav.textContent = '';

        visible.forEach(link => {
            const href = safeUrl(link.url);
            if (!href) return;

            const anchor = document.createElement('a');
            anchor.href = href;
            anchor.textContent = link.label || '';
            anchor.style.color = 'var(--color-text-muted)';
            anchor.style.fontSize = '0.8rem';
            anchor.style.textDecoration = 'none';
            anchor.style.transition = 'color 0.3s ease';
            anchor.addEventListener('mouseenter', () => {
                anchor.style.color = 'var(--color-accent-gold)';
            });
            anchor.addEventListener('mouseleave', () => {
                anchor.style.color = 'var(--color-text-muted)';
            });
            footerNav.appendChild(anchor);
        });
    }

    function init() {
        const footerYearEl = document.getElementById('footer-year');
        if (footerYearEl) {
            footerYearEl.textContent = new Date().getFullYear();
        }

        // Race API fetch against a 2-second timeout so the nav always renders quickly.
        // If API is unreachable or slow, the fallback config is used immediately.
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('nav timeout')), 2000)
        );

        const apiFetch = fetch('/api/content?type=navigation')
            .then(r => r.json())
            .then(d => d.data);

        Promise.race([apiFetch, timeout])
            .then(config => {
                renderNav(config || FALLBACK_CONFIG);
                renderFooter(config || FALLBACK_CONFIG);
            })
            .catch(() => {
                renderNav(FALLBACK_CONFIG);
                renderFooter(FALLBACK_CONFIG);
            });

        window.addEventListener('site-settings-loaded', () => {
            const navList = document.getElementById('nav-links-list');
            if (!navList?.children.length) return;
            const ctaLink = navList.querySelector('[data-site-cta="smart"]');
            if (ctaLink) {
                window.applySiteCtaTargets?.();
            }
        });
    }

    // Run after DOM is ready so getElementById is guaranteed to work
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
