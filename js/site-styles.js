// Fetches global site settings from the API, applies CSS variables,
// and exposes smart CTA behavior for returning visitors.
(async function () {
  const VISIT_COUNT_KEY = 'yjc_visit_count';
  const SESSION_COUNTED_KEY = 'yjc_visit_session_counted';

  function registerVisit() {
    try {
      if (sessionStorage.getItem(SESSION_COUNTED_KEY) === '1') {
        return parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '1', 10) || 1;
      }

      const nextCount = (parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) || 0) + 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(nextCount));
      sessionStorage.setItem(SESSION_COUNTED_KEY, '1');
      return nextCount;
    } catch (_) {
      return 1;
    }
  }

  function buildCtaState(data, visitCount) {
    const primary = {
      label: data.cta_primary_text || "Let's Talk",
      url: data.cta_primary_url || '/#contact'
    };
    const secondary = {
      label: data.cta_secondary_text || '',
      url: data.cta_secondary_url || ''
    };
    const hasSecondary = Boolean(secondary.label && secondary.url);
    const isReturningVisitor = visitCount > 1;

    return {
      visitCount,
      isReturningVisitor,
      primary,
      secondary,
      active: hasSecondary && isReturningVisitor ? secondary : primary
    };
  }

  function applyCtas() {
    const ctaState = window.__yjcCtaState;
    if (!ctaState?.active) return;

    document.querySelectorAll('[data-site-cta="smart"]').forEach((link) => {
      link.textContent = ctaState.active.label;
      link.setAttribute('href', ctaState.active.url);
    });

    document.querySelectorAll('[data-site-cta="primary"]').forEach((link) => {
      link.textContent = ctaState.primary.label;
      link.setAttribute('href', ctaState.primary.url);
    });
  }

  window.applySiteCtaTargets = applyCtas;

  try {
    const res = await fetch('/api/content?type=settings');
    if (!res.ok) return;
    const { data } = await res.json();
    if (!data) return;

    const root = document.documentElement;
    const visitCount = registerVisit();
    const ctaState = buildCtaState(data, visitCount);

    window.__siteSettings = data;
    window.__yjcCtaState = ctaState;

    if (data.color_accent) root.style.setProperty('--color-accent-gold', data.color_accent);
    if (data.color_green) root.style.setProperty('--color-accent-green', data.color_green);
    if (data.color_bg) root.style.setProperty('--color-bg-primary', data.color_bg);
    if (data.color_text) root.style.setProperty('--color-text-primary', data.color_text);

    const headingFont = data.font_heading;
    const bodyFont = data.font_body;
    const defaults = ['Playfair Display', 'Inter'];
    const custom = [headingFont, bodyFont].filter(font => font && !defaults.includes(font));

    if (custom.length) {
      const families = custom.map(font => `family=${encodeURIComponent(font)}:wght@400;600;700`).join('&');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
      document.head.appendChild(link);
    }

    if (headingFont) root.style.setProperty('--font-heading', `'${headingFont}', serif`);
    if (bodyFont) root.style.setProperty('--font-body', `'${bodyFont}', sans-serif`);

    // Show lead magnet sections if enabled
    if (data.lead_magnet_enabled === 'true') {
      const strip = document.getElementById('lead-magnet-strip');
      const hc    = document.getElementById('lead-magnet-hc');
      if (strip) strip.style.display = '';
      if (hc)    hc.style.display    = '';
    }

    applyCtas();
    window.dispatchEvent(new CustomEvent('site-settings-loaded', {
      detail: {
        settings: data,
        ctaState
      }
    }));
  } catch (_) {
    // Silently fail so the site falls back to default CSS values.
  }
})();
