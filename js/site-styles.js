// Fetches global site settings from the API and applies them as CSS variables.
// Include this script on public-facing pages that should reflect admin site settings.
(async function () {
  try {
    const res = await fetch('/api/content?type=settings');
    if (!res.ok) return;
    const { data } = await res.json();
    if (!data) return;

    const root = document.documentElement;

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
  } catch (_) {
    // Silently fail so the site falls back to default CSS values.
  }
})();
