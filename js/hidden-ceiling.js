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
            eyebrow: 'Question 1 of 9',
            title: 'When a high-stakes initiative suddenly goes off track, what is your first internal reaction?',
            options: [
                { title: 'Option 1', text: 'I pull back to analyze the data and find where the logic failed.' },
                { title: 'Option 2', text: 'I move quickly to take charge and get things back on track.' },
                { title: 'Option 3', text: 'My focus goes immediately to the team. I want to understand how they are being affected and what they need from me.' },
            ],
        },
        {
            id: 'q2',
            eyebrow: 'Question 2 of 9',
            title: 'Under pressure, what do others most often need more of from you?',
            options: [
                { title: 'Option 1', text: 'Move forward with less over-analysis and trust your judgment sooner.' },
                { title: 'Option 2', text: 'Be more direct about priorities instead of managing everyone\'s feelings first.' },
                { title: 'Option 3', text: 'Slow down long enough to consider how decisions are affecting people.' },
            ],
        },
        {
            id: 'q3',
            eyebrow: 'Question 3 of 9',
            title: 'In high-level leadership conversations, where do you naturally contribute most?',
            options: [
                { title: 'Option 1', text: 'Systems, long-term implications, and what risks others may be missing.' },
                { title: 'Option 2', text: 'How people will experience the decision and what it will mean relationally.' },
                { title: 'Option 3', text: 'What needs to happen next, who owns it, and how to keep momentum.' },
            ],
        },
        {
            id: 'q4',
            eyebrow: 'Question 4 of 9',
            title: 'When a peer gives you hard feedback, what is your first instinct?',
            options: [
                { title: 'Option 1', text: 'You focus on the relational context. You want to understand what is behind the feedback before you respond.' },
                { title: 'Option 2', text: 'Step back and assess whether the feedback is accurate and logically sound.' },
                { title: 'Option 3', text: 'You address it directly. If it does not hold up, you say so and explain why.' },
            ],
        },
        {
            id: 'q5',
            eyebrow: 'Question 5 of 9',
            title: 'In leadership meetings, what kind of contribution do you instinctively value most?',
            options: [
                { title: 'Option 1', text: 'Clear thinking, objectivity, and well-reasoned ideas.' },
                { title: 'Option 2', text: 'Awareness of people, tone, and how decisions affect the room.' },
                { title: 'Option 3', text: 'Directness, conviction, and the ability to move toward action.' },
            ],
        },
        {
            id: 'q6',
            eyebrow: 'Question 6 of 9',
            title: 'When faced with a dense set of details, metrics, or analysis, what is your natural response?',
            options: [
                { title: 'Option 1', text: 'I can do it, but I\'d rather focus on the people and context behind the numbers.' },
                { title: 'Option 2', text: 'I enjoy it when it helps me understand patterns, structure, and what is really going on.' },
                { title: 'Option 3', text: 'I lose patience if it slows decisions down or gets in the way of moving forward.' },
            ],
        },
        {
            id: 'q7',
            eyebrow: 'Question 7 of 9',
            title: 'A trusted colleague gives you critical feedback about your leadership style. What is your most natural first response?',
            options: [
                { title: 'Option 1', text: 'You feel it personally — you reflect on whether you have let this person or your team down, and want to make sure the relationship is okay.' },
                { title: 'Option 2', text: 'You acknowledge it, ask one clarifying question, and start thinking about what you will do differently.' },
                { title: 'Option 3', text: 'You mentally compare the feedback against other observations before deciding how much weight to give it.' },
            ],
        },
        {
            id: 'q8',
            eyebrow: 'Question 8 of 9',
            title: 'You need to make a decision that you know will disappoint someone you respect. What do you do?',
            options: [
                { title: 'Option 1', text: 'You make the call, communicate it directly, and focus on moving forward — you believe clarity is more respectful than delay.' },
                { title: 'Option 2', text: 'You invest real time preparing how to deliver the news, prioritizing the relationship even after the decision is made.' },
                { title: 'Option 3', text: 'You review your reasoning one more time before acting, wanting to be fully confident you can justify the choice.' },
            ],
        },
        {
            id: 'q9',
            eyebrow: 'Question 9 of 9',
            title: 'When the pressure is high, what most naturally guides your leadership decisions?',
            options: [
                { title: 'Option 1', text: 'Connection: staying aligned with people, meaning, and shared purpose.' },
                { title: 'Option 2', text: 'Truth: understanding what is accurate, objective, and really happening.' },
                { title: 'Option 3', text: 'Integrity in action: moving with conviction, clarity, and grounded instinct.' },
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
            title: 'You lead from the Action Center',
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
                    eyebrow: question.eyebrow || fallback.eyebrow,
                    title: question.title || fallback.title,
                    options: fallback.options.map((fallbackOption, optionIndex) => ({
                        title: fallbackOption.title || `Option ${optionIndex + 1}`,
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
            if (response.ok && data.assessment_form) applyAssessmentConfig(data.assessment_form);
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
            q7: null
        }
    };

    // --- localStorage progress save/restore ---
    const HC_STORAGE_KEY = 'hc_progress_v1';

    function saveProgress() {
        try {
            localStorage.setItem(HC_STORAGE_KEY, JSON.stringify({
                stepIndex: state.stepIndex,
                firstName: state.firstName,
                lastName:  state.lastName,
                email:     state.email,
                answers:   state.answers
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
            return saved;
        } catch (_) { return null; }
    }

    const shell = document.getElementById('hc-assessment-shell');
    if (!shell) return;

    const form = document.getElementById('hc-assessment-form');
    const stepContainer = document.getElementById('hc-step-container');
    const errorEl = document.getElementById('hc-form-error');
    const nextBtn = document.getElementById('hc-next-btn');
    const progressLabel = document.getElementById('hc-progress-label');
    const progressCaption = document.getElementById('hc-progress-caption');
    const progressBar = document.getElementById('hc-progress-bar');
    const resultCard = document.getElementById('hc-result-card');
    const instinctHint = document.getElementById('hc-instinct-hint');

    function render() {
        const step = ASSESSMENT_STEPS[state.stepIndex];
        const totalSteps = ASSESSMENT_STEPS.length;
        const progressPercent = ((state.stepIndex + 1) / totalSteps) * 100;

        progressLabel.textContent = `Step ${state.stepIndex + 1} of ${totalSteps}`;
        progressCaption.textContent = step.type === 'intro' ? 'Getting started' : 'Assessment';
        progressBar.style.width = `${progressPercent}%`;
        errorEl.textContent = '';

        const isLast = state.stepIndex === totalSteps - 1;
        nextBtn.hidden = false;
        nextBtn.textContent = isLast ? 'Get My Results' : 'Continue';

        if (instinctHint) instinctHint.style.display = step.type === 'intro' ? 'none' : '';

        if (step.type === 'intro') {
            stepContainer.innerHTML = `
                <span class="hc-step-eyebrow">${step.eyebrow}</span>
                <h3 class="hc-step-title">${step.title}</h3>
                <p class="hc-step-copy">${step.copy}</p>
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
            <span class="hc-step-eyebrow">${step.eyebrow}</span>
            <h3 class="hc-step-title">${step.title}</h3>
            <div class="hc-choice-list">
                ${step.options.map((option, index) => `
                    <label class="hc-choice ${selected === index ? 'is-selected' : ''}">
                        <input type="radio" name="${step.id}" value="${index}" ${selected === index ? 'checked' : ''}>
                        <span>${option.text}</span>
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
                    'cf-turnstile-response': window._hcAssessmentTurnstileToken || ''
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Unable to process your assessment right now.');
            }

            // Clear saved progress before redirecting
            clearProgress();

            // Store email in sessionStorage so the results page can use it for click tracking
            try { sessionStorage.setItem('hc_result_email', state.email); } catch (_) {}

            // Redirect to shareable results page
            const { result, scores, q4Center, q7Center } = data;
            const params = new URLSearchParams({
                center: result.center,
                name:   state.firstName || state.email.split('@')[0],
                sh:     scores.heart,
                sd:     scores.head,
                sa:     scores.action
            });
            if (q4Center) params.set('q4', q4Center);
            if (q7Center) params.set('q7', q7Center);
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
