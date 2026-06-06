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
        let calendlyUrl = sessionStorage.getItem('hc_calendly_url') || '';
        if (calendlyUrl) {
            const email = sessionStorage.getItem('hc_result_email') || '';
            
            // Prefill user details, custom answers (scores summary), and UTM tags for tracking
            try {
                const urlObj = new URL(calendlyUrl);
                if (name && name !== 'Leader') {
                    urlObj.searchParams.set('name', name);
                }
                if (email) {
                    urlObj.searchParams.set('email', email);
                }
                
                const a1Value = `Center: Evenly Distributed (Scores - Heart: ${sh}, Head: ${sd}, Action: ${sa})`;
                urlObj.searchParams.set('a1', a1Value);
                
                urlObj.searchParams.set('utm_source', 'assessment');
                urlObj.searchParams.set('utm_medium', 'results_page');
                urlObj.searchParams.set('utm_campaign', 'inconclusive');
                
                calendlyUrl = urlObj.toString();
            } catch (_) {}

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
