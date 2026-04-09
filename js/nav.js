// nav.js — Dynamically renders the navbar from the Neon API with a local fallback.

(function () {
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
        const token = localStorage.getItem('admin_token');
        if (!token) return false;

        try {
            const [payload] = token.split('.');
            if (!payload) return false;

            const expires = parseInt(atob(payload), 10);
            const isValid = Number.isFinite(expires) && Date.now() < expires;

            if (!isValid) {
                localStorage.removeItem('admin_token');
            }

            return isValid;
        } catch {
            localStorage.removeItem('admin_token');
            return false;
        }
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
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        let html = '';

        // Nav links (only visible ones)
        (config.nav_links || []).forEach(link => {
            if (!link.visible) return;
            const isActive = (link.url === currentPage) ||
                             (link.url === '/' && currentPage === 'index.html') ||
                             (link.url.startsWith('/#') && currentPage === 'index.html');
            const cls = isActive ? ' class="active"' : '';
            html += `<li><a href="${link.url}"${cls}>${link.label}</a></li>`;
        });

        if (hasValidAdminSession()) {
            html += `<li><a href="/admin">Admin</a></li>`;
        }

        // CTA button
        const ctaState = window.__yjcCtaState;
        const cta = ctaState?.active
            ? { label: ctaState.active.label, url: ctaState.active.url, visible: true }
            : config.cta_button;
        if (cta && cta.visible) {
            html += `<li><a href="${cta.url}" class="btn-primary" data-site-cta="smart">${cta.label}</a></li>`;
        }

        navList.innerHTML = html;
        window.applySiteCtaTargets?.();
    }

    function renderFooter(config) {
        const footerNav = document.getElementById('footer-nav-links');
        if (!footerNav) return;
        const links = Array.isArray(config.footer_links) ? config.footer_links : [];
        const visible = links.filter(l => l.visible !== false);
        if (visible.length === 0) return;
        footerNav.innerHTML = visible.map(l =>
            `<a href="${l.url}" style="color:var(--color-text-muted);font-size:0.8rem;text-decoration:none;transition:color 0.3s ease;" onmouseover="this.style.color='var(--color-accent-gold)'" onmouseout="this.style.color='var(--color-text-muted)'">${l.label}</a>`
        ).join('');
    }

    function init() {
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
