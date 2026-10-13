// Consent-aware Google Analytics loader and privacy controls.
(function () {
    const GA_ID = 'G-ZM9X6CN8YK';
    const STORAGE_KEY = 'yjc_analytics_consent';
    let googleTagLoaded = false;
    let currentChoice = null;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
    };

    window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500
    });

    function readChoice() {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            return value === 'granted' || value === 'denied' ? value : null;
        } catch (_) {
            return null;
        }
    }

    function loadGoogleTag() {
        if (googleTagLoaded) return;
        googleTagLoaded = true;
        window.gtag('js', new Date());
        window.gtag('config', GA_ID, { anonymize_ip: true });

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
        document.head.appendChild(script);
    }

    function updateConsent(choice) {
        const granted = choice === 'granted';
        window.gtag('consent', 'update', {
            analytics_storage: granted ? 'granted' : 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
        if (granted) loadGoogleTag();
        window.dispatchEvent(new CustomEvent('yjc-consent-change', {
            detail: { analytics: granted }
        }));
    }

    function saveChoice(choice) {
        currentChoice = choice;
        try {
            localStorage.setItem(STORAGE_KEY, choice);
        } catch (_) {
            // Consent still applies for this page if storage is unavailable.
        }
        updateConsent(choice);
        document.getElementById('yjc-consent-banner')?.remove();
    }

    function showConsentBanner(force = false) {
        if (!force && readChoice()) return;
        document.getElementById('yjc-consent-banner')?.remove();

        const banner = document.createElement('section');
        banner.id = 'yjc-consent-banner';
        banner.className = 'consent-banner';
        banner.setAttribute('aria-label', 'Privacy choices');
        banner.innerHTML = `
            <div class="consent-banner__content">
                <div>
                    <h2>Your privacy choices</h2>
                    <p>We use optional analytics to understand how visitors use this site. You can accept or decline; the site works either way. <a href="/privacy.html">Privacy policy</a></p>
                </div>
                <div class="consent-banner__actions">
                    <button type="button" class="consent-button consent-button--secondary" data-consent="denied">Decline analytics</button>
                    <button type="button" class="consent-button consent-button--primary" data-consent="granted">Accept analytics</button>
                </div>
            </div>`;

        banner.querySelectorAll('[data-consent]').forEach(button => {
            button.addEventListener('click', () => saveChoice(button.dataset.consent));
        });
        document.body.appendChild(banner);
        if (force) banner.querySelector('[data-consent="granted"]')?.focus();
    }

    window.yjcAnalyticsAllowed = () => currentChoice === 'granted';
    window.yjcShowConsentBanner = showConsentBanner;

    const existingChoice = readChoice();
    currentChoice = existingChoice;
    if (existingChoice) updateConsent(existingChoice);

    function initConsentUi() {
        if (!existingChoice) showConsentBanner();
        document.getElementById('privacy-consent-settings')?.addEventListener('click', () => {
            showConsentBanner(true);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initConsentUi, { once: true });
    } else {
        initConsentUi();
    }
})();
