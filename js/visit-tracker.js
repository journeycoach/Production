(function () {
  const pageKey = document.documentElement.getAttribute('data-track-page');
  if (!pageKey || !window.fetch) return;

  const payload = JSON.stringify({
    pageKey,
    path: window.location.pathname,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    if (navigator.sendBeacon('/api/analytics', blob)) return;
  }

  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
})();
