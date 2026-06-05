// inconclusive-page.js — Handles displaying scores and Calendly button on tie results
(function () {
    const p = new URLSearchParams(window.location.search);
    const sh = parseInt(p.get('sh'), 10) || 0;
    const sd = parseInt(p.get('sd'), 10) || 0;
    const sa = parseInt(p.get('sa'), 10) || 0;
    const name = p.get('name') || '';

    if (sh || sd || sa) {
        document.getElementById('score-heart').textContent  = sh;
        document.getElementById('score-head').textContent   = sd;
        document.getElementById('score-action').textContent = sa;
    }

    if (name) {
        document.getElementById('inc-eyebrow').textContent = `Assessment Complete · ${name}'s Result`;
    }

    // Calendly URL is gated — only in sessionStorage if user came through
    // the assessment (set after captcha-verified submission).
    try {
        const calendlyUrl = sessionStorage.getItem('hc_calendly_url') || '';
        if (calendlyUrl) {
            const btn = document.getElementById('inc-contact-btn');
            if (btn) {
                btn.href = calendlyUrl;
                btn.textContent = 'Book a 20-Min Call';
                btn.target = '_blank';
                btn.rel = 'noopener noreferrer';
            }
        }
    } catch (_) {}
})();
