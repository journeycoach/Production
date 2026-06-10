// home-page.js — Handles homepage specific interactive logic (Turnstile captcha, contact form, subscribe form, float button)

// 1. Float Button Scroll Behavior
(function () {
    const btn = document.getElementById('hc-float-btn');
    if (btn) {
        if (window.innerWidth > 640) return;
        let scrolled = false;
        window.addEventListener('scroll', function () {
            if (window.scrollY > 80 && !scrolled) {
                btn.classList.add('hc-hidden');
                scrolled = true;
            } else if (window.scrollY <= 80 && scrolled) {
                btn.classList.remove('hc-hidden');
                scrolled = false;
            }
        }, { passive: true });
    }
})();

// 2. Contact Form Scroll Behavior
function scrollToContactForm(smooth) {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const rect = form.getBoundingClientRect();
    const formTop = window.scrollY + rect.top;
    const target = formTop - Math.max(0, (window.innerHeight - rect.height) / 2);
    window.scrollTo({ top: Math.max(0, target), behavior: smooth ? 'smooth' : 'instant' });
}

document.querySelectorAll('a[href="#contact"], a[href="/#contact"]').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        history.pushState(null, '', '/#contact');
        scrollToContactForm(true);
    });
});

if (window.location.hash === '#contact') {
    window.addEventListener('load', () => scrollToContactForm(false));
}

window.addEventListener('hashchange', () => {
    if (window.location.hash === '#contact') scrollToContactForm(true);
});

// 3. Cloudflare Turnstile & Contact Form Submission Handler
(() => {
    const CONTACT_TURNSTILE_SITEKEY = '0x4AAAAAACt13j1xYnpJgcv2';
    const form = document.getElementById('contact-form');
    if (!form) return;
    const btn = document.getElementById('cf-submit');
    const spinner = document.getElementById('cf-spinner');
    const btnText = document.getElementById('cf-btn-text');
    const successEl = document.getElementById('cf-success');
    const errorEl = document.getElementById('cf-error');
    const turnstileTokenInput = document.getElementById('cf-turnstile-response');
    let turnstileWidgetId = null;

    function setTurnstileToken(token = '') {
        if (turnstileTokenInput) turnstileTokenInput.value = token;
    }

    function resetTurnstile() {
        setTurnstileToken('');
        if (window.turnstile && turnstileWidgetId !== null) {
            window.turnstile.reset(turnstileWidgetId);
        }
    }

    window.renderContactTurnstile = function () {
        if (!window.turnstile || turnstileWidgetId !== null) return;

        turnstileWidgetId = window.turnstile.render('#contact-turnstile', {
            sitekey: CONTACT_TURNSTILE_SITEKEY,
            callback(token) {
                setTurnstileToken(token || '');
                if (errorEl) errorEl.style.display = 'none';
            },
            'expired-callback'() {
                setTurnstileToken('');
            },
            'error-callback'() {
                setTurnstileToken('');
                if (errorEl) {
                    errorEl.textContent = 'The CAPTCHA could not be loaded. Please refresh the page and try again.';
                    errorEl.style.display = 'block';
                }
            }
        });

        // Also render subscribe form widget (interaction-only: invisible unless challenge needed)
        if (document.getElementById('home-sub-turnstile') && !window._homeSubTurnstileId) {
            window._homeSubTurnstileId = window.turnstile.render('#home-sub-turnstile', {
                sitekey: CONTACT_TURNSTILE_SITEKEY,
                appearance: 'never',
                callback(token) { window._homeSubTurnstileToken = token; },
                'expired-callback'() { window._homeSubTurnstileToken = ''; },
                'error-callback'() { window._homeSubTurnstileToken = ''; },
            });
        }
    };

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Reset feedback
        if (successEl) successEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';

        const turnstileToken = turnstileTokenInput ? turnstileTokenInput.value.trim() : '';
        if (!turnstileToken) {
            if (errorEl) {
                errorEl.textContent = 'Please complete the CAPTCHA before sending your message.';
                errorEl.style.display = 'block';
            }
            if (window.turnstile && turnstileWidgetId !== null) {
                window.turnstile.reset(turnstileWidgetId);
            }
            return;
        }

        // Loading state
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.style.cursor = 'not-allowed';
        }
        if (btnText) btnText.textContent = 'Sending...';
        if (spinner) spinner.style.display = 'block';

        try {
            const payload = {
                name: document.getElementById('cf-name').value.trim(),
                email: document.getElementById('cf-email').value.trim(),
                phone: document.getElementById('cf-phone').value.trim(),
                interest: document.getElementById('cf-interest').value || null,
                message: document.getElementById('cf-message').value.trim(),
                _honey: document.getElementById('cf-honey').value,
                attribution: window.getYjcAttribution ? window.getYjcAttribution() : null,
                'cf-turnstile-response': turnstileToken
            };
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                form.reset();
                resetTurnstile();
                if (successEl) {
                    successEl.style.display = 'block';
                    successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                const data = await res.json().catch(() => ({}));
                if (errorEl) {
                    errorEl.textContent = data.error || 'Something went wrong. Please try again in a moment or use the contact form below.';
                    errorEl.style.display = 'block';
                }
                resetTurnstile();
            }
        } catch (err) {
            if (errorEl) errorEl.style.display = 'block';
            resetTurnstile();
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
            if (btnText) btnText.textContent = 'Send Message';
            if (spinner) spinner.style.display = 'none';
        }
    });
})();

// 4. Newsletter / Lead Magnet Subscribe Form Handler
(function () {
    const subForm = document.getElementById('home-subscribe-form');
    if (!subForm) return;

    subForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const msg = document.getElementById('home-subscribe-msg');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Sending…';
        }
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'subscribe',
                    email: document.getElementById('home-sub-email').value.trim(),
                    source: 'homepage',
                    attribution: window.getYjcAttribution ? window.getYjcAttribution() : null,
                    'cf-turnstile-response': window._homeSubTurnstileToken || ''
                })
            });
            const data = await res.json();
            if (res.ok) {
                if (msg) {
                    msg.textContent = 'Check your inbox — the guide is on its way.';
                    msg.style.color = 'var(--color-accent-gold)';
                    msg.style.display = 'block';
                }
                document.getElementById('home-sub-email').value = '';
                if (btn) btn.textContent = 'Sent!';
                window._homeSubTurnstileToken = '';
                if (window.turnstile && window._homeSubTurnstileId !== undefined) window.turnstile.reset(window._homeSubTurnstileId);
            } else {
                if (msg) {
                    msg.textContent = data.error || 'Something went wrong. Please try again.';
                    msg.style.color = '#e07070';
                    msg.style.display = 'block';
                }
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Get the Guide';
                }
                window._homeSubTurnstileToken = '';
                if (window.turnstile && window._homeSubTurnstileId !== undefined) window.turnstile.reset(window._homeSubTurnstileId);
            }
        } catch {
            if (msg) {
                msg.textContent = 'Network error. Please try again.';
                msg.style.color = '#e07070';
                msg.style.display = 'block';
            }
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Get the Guide';
            }
        }
    });
})();
