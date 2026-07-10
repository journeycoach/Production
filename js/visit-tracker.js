(function () {
  const pageKey = document.documentElement.getAttribute('data-track-page');
  if (!pageKey || !window.fetch) return;

  function getVisitorKey() {
    const storageKey = 'yjc_visitor_key';
    try {
      const existing = window.localStorage.getItem(storageKey);
      if (existing) return existing;
      const value = window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : 'visitor-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      window.localStorage.setItem(storageKey, value);
      return value;
    } catch (_) {
      return null;
    }
  }

  const payload = JSON.stringify({
    pageKey,
    path: window.location.pathname,
    visitorKey: getVisitorKey(),
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    if (navigator.sendBeacon('/api/content?type=page-visit', blob)) return;
  }

  fetch('/api/content?type=page-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
})();
