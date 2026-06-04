(function () {
    let ASSESSMENT_STEPS = [
        {
            id: 'intro',
            type: 'intro',
            eyebrow: 'Start Here',
            title: 'Tell me where to send your guide',
            copy: 'You will see your result immediately on the page, and I will also email the matching Hidden Ceiling guide so you can revisit it later.',
        },
        {
            id: 'q1',
            title: 'When a high-stakes initiative suddenly goes off track, what is your first internal reaction?',
            options: [
                { text: 'You pull back to analyze the data and find where the logic failed.' },
                { text: 'You move quickly to take charge and get things back on track.' },
                { text: 'Your focus goes immediately to the team — you want to understand how they are being affected and what they need from you.' },
            ],
        },
        {
            id: 'q2',
            title: 'Under pressure, what do others most often tell you that you need to do differently?',
            options: [
                { text: 'You need to move forward with less over-analysis and trust your judgment sooner.' },
                { text: 'You need to be more direct about priorities instead of managing everyone\'s feelings first.' },
                { text: 'You need to slow down long enough to consider how decisions are affecting people.' },
            ],
        },
        {
            id: 'q3',
            title: 'In high-level leadership conversations, where do you naturally contribute most?',
            options: [
                { text: 'You track how people will experience the decision and what it will mean relationally.' },
                { text: 'You name the system-level risks, the long-term implications, and what others may be missing.' },
                { text: 'You focus on what needs to happen next, who owns it, and how to keep things moving.' },
            ],
        },
        {
            id: 'q4',
            title: 'Two high-performing members of your team are in a sustained conflict that is starting to affect results. What is your first move?',
            options: [
                { text: 'You address it directly and promptly with both of them — you are clear about expectations and focus on what needs to change in the work dynamic.' },
                { text: 'You analyze what is underneath the conflict — whether it is structural, a clarity gap, or a deeper incompatibility — before deciding how to intervene.' },
                { text: 'You sit down with each person individually first — you want to understand what each one is experiencing before you address it as a group.' },
            ],
        },
        {
            id: 'q5',
            title: 'In leadership meetings, what kind of contribution do you instinctively value most?',
            options: [
                { text: 'You value awareness of people, tone, and how decisions affect the room.' },
                { text: 'You value directness, conviction, and the ability to move things forward.' },
                { text: 'You value clear thinking, objectivity, and well-reasoned ideas.' },
            ],
        },
        {
            id: 'q6',
            title: 'When faced with a dense set of details, metrics, or analysis, what is your natural response?',
            options: [
                { text: 'You lose patience when it slows decisions down or gets in the way of moving forward.' },
                { text: 'You enjoy it when it helps you understand patterns, structure, and what is really going on.' },
                { text: 'You can do it, but you would rather focus on the people and context behind the numbers.' },
            ],
        },
        {
            id: 'q7',
            title: 'A trusted colleague gives you critical feedback about your leadership style. What is your most natural first response?',
            options: [
                { text: 'You feel it personally — you reflect on whether you have let this person or your team down, and want to make sure the relationship is okay.' },
                { text: 'You acknowledge it, ask one clarifying question, and start thinking about what you will do differently.' },
                { text: 'You mentally compare the feedback against other observations before deciding how much weight to give it.' },
            ],
        },
        {
            id: 'q8',
            title: 'You need to make a decision that you know will disappoint someone you respect. What do you do?',
            options: [
                { text: 'You make the call, communicate it directly, and focus on moving forward — you believe clarity is more respectful than delay.' },
                { text: 'You invest real time preparing how to deliver the news, prioritizing the relationship even after the decision is made.' },
                { text: 'You review your reasoning one more time before acting, wanting to be fully confident you can justify the choice.' },
            ],
        },
        {
            id: 'q9',
            title: 'When the pressure is high, what most naturally guides your leadership decisions?',
            options: [
                { text: 'You return to truth — understanding what is accurate, objective, and really happening.' },
                { text: 'You return to connection — staying aligned with people, meaning, and shared purpose.' },
                { text: 'You return to action — moving with conviction, clarity, and grounded instinct.' },
            ],
        }
    ];

    const RESULT_META = {
        heart: {
            centerLabel: 'Heart Center',
            title: 'You lead like a Connection-Oriented Leader',
            summary: 'Your responses point to a leadership pattern that instinctively tracks people, morale, and the emotional temperature of the room.',
            description: 'You are often the person who can sense the undercurrent nobody else is naming. That makes you a stabilizing presence in culture, trust, and relationship repair.',
            blindspot: 'Under pressure, that same strength can turn into over-identifying with how others are feeling, over-functioning relationally, or softening hard decisions until the moment has passed.',
            nextSteps: [
                'Notice where harmony is becoming more important than clarity.',
                'Name the decision before you manage everyone\'s reaction to it.',
                'Use the guide to spot the situations where connection quietly turns into self-protection.'
            ],
            guideUrl: '/assets/downloads/hidden_ceiling_connection_oriented_leader.pdf',
            guideLabel: 'Hidden Ceiling Guide for the Connection-Oriented Leader'
        },
        head: {
            centerLabel: 'Head Center',
            title: 'You lead like a Thinking-Oriented Leader',
            summary: 'Your responses point to a leadership pattern that instinctively searches for clarity, logic, and the cleanest explanation of what is happening.',
            description: 'You likely bring rigor, objectivity, and strong pattern recognition to complex systems. People rely on you to see risk, ask the smart question, and think around corners.',
            blindspot: 'Under pressure, that strength can become over-analysis, emotional distance, or a subtle dependence on certainty before moving. The room can feel managed by logic but not fully led through tension.',
            nextSteps: [
                'Watch for the moment information-gathering becomes a delay tactic.',
                'Pair your analysis with a visible relational read on the team.',
                'Use the guide to identify where objectivity is protecting you from discomfort rather than serving the decision.'
            ],
            guideUrl: '/assets/downloads/hidden_ceiling_thinking_oriented_leader.pdf',
            guideLabel: 'Hidden Ceiling Guide for the Thinking-Oriented Leader'
        },
        action: {
            centerLabel: 'Action Center',
            title: 'You lead like an Action-Oriented Leader',
            summary: 'Your responses point to a leadership pattern that instinctively values movement, decisiveness, and the ability to convert energy into results.',
            description: 'You likely create traction quickly. People experience you as someone who can cut through noise, set direction, and keep a team from stalling out in uncertainty.',
            blindspot: 'Under pressure, that strength can harden into impatience, over-control, or the urge to move faster than the system around you can metabolize. Speed starts solving anxiety instead of solving the right problem.',
            nextSteps: [
                'Notice where urgency is outrunning reflection or buy-in.',
                'Slow down long enough to separate momentum from reactivity.',
                'Use the guide to spot where force and clarity are getting conflated inside your leadership.'
            ],
            guideUrl: '/assets/downloads/hidden_ceiling_action_oriented_leader.pdf',
            guideLabel: 'Hidden Ceiling Guide for the Action-Oriented Leader'
        },
        head_heart: {
            centerLabel: 'Head + Heart Blend',
            title: 'You lead like a Thinking-Connection Blended Leader',
            summary: 'Your responses point to a leadership pattern that moves between careful understanding and relational attunement.',
            description: 'You likely notice both the logic of a situation and the way people are experiencing it. That blend can help you see risks, patterns, trust dynamics, and alignment needs at the same time.',
            blindspot: 'Under pressure, this blend can become a loop between analyzing what is true and managing how people will feel. The ceiling appears when clarity and connection both matter, but neither fully moves into action.',
            nextSteps: [
                'Notice when gathering more perspective is becoming a way to delay the next move.',
                'Name both the truth of the situation and the relational impact it is creating.',
                'Use the guide to see where thinking and connection can work together without slowing your leadership.'
            ],
            guideUrl: '/assets/downloads/hidden_ceiling_blended_head_heart_leader.pdf',
            guideLabel: 'Hidden Ceiling Guide for the Blended Head-Heart Leader'
        },
        head_action: {
            centerLabel: 'Head + Action Blend',
            title: 'You lead like a Thinking-Action Blended Leader',
            summary: 'Your responses point to a leadership pattern that moves between careful analysis and decisive forward motion.',
            description: 'You likely see structure, risk, and next steps quickly. That blend can help you make sense of complexity while still moving people and work toward practical outcomes.',
            blindspot: 'Under pressure, this blend can become a cycle of tightening control: think harder, move faster, and leave less room for the human signals that would help the decision land.',
            nextSteps: [
                'Notice when the need for certainty is pairing with urgency.',
                'Separate the next responsible action from the impulse to force resolution.',
                'Use the guide to see where clear thinking and decisive movement can serve the system without overrunning it.'
            ],
            guideUrl: '/assets/downloads/hidden_ceiling_blended_head_action_leader.pdf',
            guideLabel: 'Hidden Ceiling Guide for the Blended Head-Action Leader'
        },
        heart_action: {
            centerLabel: 'Heart + Action Blend',
            title: 'You lead like a Connection-Action Blended Leader',
            summary: 'Your responses point to a leadership pattern that moves between relational awareness and decisive forward motion.',
            description: 'You likely sense how decisions affect people while also wanting movement, clarity, and practical traction. That blend can help teams feel both cared for and mobilized.',
            blindspot: 'Under pressure, this blend can become a push-pull between keeping people with you and getting things moving. The ceiling appears when urgency and relational responsibility start competing instead of collaborating.',
            nextSteps: [
                'Notice when momentum is trying to outrun trust.',
                'Name the relational impact and the next action in the same conversation.',
                'Use the guide to see where connection and action can reinforce each other instead of pulling your leadership in two directions.'
            ],
            guideUrl: '/assets/downloads/hidden_ceiling_blended_heart_action_leader.pdf',
            guideLabel: 'Hidden Ceiling Guide for the Blended Heart-Action Leader'
        }
    };

    function applyAssessmentConfig(config) {
        if (!config || typeof config !== 'object') return;
        const fallbackIntro = ASSESSMENT_STEPS.find(step => step.type === 'intro') || {};
        const fallbackQuestions = ASSESSMENT_STEPS.filter(step => step.type !== 'intro');
        const questions = Array.isArray(config.questions) ? config.questions : [];

        ASSESSMENT_STEPS = [
            {
                id: 'intro',
                type: 'intro',
                eyebrow: config.intro?.eyebrow || fallbackIntro.eyebrow,
                title: config.intro?.title || fallbackIntro.title,
                copy: config.intro?.copy || fallbackIntro.copy,
            },
            ...fallbackQuestions.map((fallback, index) => {
                const question = questions[index] || {};
                const options = Array.isArray(question.options) ? question.options : [];
                return {
                    id: fallback.id,
                    title: question.title || fallback.title,
                    options: fallback.options.map((fallbackOption, optionIndex) => ({
                        text: options[optionIndex]?.text || fallbackOption.text,
                    })),
                };
            })
        ];
    }

    async function loadAssessmentConfig() {
        try {
            const response = await fetch('/api/contact?action=config');
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                if (data.assessment_form) applyAssessmentConfig(data.assessment_form);
                if (data.result_meta) Object.assign(RESULT_META, data.result_meta);
            }
        } catch (_) {}
    }

    const state = {
        stepIndex: 0,
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        answers: {
            q1: null,
            q2: null,
            q3: null,
            q4: null,
            q5: null,
            q6: null,
            q7: null,
            q8: null,
            q9: null
        }
    };

    // --- localStorage progress save/restore ---
    const HC_STORAGE_KEY = 'hc_progress_v2';

    function getConfigSignature(steps) {
        return steps
            .filter(s => s.type !== 'intro')
            .map(s => s.id + ':' + s.options.map(o => o.text).join('|'))
            .join(';');
    }

    function saveProgress() {
        try {
            localStorage.setItem(HC_STORAGE_KEY, JSON.stringify({
                stepIndex: state.stepIndex,
                firstName: state.firstName,
                lastName:  state.lastName,
                email:     state.email,
                answers:   state.answers,
                configSig: getConfigSignature(ASSESSMENT_STEPS)
            }));
        } catch (_) {}
    }

    function clearProgress() {
        try { localStorage.removeItem(HC_STORAGE_KEY); } catch (_) {}
    }

    function loadSavedProgress() {
        try {
            const raw = localStorage.getItem(HC_STORAGE_KEY);
            if (!raw) return null;
            const saved = JSON.parse(raw);
            if (!saved || saved.stepIndex == null) return null;
            if (saved.configSig !== getConfigSignature(ASSESSMENT_STEPS)) {
                localStorage.removeItem(HC_STORAGE_KEY);
                return null;
            }
            return saved;
        } catch (_) { return null; }
    }

    const shell = document.getElementById('hc-assessment-shell');
    if (!shell) return;

    const form = document.getElementById('hc-assessment-form');
    const stepContainer = document.getElementById('hc-step-container');
    const errorEl = document.getElementById('hc-form-error');
    const nextBtn = document.getElementById('hc-next-btn');
    const actionsDiv = document.getElementById('hc-actions');
    const progressLabel = document.getElementById('hc-progress-label');
    const progressCaption = document.getElementById('hc-progress-caption');
    const progressBar = document.getElementById('hc-progress-bar');
    const resultCard = document.getElementById('hc-result-card');
    const instinctHint = document.getElementById('hc-instinct-hint');

    function render() {
        const step = ASSESSMENT_STEPS[state.stepIndex];
        const totalSteps = ASSESSMENT_STEPS.length;
        const questionCount = totalSteps - 1; // intro step doesn't count

        let progressPercent = 0;
        if (step.type === 'intro') {
            progressPercent = 5;
            progressLabel.textContent = 'Getting started';
            progressCaption.textContent = '';
        } else {
            progressPercent = 10 + Math.round(((state.stepIndex - 1) / (questionCount - 1)) * 80);
            progressLabel.textContent = `Question ${state.stepIndex} of ${questionCount}`;
            progressCaption.textContent = 'Assessment';
        }
        progressBar.style.width = `${progressPercent}%`;
        errorEl.textContent = '';

        const isLast = state.stepIndex === totalSteps - 1;
        nextBtn.hidden = false;
        nextBtn.textContent = isLast ? 'Get My Results' : 'Continue';


        if (instinctHint) instinctHint.style.display = step.type === 'intro' ? 'none' : '';

        if (step.type === 'intro') {
            stepContainer.innerHTML = `
                <span class="hc-step-eyebrow">${escapeAttr(step.eyebrow)}</span>
                <h3 class="hc-step-title">${escapeAttr(step.title)}</h3>
                <p class="hc-step-copy">${escapeAttr(step.copy)}</p>
                <div class="hc-field-grid">
                    <div class="hc-field">
                        <label for="hc-firstName">First Name</label>
                        <input class="hc-input" id="hc-firstName" type="text" value="${escapeAttr(state.firstName)}" autocomplete="given-name" placeholder="First">
                    </div>
                    <div class="hc-field">
                        <label for="hc-lastName">Last Name</label>
                        <input class="hc-input" id="hc-lastName" type="text" value="${escapeAttr(state.lastName)}" autocomplete="family-name" placeholder="Last">
                    </div>
                    <div class="hc-field" style="grid-column: 1 / -1;">
                        <label for="hc-email">Email</label>
                        <input class="hc-input" id="hc-email" type="email" value="${escapeAttr(state.email)}" autocomplete="email" placeholder="you@example.com">
                    </div>
                </div>
            `;
            // Save intro fields on input so progress restores them
            ['hc-firstName','hc-lastName','hc-email'].forEach(id => {
                document.getElementById(id)?.addEventListener('input', (e) => {
                    if (id === 'hc-firstName') state.firstName = e.target.value;
                    else if (id === 'hc-lastName') state.lastName = e.target.value;
                    else state.email = e.target.value;
                    saveProgress();
                });
            });
            document.getElementById('hc-firstName')?.focus();
            return;
        }

        const selected = state.answers[step.id];
        stepContainer.innerHTML = `
            <h3 class="hc-step-title">${escapeAttr(step.title)}</h3>
            <div class="hc-choice-list">
                ${step.options.map((option, index) => `
                    <label class="hc-choice ${selected === index ? 'is-selected' : ''}">
                        <input type="radio" name="${step.id}" value="${index}" ${selected === index ? 'checked' : ''}>
                        <span>${escapeAttr(option.text)}</span>
                    </label>
                `).join('')}
            </div>
        `;

        stepContainer.querySelectorAll(`input[name="${step.id}"]`).forEach((input) => {
            input.addEventListener('change', () => {
                state.answers[step.id] = Number(input.value);
                saveProgress();
                render();
            });
        });
    }

    function validateCurrentStep() {
        const step = ASSESSMENT_STEPS[state.stepIndex];
        errorEl.textContent = '';

        if (step.type === 'intro') {
            const firstNameInput = document.getElementById('hc-firstName');
            const lastNameInput = document.getElementById('hc-lastName');
            const emailInput = document.getElementById('hc-email');
            const companyInput = document.getElementById('hc-company');
            state.firstName = firstNameInput.value.trim();
            state.lastName = lastNameInput.value.trim();
            state.email = emailInput.value.trim();
            state.company = companyInput?.value?.trim() || '';

            if (state.company) return false;
            if (!state.firstName || !state.lastName) {
                errorEl.textContent = 'Please enter your first and last name.';
                if (!state.firstName) firstNameInput.focus();
                else lastNameInput.focus();
                return false;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
                errorEl.textContent = 'Please enter a valid email address.';
                emailInput.focus();
                return false;
            }
            return true;
        }

        if (state.answers[step.id] === null || state.answers[step.id] === undefined) {
            errorEl.textContent = 'Choose the response that feels most true before continuing.';
            return false;
        }
        return true;
    }

    async function submitAssessment() {
        if (!validateCurrentStep()) return;

        // Guard: every question must have a non-null answer before we submit.
        // The step-by-step flow normally ensures this, but a localStorage-restored
        // session could theoretically carry null values from a prior partial save.
        const unansweredIds = Object.entries(state.answers)
            .filter(([, v]) => v === null || v === undefined)
            .map(([k]) => k);
        if (unansweredIds.length > 0) {
            errorEl.textContent = 'Please answer every question before submitting.';
            return;
        }

        // Fix #1: Check for expired Turnstile token before we disable the button
        // and show the loading state. If expired, reset the widget and prompt user.
        const turnstileToken = window._hcAssessmentTurnstileToken || '';
        if (!turnstileToken) {
            if (window.turnstile) {
                window.turnstile.reset(document.getElementById('hc-assessment-turnstile'));
            }
            errorEl.textContent = 'The security check expired — please complete it above and try again.';
            return;
        }

        nextBtn.disabled = true;
        stepContainer.innerHTML = `
            <div style="text-align:center;padding:2.5rem 1rem;">
                <div style="width:36px;height:36px;border:3px solid rgba(201,169,110,0.2);border-top-color:var(--color-accent-gold);border-radius:50%;animation:hc-spin 0.7s linear infinite;margin:0 auto 1.25rem;"></div>
                <p style="color:var(--color-text-muted);font-size:0.9rem;margin:0;">Scoring your results…</p>
            </div>`;

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'hidden_ceiling',
                    name: `${state.firstName} ${state.lastName}`.trim(),
                    email: state.email,
                    company: state.company,
                    source: new URLSearchParams(window.location.search).get('source') || 'hidden-ceiling',
                    attribution: window.getYjcAttribution ? window.getYjcAttribution() : null,
                    answers: state.answers,
                    'cf-turnstile-response': turnstileToken
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Unable to process your assessment right now.');
            }

            // Clear saved progress before redirecting
            clearProgress();

            // Store email and Calendly URL in sessionStorage.
            // The Calendly URL is gated here — only set after a real captcha-
            // verified assessment submission so the public config endpoint
            // doesn't have to expose it.
            try {
                sessionStorage.setItem('hc_result_email', state.email);
                if (data.calendly_url) sessionStorage.setItem('hc_calendly_url', data.calendly_url);
            } catch (_) {}

            // Redirect to shareable results page
            const { result, scores, resultToken, emailSent } = data;
            const params = new URLSearchParams({
                center: result.center,
                name:   state.firstName || state.email.split('@')[0],
                sh:     scores.heart,
                sd:     scores.head,
                sa:     scores.action
            });
            if (resultToken) params.set('tok', resultToken);
            if (emailSent)   params.set('em', '1');
            window.location.href = `/results.html?${params.toString()}`;

        } catch (error) {
            errorEl.textContent = error.message || 'Something went wrong while submitting your assessment.';
            nextBtn.disabled = false;
            render();
        }
    }

    function showResult(data) {
        const { result, scores, emailSent, calendly_url, result_content } = data;
        const defaults = RESULT_META[result.center];
        if (!defaults) return;

        // Merge DB overrides over hardcoded defaults — any blank field falls back to the default
        const rc = result_content || {};
        const meta = {
            centerLabel: rc.centerLabel || defaults.centerLabel,
            title:       rc.title       || defaults.title,
            summary:     rc.summary     || defaults.summary,
            description: rc.description || defaults.description,
            blindspot:   rc.blindspot   || defaults.blindspot,
            nextSteps:   (rc.nextSteps && rc.nextSteps.length) ? rc.nextSteps : defaults.nextSteps,
        };

        const elCenter      = document.getElementById('hc-result-center');
        const elTitle       = document.getElementById('hc-result-title');
        const elSummary     = document.getElementById('hc-result-summary');
        const elDescription = document.getElementById('hc-result-description');
        const elBlindspot   = document.getElementById('hc-result-blindspot');
        const actionsList   = document.getElementById('hc-result-actions');
        const elScoreGrid   = document.getElementById('hc-score-grid');

        if (elCenter)      elCenter.textContent = meta.centerLabel;
        if (elTitle)       elTitle.textContent = meta.title;
        if (elSummary)     elSummary.textContent = emailSent
            ? `${meta.summary} Your personalized guide is already on its way to ${state.email}.`
            : `${meta.summary} I could not send the email automatically, so your guide is available below right away.`;
        if (elDescription) elDescription.textContent = meta.description;
        if (elBlindspot)   elBlindspot.textContent = meta.blindspot;

        if (actionsList) actionsList.innerHTML = meta.nextSteps.map((item) => `<li>${escapeAttr(item)}</li>`).join('');

        if (elScoreGrid) elScoreGrid.innerHTML = [
            { label: 'Heart', value: scores.heart },
            { label: 'Head',  value: scores.head },
            { label: 'Action', value: scores.action }
        ].map((score) => `
            <div class="hc-score-card">
                <strong>${score.label} score</strong>
                <span>${parseInt(score.value, 10)}</span>
            </div>
        `).join('');

        const elGuidePanel = document.getElementById('hc-guide-panel');
        const elGuideLabel = document.getElementById('hc-result-guide-label');
        const elGuideBtn   = document.getElementById('hc-result-guide-btn');
        if (elGuidePanel && elGuideLabel && elGuideBtn) {
            elGuideLabel.textContent = meta.guideLabel || defaults.guideLabel;
            elGuideBtn.href = meta.guideUrl || defaults.guideUrl;
            elGuidePanel.style.display = 'flex';
        }

        if (calendly_url) {
            const btn = document.getElementById('hc-calendly-btn');
            if (btn) { 
                btn.href = calendly_url; 
                btn.style.display = ''; 
                btn.onclick = () => {
                    if (state.email) {
                        fetch('/api/contact', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'track_click', email: state.email })
                        }).catch(() => {});
                    }
                };
            }
        }

        form.hidden = true;
        resultCard.classList.add('is-visible');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    nextBtn.addEventListener('click', async () => {
        if (!validateCurrentStep()) return;
        if (state.stepIndex < ASSESSMENT_STEPS.length - 1) {
            state.stepIndex += 1;
            saveProgress();
            render();
        } else {
            await submitAssessment();
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await submitAssessment();
    });

    async function initializeAssessment() {
        await loadAssessmentConfig();

        const urlParams = new URLSearchParams(window.location.search);
        const previewCenter = urlParams.get('preview');
        if (previewCenter && RESULT_META[previewCenter]) {
            form.hidden = true;
            resultCard.classList.add('is-visible');
            
            // Show loading state in the button
            const btn = document.getElementById('hc-calendly-btn');
            if (btn) btn.style.display = 'none';

            fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'hidden_ceiling', preview: previewCenter })
            })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    showResult(data);
                }
            })
            .catch(err => console.error('Preview load failed:', err));
        } else {
            // Check for saved progress — offer to restore if past the intro step
            const saved = loadSavedProgress();
            if (saved && saved.stepIndex > 0) {
                stepContainer.innerHTML = `
                    <div style="text-align:center;padding:2rem 1rem;">
                        <p style="font-size:1.05rem;color:var(--color-text-primary);margin:0 0 0.5rem;font-weight:600;">Continue where you left off?</p>
                        <p style="font-size:0.9rem;color:var(--color-text-secondary);margin:0 0 1.5rem;">You started the assessment earlier. Your answers have been saved.</p>
                        <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
                            <button id="hc-restore-yes" class="hc-btn hc-btn-primary">Continue Assessment</button>
                            <button id="hc-restore-no" class="hc-btn hc-btn-secondary" style="background:transparent;border:1px solid rgba(255,255,255,0.15);color:var(--color-text-secondary);">Start Over</button>
                        </div>
                    </div>`;
                nextBtn.hidden = true;
                document.getElementById('hc-restore-yes').addEventListener('click', () => {
                    Object.assign(state, {
                        stepIndex: saved.stepIndex,
                        firstName: saved.firstName || '',
                        lastName:  saved.lastName  || '',
                        email:     saved.email     || '',
                        answers:   { ...state.answers, ...saved.answers }
                    });
                    nextBtn.hidden = false;
                    render();
                });
                document.getElementById('hc-restore-no').addEventListener('click', () => {
                    clearProgress();
                    nextBtn.hidden = false;
                    render();
                });
            } else {
                render();
            }
        }
    }

    initializeAssessment();

    function escapeAttr(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
})();
