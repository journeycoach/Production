(function () {
    const STORAGE_KEY = 'yjc_first_touch_attribution';
    const SESSION_KEY = 'yjc_session_attribution';
    const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

    function safeHost(value) {
        try {
            return value ? new URL(value).hostname.replace(/^www\./, '') : '';
        } catch (_) {
            return '';
        }
    }

    function normalizeSource(value) {
        const raw = String(value || '').toLowerCase();
        if (!raw) return '';
        if (raw.includes('linkedin')) return 'linkedin';
        if (raw.includes('facebook')) return 'facebook';
        if (raw.includes('instagram')) return 'instagram';
        if (raw.includes('google')) return 'google';
        if (raw.includes('bing')) return 'bing';
        if (raw.includes('youtube')) return 'youtube';
        return raw.replace(/^www\./, '');
    }

    function readStored(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || 'null');
        } catch (_) {
            return null;
        }
    }

    function writeStored(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_) {
            // Attribution should never block form submission.
        }
    }

    function currentAttribution() {
        const params = new URLSearchParams(window.location.search);
        const utm = {};
        UTM_KEYS.forEach(key => {
            const value = params.get(key);
            if (value) utm[key] = value;
        });

        const referrer = document.referrer || '';
        const referrerHost = safeHost(referrer);
        const hasUtm = Object.keys(utm).length > 0;
        const source = normalizeSource(utm.utm_source || referrerHost) || 'direct';

        return {
            source,
            medium: utm.utm_medium || '',
            campaign: utm.utm_campaign || '',
            term: utm.utm_term || '',
            content: utm.utm_content || '',
            referrer,
            referrer_host: referrerHost,
            landing_page: window.location.href,
            path: window.location.pathname,
            captured_at: new Date().toISOString(),
            attribution_type: hasUtm ? 'utm' : (referrerHost ? 'referrer' : 'direct')
        };
    }

    const current = currentAttribution();
    const firstTouch = readStored(STORAGE_KEY) || current;
    writeStored(STORAGE_KEY, firstTouch);
    writeStored(SESSION_KEY, current);

    window.getYjcAttribution = function () {
        const first = readStored(STORAGE_KEY) || firstTouch;
        const session = readStored(SESSION_KEY) || current;
        return {
            first_touch: first,
            session,
            source: session.source || first.source || 'direct',
            first_source: first.source || 'direct',
            landing_page: first.landing_page || session.landing_page || window.location.href,
            referrer: first.referrer || session.referrer || '',
            utm_source: session.source || first.source || '',
            utm_medium: session.medium || first.medium || '',
            utm_campaign: session.campaign || first.campaign || '',
            utm_term: session.term || first.term || '',
            utm_content: session.content || first.content || ''
        };
    };
})();
