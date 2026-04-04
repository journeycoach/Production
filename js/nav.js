// nav.js — Dynamically renders the navbar from the Neon API with a local fallback.

(function () {
    // Centralized fallback config (used if API is unreachable or returns nothing)
    const FALLBACK_CONFIG = {
        brand_name: 'Your Journey Coach',
        nav_links: [
            { label: 'About',       url: 'index.html#welcome',    visible: true  },
            { label: 'Enneagram',   url: 'enneagram.html',        visible: true  },
            { label: 'Blog',        url: 'blog.html',             visible: true  },
            { label: 'Resources',   url: 'tools.html',            visible: true  }
        ],
        cta_button: { label: "Let's Talk", url: "index.html#contact", visible: true }
    };

    function renderNav(config) {
        const logoEl  = document.getElementById('nav-logo');
        const navList = document.getElementById('nav-links-list');
        if (!logoEl || !navList) return;

        // Brand name
        logoEl.textContent = config.brand_name || FALLBACK_CONFIG.brand_name;

        // Detect current page for active-state highlighting
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        let html = '';

        // Nav links (only visible ones)
        (config.nav_links || []).forEach(link => {
            if (!link.visible) return;
            const isActive = (link.url === currentPage) ||
                             (link.url === '/' && currentPage === 'index.html');
            const cls = isActive ? ' class="active"' : '';
            html += `<li><a href="${link.url}"${cls}>${link.label}</a></li>`;
        });

        // CTA button
        const cta = config.cta_button;
        if (cta && cta.visible) {
            html += `<li><a href="${cta.url}" class="btn-primary">${cta.label}</a></li>`;
        }

        navList.innerHTML = html;
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
            })
            .catch(() => {
                renderNav(FALLBACK_CONFIG);
            });
    }

    // Run after DOM is ready so getElementById is guaranteed to work
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
