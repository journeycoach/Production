(function () {
    let ASSESSMENT_STEPS = [];
    let RESULT_PROFILES = {};
    let configLoaded = false;
    let mainQuestionCount = 0;
    let tieBreakerQuestion = null;
    const IDENTITY_TURNSTILE_SITEKEY = '0x4AAAAAACt13j1xYnpJgcv2';
    const FALLBACK_CALENDLY_URL = 'https://calendly.com/johnpaine/alignment-call';

    // Default fallback (in case API fails — only intro, shows error)
    const DEFAULT_STEPS = [
        {
            id: 'intro',
            type: 'intro',
            eyebrow: 'Start Here',
            title: 'Uncover Your Leadership Pattern',
            copy: 'Answer these questions to discover the hidden ceiling limiting your impact. Be honest about how you naturally operate under pressure.',
        }
    ];

    // State
    let currentStepIndex = 0;
    let answers = {};
    let turnstileToken = null;
    let turnstileWidgetId = null;
    let isTieBreakerActive = false;

    // DOM refs — resolved after DOMContentLoaded
    let container, stepsContainer, resultView, progressWrapper, progressBar, progressText, loadingOverlay;

    // ── Turnstile helpers ────────────────────────────────────────
    function setCaptchaMessage(message, isError = true) {
        const msgEl = document.getElementById('captcha-error');
        if (!msgEl) return;
        msgEl.textContent = message || '';
        msgEl.style.display = message ? 'block' : 'none';
        msgEl.style.color = isError ? '#ff6b6b' : 'var(--color-text-muted)';
    }

    function setTurnstileToken(token = '') {
        turnstileToken = token || null;
        const submitBtn = document.getElementById('btn-submit');
        if (submitBtn) submitBtn.disabled = false;
        if (token) setCaptchaMessage('');
    }

    function resetTurnstile() {
        setTurnstileToken('');
        if (window.turnstile && turnstileWidgetId !== null) {
            window.turnstile.reset(turnstileWidgetId);
        }
    }

    function renderIdentityTurnstile() {
        const tsContainer = document.getElementById('cf-turnstile-container');
        if (!tsContainer) return;

        if (!window.turnstile) {
            setCaptchaMessage('Security check is loading. Please try again in a moment.', false);
            return;
        }

        if (turnstileWidgetId !== null) return;

        try {
            turnstileWidgetId = window.turnstile.render(tsContainer, {
                sitekey: IDENTITY_TURNSTILE_SITEKEY,
                size: 'compact',
                theme: 'dark',
                callback(token) {
                    setTurnstileToken(token);
                },
                'expired-callback'() {
                    setTurnstileToken('');
                    setCaptchaMessage('The security check expired. Please complete it again.');
                },
                'error-callback'() {
                    setTurnstileToken('');
                    setCaptchaMessage('The security check could not load. Please refresh the page and try again.');
                },
            });
            setCaptchaMessage('');
        } catch (err) {
            console.error('Identity Ceiling: Turnstile render failed', err);
            setCaptchaMessage('The security check could not load. Please refresh the page and try again.');
        }
    }

    window.initIdentityTurnstile = renderIdentityTurnstile;

    // ── Progress persistence ──────────────────────────────────────
    function loadSavedProgress() {
        try {
            const saved = localStorage.getItem('hc_identity_progress');
            if (saved) {
                const parsed = JSON.parse(saved);
                answers = parsed.answers || {};
                if (parsed.currentStepIndex && parsed.currentStepIndex > 0) {
                    currentStepIndex = Math.min(parsed.currentStepIndex, ASSESSMENT_STEPS.length - 1);
                }
            }
        } catch (e) { /* ignore */ }
    }

    function saveProgress() {
        try {
            localStorage.setItem('hc_identity_progress', JSON.stringify({ answers, currentStepIndex }));
        } catch (e) { /* ignore */ }
    }

    function clearProgress() {
        try { localStorage.removeItem('hc_identity_progress'); } catch (e) { /* ignore */ }
    }

    function isTieBreakerQuestion(question) {
        return question && (question.id === 'tie-breaker' || question.id === 'tie_breaker');
    }

    function getTotalQuestionCount() {
        return mainQuestionCount + (isTieBreakerActive ? 1 : 0);
    }

    // ── Data Fetching ─────────────────────────────────────────────
    async function loadConfig() {
        try {
            loadingOverlay.classList.add('active');
            const res = await fetch('/api/identity-ceiling', { cache: 'no-store' });
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            const data = await res.json();

            if (data.questions && Array.isArray(data.questions)) {
                ASSESSMENT_STEPS = [DEFAULT_STEPS[0]];

                const mainQs = data.questions
                    .filter(q => !isTieBreakerQuestion(q))
                    .map((q, idx) => ({
                    ...q,
                    id: q.id || `q${idx + 1}`
                }));
                ASSESSMENT_STEPS.push(...mainQs);
                mainQuestionCount = mainQs.length;

                tieBreakerQuestion = data.questions.find(isTieBreakerQuestion) || null;
            } else {
                ASSESSMENT_STEPS = DEFAULT_STEPS;
                mainQuestionCount = 0;
                tieBreakerQuestion = null;
            }

            if (data.results) RESULT_PROFILES = data.results;

            configLoaded = true;
            loadSavedProgress();
            renderSteps();
            showStep(currentStepIndex);
        } catch (err) {
            console.error('Identity Ceiling: config load failed', err);
            ASSESSMENT_STEPS = DEFAULT_STEPS;
            renderSteps();
            showStep(0);
        } finally {
            loadingOverlay.classList.remove('active');
        }
    }

    // ── Rendering ─────────────────────────────────────────────────
    function renderSteps() {
        stepsContainer.innerHTML = '';

        ASSESSMENT_STEPS.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'step';
            stepEl.id = `step-${index}`;

            if (step.type === 'intro') {
                stepEl.innerHTML = `
                    <span class="step-eyebrow">${step.eyebrow}</span>
                    <h2 class="step-title">${step.title}</h2>
                    <p class="step-copy">${step.copy}</p>
                    <div class="lead-capture-form">
                        <div class="form-group">
                            <input type="text" id="lead-name" placeholder="First Name" required
                                   value="${answers.name || ''}">
                        </div>
                        <div class="form-group">
                            <input type="email" id="lead-email" placeholder="Email Address" required
                                   value="${answers.email || ''}">
                        </div>
                        <input type="text" id="lead-company" style="display:none" tabindex="-1" autocomplete="off">
                        <div id="intro-error" class="error-message" style="display:none;">
                            Please enter your name and a valid email address.
                        </div>
                        <div class="step-navigation" style="border-top:none;margin-top:1rem;padding-top:0;">
                            <button type="button" class="btn-next" data-action="next" data-step="${index}">
                                Begin Assessment
                            </button>
                        </div>
                    </div>`;
            } else {
                const qNum = index;
                const totalQs = getTotalQuestionCount();
                const isLastStep = (index === ASSESSMENT_STEPS.length - 1);

                if (isLastStep) {
                    turnstileToken = null;
                    turnstileWidgetId = null;
                }

                stepEl.innerHTML = `
                    <span class="step-eyebrow">Question ${qNum} of ${totalQs}</span>
                    <h2 class="step-title">${step.title}</h2>
                    <div class="options-list">
                        ${(step.options || []).map((opt, optIdx) => `
                            <label class="option-label ${answers[step.id] === optIdx ? 'selected' : ''}"
                                   data-qid="${step.id}" data-optidx="${optIdx}">
                                <input type="radio" name="${step.id}" value="${optIdx}"
                                       ${answers[step.id] === optIdx ? 'checked' : ''}>
                                <span class="option-text">${opt.text}</span>
                            </label>`).join('')}
                    </div>
                    <div id="q-error-${index}" class="error-message" style="display:none;">
                        Please select an option before continuing.
                    </div>
                    <div class="step-navigation ${isLastStep ? 'final-step-navigation' : ''}">
                        <button type="button" class="btn-prev" data-action="prev" data-step="${index}">Back</button>
                        ${isLastStep
                            ? `<div class="final-submit-wrap">
                                   <button type="button" id="btn-submit" class="btn-submit"
                                           data-action="submit">Reveal My Ceiling</button>
                               </div>
                               <div class="captcha-submit-group">
                                   <div id="cf-turnstile-container" class="identity-turnstile"></div>
                                   <div id="captcha-error" class="error-message" style="display:none;"></div>
                               </div>`
                            : `<button type="button" class="btn-next" data-action="next"
                                       data-step="${index}">Next Question</button>`}
                    </div>`;
            }

            stepsContainer.appendChild(stepEl);
        });

        // ── Event delegation: all nav buttons ──
        // Remove any existing listener before re-attaching (renderSteps may be called more than once)
        stepsContainer.removeEventListener('click', onStepsClick);
        stepsContainer.addEventListener('click', onStepsClick);

        // ── Option selection ──
        stepsContainer.querySelectorAll('.option-label').forEach(label => {
            label.addEventListener('click', function (e) {
                if (e.target.type !== 'radio') {
                    this.querySelector('input[type="radio"]').checked = true;
                }
                this.parentElement.querySelectorAll('.option-label')
                    .forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');

                answers[this.dataset.qid] = parseInt(this.dataset.optidx, 10);
                saveProgress();

                const errEl = this.closest('.step').querySelector('.error-message');
                if (errEl) errEl.style.display = 'none';
            });
        });
    }

    // Delegated click handler — no inline onclick needed
    function onStepsClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const stepIdx = parseInt(btn.dataset.step, 10);

        if (action === 'next') handleNextClick(stepIdx);
        if (action === 'prev') handlePrevClick(stepIdx);
        if (action === 'submit') handleSubmitClick();
    }

    // ── Step display ──────────────────────────────────────────────
    function showStep(index) {
        document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`step-${index}`);
        if (!target) return;

        target.classList.add('active');
        currentStepIndex = index;
        saveProgress();

        // Scroll to assessment top if user has scrolled past it
        const offsetTop = container.getBoundingClientRect().top + window.scrollY - 100;
        if (window.scrollY > offsetTop) {
            window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }

        // Progress bar
        if (index === 0) {
            progressWrapper.style.display = 'none';
        } else {
            progressWrapper.style.display = 'block';
            const totalQs = getTotalQuestionCount();
            const percent = Math.round((index / totalQs) * 100);
            progressBar.style.width = `${Math.min(percent, 100)}%`;
            progressText.textContent = `Question ${index} of ${totalQs}`;
        }

        const step = ASSESSMENT_STEPS[index];
        if (step && step.type !== 'intro' && index === ASSESSMENT_STEPS.length - 1) {
            renderIdentityTurnstile();
        }
    }

    // ── Navigation ────────────────────────────────────────────────
    function handlePrevClick(currentIndex) {
        if (currentIndex > 0) showStep(currentIndex - 1);
    }

    function handleNextClick(currentIndex) {
        const step = ASSESSMENT_STEPS[currentIndex];
        if (!step) return;

        if (step.type === 'intro') {
            const nameEl  = document.getElementById('lead-name');
            const emailEl = document.getElementById('lead-email');
            const errEl   = document.getElementById('intro-error');
            const name    = nameEl ? nameEl.value.trim() : '';
            const email   = emailEl ? emailEl.value.trim() : '';
            const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            if (!name || !emailOk) {
                if (errEl) errEl.style.display = 'block';
                return;
            }

            answers.name    = name;
            answers.email   = email;
            answers.company = (document.getElementById('lead-company') || {}).value || '';
            if (errEl) errEl.style.display = 'none';
        } else {
            if (answers[step.id] === undefined) {
                const errEl = document.getElementById(`q-error-${currentIndex}`);
                if (errEl) errEl.style.display = 'block';
                return;
            }
        }

        if (currentIndex === mainQuestionCount && showTieBreakerIfNeeded()) return;

        showStep(currentIndex + 1);
    }

    function showTieBreakerIfNeeded() {
        if (isTieBreakerActive || !tieBreakerQuestion) return false;

        const tiedCeilings = getTiedCeilings();
        if (tiedCeilings.length <= 1) return false;

        const filteredTieBreaker = {
            ...tieBreakerQuestion,
            id: 'tie_breaker',
            options: (tieBreakerQuestion.options || [])
                .filter(option => tiedCeilings.includes(option.ceiling)),
        };
        isTieBreakerActive = true;
        ASSESSMENT_STEPS.push(filteredTieBreaker);
        renderSteps();
        showStep(mainQuestionCount + 1);
        return true;
    }

    function getTiedCeilings() {
        const tallies = {};
        for (let i = 1; i <= mainQuestionCount; i++) {
            const step = ASSESSMENT_STEPS[i];
            if (!step) continue;
            const selectedIdx = answers[step.id];
            if (selectedIdx === undefined) continue;
            const ceilingKey = (step.options[selectedIdx] || {}).ceiling;
            if (ceilingKey) tallies[ceilingKey] = (tallies[ceilingKey] || 0) + 1;
        }

        const counts = Object.values(tallies);
        if (!counts.length) return [];

        const maxCount = Math.max(...counts);
        return Object.entries(tallies)
            .filter(([, count]) => count === maxCount)
            .map(([ceiling]) => ceiling);
    }

    // ── Submission ────────────────────────────────────────────────
    function getUtmParams() {
        const p = new URLSearchParams(window.location.search);
        return {
            source:   p.get('utm_source'),
            medium:   p.get('utm_medium'),
            campaign: p.get('utm_campaign'),
            term:     p.get('utm_term'),
            content:  p.get('utm_content'),
        };
    }

    async function handleSubmitClick() {
        const lastStepIdx = ASSESSMENT_STEPS.length - 1;
        const lastStep = ASSESSMENT_STEPS[lastStepIdx];

        if (!lastStep || answers[lastStep.id] === undefined) {
            const errEl = document.getElementById(`q-error-${lastStepIdx}`);
            if (errEl) errEl.style.display = 'block';
            return;
        }

        if (lastStepIdx === mainQuestionCount && showTieBreakerIfNeeded()) return;

        if (!turnstileToken) {
            renderIdentityTurnstile();
            setCaptchaMessage('Please complete the security check before revealing your result.');
            return;
        }

        loadingOverlay.classList.add('active');

        try {
            // Build question-only answers (exclude name/email/company)
            const qAnswers = {};
            for (const key of Object.keys(answers)) {
                if (key.startsWith('q') || key === 'tie_breaker') qAnswers[key] = answers[key];
            }
            if (answers.tie_breaker !== undefined) {
                const selectedTieBreaker = ASSESSMENT_STEPS[lastStepIdx]?.options?.[answers.tie_breaker];
                if (selectedTieBreaker?.ceiling) qAnswers.tie_breaker_ceiling = selectedTieBreaker.ceiling;
            }

            const response = await fetch('/api/identity-ceiling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name:                    answers.name,
                    email:                   answers.email,
                    company:                 answers.company,
                    answers:                 qAnswers,
                    'cf-turnstile-response': turnstileToken,
                    attribution: {
                        ...getUtmParams(),
                        landing_page: window.location.pathname,
                        referrer:     document.referrer,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'There was a problem submitting. Please try again.');
                resetTurnstile();
                const btn = document.getElementById('btn-submit');
                if (btn) btn.disabled = false;
                loadingOverlay.classList.remove('active');
                return;
            }

            clearProgress();
            renderResult(data.center, data.result);
        } catch (err) {
            console.error('Submit error:', err);
            alert('A network error occurred. Please try again.');
            resetTurnstile();
            loadingOverlay.classList.remove('active');
        }
    }

    // ── Result Rendering ──────────────────────────────────────────
    function renderResult(ceilingKey, profile) {
        stepsContainer.style.display = 'none';
        progressWrapper.style.display = 'none';

        if (!profile || !profile.diagnosis) {
            alert('There was a problem loading your result. Please try again.');
            loadingOverlay.classList.remove('active');
            return;
        }

        document.getElementById('res-title').textContent =
            profile.label || `The ${capitalize(ceilingKey)} Ceiling`;
        document.getElementById('res-diagnosis').textContent = profile.diagnosis;
        document.getElementById('res-ceiling').textContent   = profile.ceiling;

        const patternEl = document.getElementById('res-pattern');
        const costEl    = document.getElementById('res-cost');
        const shiftEl   = document.getElementById('res-shift');
        if (patternEl) patternEl.textContent = profile.pattern ? `"${profile.pattern}"` : '';
        if (costEl)    costEl.textContent    = profile.cost  || '';
        if (shiftEl)   shiftEl.textContent   = profile.shift || '';

        const guideList = document.getElementById('res-guide');
        guideList.innerHTML = '';
        (Array.isArray(profile.steps) ? profile.steps : []).forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            guideList.appendChild(li);
        });

        document.getElementById('res-cta-text').textContent =
            profile.cta_text || 'Schedule an Alignment Call';
        document.getElementById('res-cta-url').href =
            profile.cta_url || FALLBACK_CALENDLY_URL;

        resultView.classList.add('active');
        loadingOverlay.classList.remove('active');

        const offsetTop = container.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }

    function capitalize(str) {
        return String(str).charAt(0).toUpperCase() + String(str).slice(1);
    }

    // ── Init ──────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        container       = document.getElementById('assessment-container');
        stepsContainer  = document.getElementById('steps-container');
        resultView      = document.getElementById('result-view');
        progressWrapper = document.getElementById('progress-wrapper');
        progressBar     = document.getElementById('progress-bar');
        progressText    = document.getElementById('progress-text');
        loadingOverlay  = document.getElementById('loading-overlay');

        loadConfig();
    });

})();
